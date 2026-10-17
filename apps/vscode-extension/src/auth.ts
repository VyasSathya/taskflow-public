import * as vscode from 'vscode';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const SECRET_KEY_ACCESS_TOKEN = 'vibetasks.accessToken';
const SECRET_KEY_REFRESH_TOKEN = 'vibetasks.refreshToken';

/**
 * AuthManager handles authentication for the VS Code extension
 * Uses VS Code's SecretStorage API for secure token storage
 */
export class AuthManager {
  private context: vscode.ExtensionContext;
  private supabase: SupabaseClient | null = null;
  private cachedUser: User | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Get Supabase client configuration from settings
   */
  private getSupabaseConfig(): { url: string; key: string } {
    const config = vscode.workspace.getConfiguration('vibetasks');
    return {
      url: config.get<string>('supabaseUrl') || (process.env.SUPABASE_URL || ''),
      key: config.get<string>('supabaseAnonKey') || (process.env.SUPABASE_ANON_KEY || ''),
    };
  }

  /**
   * Get or create Supabase client
   */
  private async getSupabase(): Promise<SupabaseClient> {
    if (this.supabase) {
      return this.supabase;
    }

    const { url, key } = this.getSupabaseConfig();
    
    // Check for stored tokens
    const accessToken = await this.context.secrets.get(SECRET_KEY_ACCESS_TOKEN);
    const refreshToken = await this.context.secrets.get(SECRET_KEY_REFRESH_TOKEN);

    this.supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Set session if we have tokens
    if (accessToken && refreshToken) {
      try {
        const { data, error } = await this.supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          // Try to refresh the token
          const refreshResult = await this.supabase.auth.refreshSession({
            refresh_token: refreshToken,
          });

          if (refreshResult.data.session) {
            await this.storeTokens(
              refreshResult.data.session.access_token,
              refreshResult.data.session.refresh_token
            );
            this.cachedUser = refreshResult.data.user;
          } else {
            // Clear invalid tokens
            await this.clearTokens();
          }
        } else if (data.user) {
          this.cachedUser = data.user;
        }
      } catch (error) {
        console.error('Error setting session:', error);
        await this.clearTokens();
      }
    }

    return this.supabase;
  }

  /**
   * Get authenticated Supabase client (with valid access token)
   */
  async getAuthenticatedClient(): Promise<SupabaseClient> {
    const client = await this.getSupabase();
    
    // Check if we need to refresh
    const accessToken = await this.context.secrets.get(SECRET_KEY_ACCESS_TOKEN);
    if (accessToken && this.isTokenExpired(accessToken)) {
      await this.refreshSession();
    }

    return client;
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const expiresAt = payload.exp * 1000;
      const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
      return Date.now() > (expiresAt - bufferMs);
    } catch {
      return true;
    }
  }

  /**
   * Refresh the session using refresh token
   */
  private async refreshSession(): Promise<boolean> {
    const refreshToken = await this.context.secrets.get(SECRET_KEY_REFRESH_TOKEN);
    if (!refreshToken) {
      return false;
    }

    try {
      const client = await this.getSupabase();
      const { data, error } = await client.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        await this.clearTokens();
        return false;
      }

      await this.storeTokens(
        data.session.access_token,
        data.session.refresh_token
      );
      this.cachedUser = data.user;
      return true;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      await this.clearTokens();
      return false;
    }
  }

  /**
   * Store tokens securely
   */
  private async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.context.secrets.store(SECRET_KEY_ACCESS_TOKEN, accessToken);
    await this.context.secrets.store(SECRET_KEY_REFRESH_TOKEN, refreshToken);
  }

  /**
   * Clear stored tokens
   */
  private async clearTokens(): Promise<void> {
    await this.context.secrets.delete(SECRET_KEY_ACCESS_TOKEN);
    await this.context.secrets.delete(SECRET_KEY_REFRESH_TOKEN);
    this.cachedUser = null;
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<User> {
    const client = await this.getSupabase();

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session || !data.user) {
      throw new Error('Login failed: No session returned');
    }

    await this.storeTokens(
      data.session.access_token,
      data.session.refresh_token
    );

    this.cachedUser = data.user;
    return data.user;
  }

  /**
   * Logout - clear tokens and sign out
   */
  async logout(): Promise<void> {
    try {
      const client = await this.getSupabase();
      await client.auth.signOut();
    } catch (error) {
      // Ignore sign out errors
    }

    await this.clearTokens();
    this.supabase = null;
    this.cachedUser = null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const accessToken = await this.context.secrets.get(SECRET_KEY_ACCESS_TOKEN);
    if (!accessToken) {
      return false;
    }

    // If token is expired, try to refresh
    if (this.isTokenExpired(accessToken)) {
      return await this.refreshSession();
    }

    return true;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    if (this.cachedUser) {
      return this.cachedUser;
    }

    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      return null;
    }

    try {
      const client = await this.getSupabase();
      const { data } = await client.auth.getUser();
      this.cachedUser = data.user;
      return data.user;
    } catch {
      return null;
    }
  }

  /**
   * Get current access token (for API calls)
   */
  async getAccessToken(): Promise<string | null> {
    const accessToken = await this.context.secrets.get(SECRET_KEY_ACCESS_TOKEN);
    
    if (!accessToken) {
      return null;
    }

    // Refresh if expired
    if (this.isTokenExpired(accessToken)) {
      const refreshed = await this.refreshSession();
      if (!refreshed) {
        return null;
      }
      return await this.context.secrets.get(SECRET_KEY_ACCESS_TOKEN) || null;
    }

    return accessToken;
  }
}
