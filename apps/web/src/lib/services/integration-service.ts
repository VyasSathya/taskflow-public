/**
 * Integration Service
 * Client-side service for managing all integrations (GitHub, Email, Slack, Sentry)
 */

import { createClient } from '@/lib/supabase/client';

// Common types for all integrations
export interface BaseIntegration {
  id: string;
  user_id: string;
  webhook_secret: string;
  is_enabled: boolean;
  tasks_created: number;
  last_webhook_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  user_id: string;
  integration_type: string;
  action: string;
  resource: string;
  success: boolean;
  error_message: string | null;
  task_id: string | null;
  ip_address: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

// GitHub Integration
export interface GitHubIntegration extends BaseIntegration {
  github_secret: string | null;
  enabled_events: string;
  default_priority: 'none' | 'low' | 'medium' | 'high';
  default_project_tag: string | null;
  auto_close_on_resolve: boolean;
}

// Email Integration
export interface EmailIntegration extends BaseIntegration {
  provider: 'mailgun' | 'sendgrid' | 'postmark' | 'generic';
  default_priority: 'none' | 'low' | 'medium' | 'high';
  allowed_senders: string | null;
  auto_classify: boolean;
}

// Slack Integration
export interface SlackIntegration extends BaseIntegration {
  slack_signing_secret: string | null;
  allowed_channels: string[];
  trigger_words: string[];
  trigger_reactions: string[];
  default_priority: 'none' | 'low' | 'medium' | 'high';
}

// Sentry Integration (re-exported from existing service)
export interface SentryIntegration extends BaseIntegration {
  auto_create_tasks: boolean;
  default_priority: 'none' | 'low' | 'medium' | 'high';
  enabled_levels: string;
  default_project_tag: string | null;
}

// Generate a secure webhook secret
function generateWebhookSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Get base URL for webhook URLs
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app';
}

export const integrationService = {
  // ==================== GitHub Integration ====================
  
  async getGitHubIntegration(): Promise<GitHubIntegration | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('github_integrations')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  },

  async enableGitHubIntegration(settings?: {
    default_priority?: 'none' | 'low' | 'medium' | 'high';
    enabled_events?: string[];
    default_project_tag?: string;
    github_secret?: string;
  }): Promise<GitHubIntegration> {
    const supabase = createClient();
    const existing = await this.getGitHubIntegration();
    
    if (existing) {
      const { data, error } = await supabase
        .from('github_integrations')
        .update({
          is_enabled: true,
          ...(settings && {
            default_priority: settings.default_priority,
            enabled_events: settings.enabled_events?.join(','),
            default_project_tag: settings.default_project_tag,
            github_secret: settings.github_secret,
          }),
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
    
    const webhookSecret = generateWebhookSecret();
    const { data, error } = await supabase
      .from('github_integrations')
      .insert({
        webhook_secret: webhookSecret,
        is_enabled: true,
        default_priority: settings?.default_priority || 'high',
        enabled_events: settings?.enabled_events?.join(',') || 'issues',
        default_project_tag: settings?.default_project_tag,
        github_secret: settings?.github_secret,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateGitHubIntegration(updates: Partial<GitHubIntegration>): Promise<GitHubIntegration> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('github_integrations')
      .update(updates)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async disableGitHubIntegration(): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('github_integrations')
      .update({ is_enabled: false })
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
  },

  getGitHubWebhookUrl(webhookSecret: string): string {
    return `${getBaseUrl()}/api/webhooks/github?token=${webhookSecret}`;
  },

  // ==================== Email Integration ====================
  
  async getEmailIntegration(): Promise<EmailIntegration | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('email_integrations')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  },

  async enableEmailIntegration(settings?: {
    provider?: 'mailgun' | 'sendgrid' | 'postmark' | 'generic';
    default_priority?: 'none' | 'low' | 'medium' | 'high';
    allowed_senders?: string;
  }): Promise<EmailIntegration> {
    const supabase = createClient();
    const existing = await this.getEmailIntegration();
    
    if (existing) {
      const { data, error } = await supabase
        .from('email_integrations')
        .update({
          is_enabled: true,
          ...(settings && {
            provider: settings.provider,
            default_priority: settings.default_priority,
            allowed_senders: settings.allowed_senders,
          }),
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
    
    const webhookSecret = generateWebhookSecret();
    const { data, error } = await supabase
      .from('email_integrations')
      .insert({
        webhook_secret: webhookSecret,
        is_enabled: true,
        provider: settings?.provider || 'generic',
        default_priority: settings?.default_priority || 'medium',
        allowed_senders: settings?.allowed_senders,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateEmailIntegration(updates: Partial<EmailIntegration>): Promise<EmailIntegration> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('email_integrations')
      .update(updates)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async disableEmailIntegration(): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('email_integrations')
      .update({ is_enabled: false })
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
  },

  getEmailWebhookUrl(webhookSecret: string, provider: string = 'generic'): string {
    return `${getBaseUrl()}/api/webhooks/email?token=${webhookSecret}&provider=${provider}`;
  },

  // ==================== Slack Integration ====================
  
  async getSlackIntegration(): Promise<SlackIntegration | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('slack_integrations')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  },

  async enableSlackIntegration(settings?: {
    slack_signing_secret?: string;
    allowed_channels?: string[];
    trigger_words?: string[];
    default_priority?: 'none' | 'low' | 'medium' | 'high';
  }): Promise<SlackIntegration> {
    const supabase = createClient();
    const existing = await this.getSlackIntegration();
    
    if (existing) {
      const { data, error } = await supabase
        .from('slack_integrations')
        .update({
          is_enabled: true,
          ...(settings && {
            slack_signing_secret: settings.slack_signing_secret,
            allowed_channels: settings.allowed_channels,
            trigger_words: settings.trigger_words,
            default_priority: settings.default_priority,
          }),
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
    
    const webhookSecret = generateWebhookSecret();
    const { data, error } = await supabase
      .from('slack_integrations')
      .insert({
        webhook_secret: webhookSecret,
        is_enabled: true,
        slack_signing_secret: settings?.slack_signing_secret,
        allowed_channels: settings?.allowed_channels || [],
        trigger_words: settings?.trigger_words || ['feedback', 'bug', 'feature request'],
        default_priority: settings?.default_priority || 'medium',
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateSlackIntegration(updates: Partial<SlackIntegration>): Promise<SlackIntegration> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('slack_integrations')
      .update(updates)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async disableSlackIntegration(): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('slack_integrations')
      .update({ is_enabled: false })
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
  },

  getSlackWebhookUrl(webhookSecret: string): string {
    return `${getBaseUrl()}/api/webhooks/slack?token=${webhookSecret}`;
  },

  // ==================== Common Operations ====================
  
  async regenerateWebhookSecret(integrationType: 'github' | 'email' | 'slack' | 'sentry'): Promise<string> {
    const supabase = createClient();
    const newSecret = generateWebhookSecret();
    const tableName = `${integrationType}_integrations`;
    
    const { error } = await supabase
      .from(tableName)
      .update({ webhook_secret: newSecret })
      .single();
    
    if (error) throw error;
    return newSecret;
  },

  async getWebhookLogs(integrationType?: string, limit: number = 50): Promise<WebhookLog[]> {
    const supabase = createClient();
    
    let query = supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (integrationType) {
      query = query.eq('integration_type', integrationType);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  },

  async testWebhook(integrationType: 'github' | 'email' | 'slack' | 'sentry', webhookSecret: string): Promise<{ success: boolean; message: string }> {
    const baseUrl = getBaseUrl();
    const urls: Record<string, string> = {
      github: `${baseUrl}/api/webhooks/github?token=${webhookSecret}`,
      email: `${baseUrl}/api/webhooks/email?token=${webhookSecret}&provider=generic`,
      slack: `${baseUrl}/api/webhooks/slack?token=${webhookSecret}`,
      sentry: `${baseUrl}/api/webhooks/sentry?token=${webhookSecret}`,
    };

    try {
      const response = await fetch(urls[integrationType], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Webhook': 'true',
        },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
      });

      if (response.ok || response.status === 400) {
        // 400 is expected for test payloads that don't match expected format
        return { success: true, message: 'Webhook endpoint is reachable' };
      }

      const errorResponse = await response.json();
      return { success: false, message: errorResponse.error || 'Webhook test failed' };
    } catch {
      return { success: false, message: 'Failed to reach webhook endpoint' };
    }
  },
};
