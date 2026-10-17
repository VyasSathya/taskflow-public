import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
  accessToken?: string;
}

/**
 * Create a Supabase client with the provided configuration
 *
 * @param config - Supabase configuration including URL, key, and optional access token
 * @returns Configured Supabase client
 */
export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  const { supabaseUrl, supabaseKey, accessToken } = config;

  // Validate required config
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and key are required');
  }

  // Create client with optional access token for authentication
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false, // CLI/MCP don't need session persistence
      autoRefreshToken: false, // We'll handle refresh manually if needed
    },
    global: accessToken ? {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    } : undefined,
  });

  return client;
}

/**
 * Create a Supabase client from environment variables
 *
 * @returns Configured Supabase client
 * @throws Error if environment variables are not set
 */
export function createSupabaseClientFromEnv(): SupabaseClient {
  const supabaseUrl = process.env.TASKFLOW_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.TASKFLOW_SUPABASE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  const accessToken = process.env.TASKFLOW_ACCESS_TOKEN;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase configuration not found in environment variables. ' +
      'Set TASKFLOW_SUPABASE_URL and TASKFLOW_SUPABASE_KEY, or run: taskflow login'
    );
  }

  return createSupabaseClient({
    supabaseUrl,
    supabaseKey,
    accessToken,
  });
}
