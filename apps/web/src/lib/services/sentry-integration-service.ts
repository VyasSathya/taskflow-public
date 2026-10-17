/**
 * Sentry Integration Service
 * Client-side service for managing Sentry integration settings
 */

import { createClient } from '@/lib/supabase/client';

export interface SentryIntegration {
  id: string;
  user_id: string;
  webhook_secret: string;
  is_enabled: boolean;
  auto_create_tasks: boolean;
  default_priority: 'none' | 'low' | 'medium' | 'high';
  enabled_levels: string;
  default_project_tag: string | null;
  tasks_created: number;
  last_webhook_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SentryWebhookLog {
  id: string;
  user_id: string;
  sentry_issue_id: string | null;
  action: string;
  resource: string;
  success: boolean;
  error_message: string | null;
  task_id: string | null;
  ip_address: string;
  created_at: string;
}

// Generate a secure webhook secret
function generateWebhookSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export const sentryIntegrationService = {
  /**
   * Get the current user's Sentry integration settings
   */
  async getIntegration(): Promise<SentryIntegration | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('sentry_integrations')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }
    
    return data;
  },

  /**
   * Create or enable Sentry integration for the current user
   */
  async enableIntegration(settings?: {
    default_priority?: 'none' | 'low' | 'medium' | 'high';
    enabled_levels?: string[];
    default_project_tag?: string;
  }): Promise<SentryIntegration> {
    const supabase = createClient();
    
    // Check if integration already exists
    const existing = await this.getIntegration();
    
    if (existing) {
      // Re-enable existing integration
      const { data, error } = await supabase
        .from('sentry_integrations')
        .update({
          is_enabled: true,
          ...settings && {
            default_priority: settings.default_priority,
            enabled_levels: settings.enabled_levels?.join(','),
            default_project_tag: settings.default_project_tag,
          },
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
    
    // Create new integration
    const webhookSecret = generateWebhookSecret();
    
    const { data, error } = await supabase
      .from('sentry_integrations')
      .insert({
        webhook_secret: webhookSecret,
        is_enabled: true,
        default_priority: settings?.default_priority || 'high',
        enabled_levels: settings?.enabled_levels?.join(',') || 'fatal,error',
        default_project_tag: settings?.default_project_tag,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Update Sentry integration settings
   */
  async updateIntegration(updates: {
    is_enabled?: boolean;
    auto_create_tasks?: boolean;
    default_priority?: 'none' | 'low' | 'medium' | 'high';
    enabled_levels?: string[];
    default_project_tag?: string | null;
  }): Promise<SentryIntegration> {
    const supabase = createClient();
    
    const updateData: Record<string, unknown> = {};
    
    if (updates.is_enabled !== undefined) updateData.is_enabled = updates.is_enabled;
    if (updates.auto_create_tasks !== undefined) updateData.auto_create_tasks = updates.auto_create_tasks;
    if (updates.default_priority !== undefined) updateData.default_priority = updates.default_priority;
    if (updates.enabled_levels !== undefined) updateData.enabled_levels = updates.enabled_levels.join(',');
    if (updates.default_project_tag !== undefined) updateData.default_project_tag = updates.default_project_tag;
    
    const { data, error } = await supabase
      .from('sentry_integrations')
      .update(updateData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Disable Sentry integration
   */
  async disableIntegration(): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('sentry_integrations')
      .update({ is_enabled: false })
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
  },

  /**
   * Regenerate webhook secret (invalidates old webhooks)
   */
  async regenerateWebhookSecret(): Promise<string> {
    const supabase = createClient();
    
    const newSecret = generateWebhookSecret();
    
    const { error } = await supabase
      .from('sentry_integrations')
      .update({ webhook_secret: newSecret })
      .single();
    
    if (error) throw error;
    return newSecret;
  },

  /**
   * Get recent webhook logs
   */
  async getWebhookLogs(limit: number = 50): Promise<SentryWebhookLog[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('sentry_webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Get the webhook URL for Sentry configuration
   */
  getWebhookUrl(webhookSecret: string): string {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app';
    
    return `${baseUrl}/api/webhooks/sentry?token=${webhookSecret}`;
  },
};
