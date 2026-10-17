import { ConfigManager } from './config-manager.js';
import { createSupabaseClient } from './supabase-client.js';

const SERVICE_NAME = 'taskflow-cli';
const ACCESS_TOKEN_ACCOUNT = 'access-token';
const REFRESH_TOKEN_ACCOUNT = 'refresh-token';

// Default Supabase config
const DEFAULT_SUPABASE_URL = (process.env.SUPABASE_URL || '');
const DEFAULT_SUPABASE_KEY = (process.env.SUPABASE_ANON_KEY || '');

// Environment variable names for token override (for CI/CD and AI agents)
const ENV_TOKEN = 'VIBETASKS_TOKEN';
const ENV_ACCESS_TOKEN = 'VIBETASKS_ACCESS_TOKEN';

/**
 * Manages authentication tokens with secure storage
 * 
 * Priority order for token retrieval:
 * 1. VIBETASKS_TOKEN or VIBETASKS_ACCESS_TOKEN environment variable
 * 2. System keychain (macOS/Windows)
 * 3. Config file (~/.config/taskflow/config.json)
 * 
 * Automatically refreshes expired tokens when using stored tokens.
 */
export class AuthManager {
  private configManager: ConfigManager;
  private keytar: any = null;
  private useKeytar: boolean = false;
  private isRefreshing: boolean = false;

  constructor() {
    this.configManager = new ConfigManager();
    this.initKeytar();
  }

  /**
   * Check for token in environment variables (highest priority)
   * Used by AI agents and CI/CD pipelines
   */
  private getEnvToken(): string | null {
    return process.env[ENV_TOKEN] || process.env[ENV_ACCESS_TOKEN] || null;
  }

  /**
   * Initialize keytar (system keychain) if available
   */
  private async initKeytar() {
    try {
      // Try to load keytar - it may not be available on all systems
      this.keytar = await import('keytar');
      this.useKeytar = true;
    } catch (error) {
      // Keytar not available, will use config file fallback
      this.useKeytar = false;
    }
  }

/**
   * Get the access token
   * Priority: ENV var > Keychain > Config file
   */
  async getAccessToken(): Promise<string | null> {
    // 1. Check environment variable first (for AI agents/CI)
    const envToken = this.getEnvToken();
    if (envToken) {
      return envToken;
    }

    // 2. Ensure keytar is initialized
    if (this.keytar === null && process.platform !== 'linux') {
      await this.initKeytar();
    }

    // 3. Try keychain (macOS/Windows)
    if (this.useKeytar && this.keytar) {
      try {
        const token = await this.keytar.getPassword(SERVICE_NAME, ACCESS_TOKEN_ACCOUNT);
        if (token) return token;
      } catch (error) {
        // Fall through to config file
      }
    }

    // 4. Fallback to config file
    return await this.configManager.get('access_token');
  }

  /**
   * Set the access token
   */
  async setAccessToken(token: string): Promise<void> {
    // Ensure keytar is initialized
    if (this.keytar === null && process.platform !== 'linux') {
      await this.initKeytar();
    }

    // Try keychain first (macOS/Windows)
    if (this.useKeytar && this.keytar) {
      try {
        await this.keytar.setPassword(SERVICE_NAME, ACCESS_TOKEN_ACCOUNT, token);
        return;
      } catch (error) {
        // Fall through to config file
      }
    }

    // Fallback to config file
    await this.configManager.setConfig('access_token', token);
  }

  /**
   * Get the refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    // Ensure keytar is initialized
    if (this.keytar === null && process.platform !== 'linux') {
      await this.initKeytar();
    }

    // Try keychain first
    if (this.useKeytar && this.keytar) {
      try {
        const token = await this.keytar.getPassword(SERVICE_NAME, REFRESH_TOKEN_ACCOUNT);
        if (token) return token;
      } catch (error) {
        // Fall through to config file
      }
    }

    // Fallback to config file
    return await this.configManager.get('refresh_token');
  }

  /**
   * Set the refresh token
   */
  async setRefreshToken(token: string): Promise<void> {
    // Ensure keytar is initialized
    if (this.keytar === null && process.platform !== 'linux') {
      await this.initKeytar();
    }

    // Try keychain first
    if (this.useKeytar && this.keytar) {
      try {
        await this.keytar.setPassword(SERVICE_NAME, REFRESH_TOKEN_ACCOUNT, token);
        return;
      } catch (error) {
        // Fall through to config file
      }
    }

    // Fallback to config file
    await this.configManager.setConfig('refresh_token', token);
  }

  /**
   * Delete all stored tokens
   */
  async clearTokens(): Promise<void> {
    // Ensure keytar is initialized
    if (this.keytar === null && process.platform !== 'linux') {
      await this.initKeytar();
    }

    // Clear from keychain
    if (this.useKeytar && this.keytar) {
      try {
        await this.keytar.deletePassword(SERVICE_NAME, ACCESS_TOKEN_ACCOUNT);
        await this.keytar.deletePassword(SERVICE_NAME, REFRESH_TOKEN_ACCOUNT);
      } catch (error) {
        // Ignore errors
      }
    }

    // Clear from config file
    await this.configManager.delete('access_token');
    await this.configManager.delete('refresh_token');
  }

  /**
   * Get a config value (pass-through to ConfigManager)
   */
  async getConfig(key: string): Promise<any> {
    return await this.configManager.get(key);
  }

  /**
   * Set a config value (pass-through to ConfigManager)
   */
  async setConfig(key: string, value: any): Promise<void> {
    await this.configManager.setConfig(key, value);
  }

/**
   * Check if user is authenticated (has access token)
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null && token !== undefined && token.length > 0;
  }

  /**
   * Get storage method being used
   */
  getStorageMethod(): 'keychain' | 'config-file' {
    return this.useKeytar ? 'keychain' : 'config-file';
  }

  /**
   * Check if token is expired (with 5 min buffer)
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const expiresAt = payload.exp * 1000;
      const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
      return Date.now() > (expiresAt - bufferMs);
    } catch {
      return true; // Assume expired if we can't parse
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing) {
      // Wait a bit and return current token
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await this.getAccessToken();
    }

    this.isRefreshing = true;

    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const supabaseUrl = await this.getConfig('supabase_url') || DEFAULT_SUPABASE_URL;
      const supabaseKey = await this.getConfig('supabase_key') || DEFAULT_SUPABASE_KEY;

      const supabase = createSupabaseClient({ supabaseUrl, supabaseKey });

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error('No session returned from refresh');
      }

      // Store new tokens
      await this.setAccessToken(data.session.access_token);
      await this.setRefreshToken(data.session.refresh_token);

      return data.session.access_token;
    } catch (error: any) {
      // Handle specific refresh errors
      const isRefreshTokenUsed = error.message?.includes('Already Used') || 
                                  error.code === 'refresh_token_already_used';
      
      if (isRefreshTokenUsed) {
        // Clear tokens - user needs to re-login
        await this.clearTokens();
      }
      
      // Only log in TTY environments
      if (process.stderr.isTTY) {
        if (isRefreshTokenUsed) {
          console.error('Session expired. Please run: vibetasks login');
        } else {
          console.error('Token refresh failed:', error.message);
        }
      }
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   * Environment tokens are always considered valid (no refresh)
   */
  async getValidAccessToken(): Promise<string | null> {
    // If using env token, return it directly (no refresh needed)
    const envToken = this.getEnvToken();
    if (envToken) {
      return envToken;
    }

    const token = await this.getAccessToken();
    
    if (!token) {
      return null;
    }

    // Check if token is expired
    if (this.isTokenExpired(token)) {
      // Try to refresh
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        return newToken;
      }
      // Refresh failed - return null to trigger re-login
      return null;
    }

    return token;
  }

  /**
   * Check if using environment token (for AI agents/CI)
   */
  isUsingEnvToken(): boolean {
    return this.getEnvToken() !== null;
  }

  /**
   * Get auth source for debugging
   */
  getAuthSource(): 'env' | 'keychain' | 'config' | 'none' {
    if (this.getEnvToken()) return 'env';
    if (this.useKeytar) return 'keychain';
    return 'config';
  }
}
