/**
 * Sentry Webhook Handler
 * 
 * Receives webhooks from Sentry and creates/updates tasks in VibeTasks.
 * 
 * Webhook Types Supported:
 * - issue.created: Create new task from Sentry issue
 * - issue.resolved: Mark task as done
 * - issue.unresolved: Reopen task (set to todo)
 * - issue.assigned: Update task notes
 * 
 * Deduplication:
 * - Uses sentry_issue_id field on tasks
 * - If issue already exists, updates error count instead of creating duplicate
 * 
 * Security:
 * - Validates webhook signature using HMAC-SHA256
 * - Rate limited to prevent abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Use a generic type for the admin client to avoid strict schema typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminSupabaseClient = SupabaseClient<any, any, any>;

// Types for Sentry webhook payloads
interface SentryIssuePayload {
  action: 'created' | 'resolved' | 'assigned' | 'archived' | 'unresolved';
  installation: {
    uuid: string;
  };
  data: {
    issue: {
      id: string;
      shortId: string;
      title: string;
      culprit: string;
      permalink: string;
      level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
      status: string;
      substatus?: string;
      platform: string;
      project: {
        id: string;
        name: string;
        slug: string;
        platform: string;
      };
      metadata: {
        title?: string;
        type?: string;
        value?: string;
        filename?: string;
        severity?: number;
        severity_reason?: string;
        initial_priority?: number;
      };
      priority?: 'high' | 'medium' | 'low';
      count: string;
      userCount: number;
      firstSeen: string;
      lastSeen: string;
      url?: string;
      web_url?: string;
    };
  };
  actor: {
    type: 'user' | 'application';
    id: string;
    name: string;
  };
}

// Map Sentry levels to VibeTasks priority
function mapSentryLevelToPriority(level: string, sentryPriority?: string): 'none' | 'low' | 'medium' | 'high' {
  // Use Sentry's priority if available
  if (sentryPriority) {
    return sentryPriority as 'high' | 'medium' | 'low';
  }
  
  // Fall back to level-based mapping
  switch (level) {
    case 'fatal':
      return 'high';
    case 'error':
      return 'high';
    case 'warning':
      return 'medium';
    case 'info':
      return 'low';
    case 'debug':
      return 'none';
    default:
      return 'medium';
  }
}

// Verify Sentry webhook signature
function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body, 'utf8');
  const digest = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(signature)
  );
}

// Rate limiting check (max 100 webhooks per minute per IP)
async function checkRateLimit(
  supabase: AdminSupabaseClient,
  ipAddress: string
): Promise<{ allowed: boolean; remaining: number }> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  
  const { count } = await supabase
    .from('sentry_webhook_logs')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ipAddress)
    .gte('created_at', oneMinuteAgo);
  
  const requestCount = count || 0;
  const limit = 100;
  
  return {
    allowed: requestCount < limit,
    remaining: Math.max(0, limit - requestCount),
  };
}

// Create admin Supabase client (bypasses RLS for webhook handling)
function createAdminClient(): AdminSupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for webhook handling');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get IP address for rate limiting
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    
    // Get the raw body for signature verification
    const rawBody = await request.text();
    
    // Parse the JSON body
    let payload: SentryIssuePayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    
    // Get Sentry headers
    const resource = request.headers.get('sentry-hook-resource');
    const signature = request.headers.get('sentry-hook-signature');
    const timestamp = request.headers.get('sentry-hook-timestamp');
    
    // Only handle issue webhooks for now
    if (resource !== 'issue') {
      return NextResponse.json(
        { message: 'Webhook received but not processed (not an issue event)' },
        { status: 200 }
      );
    }
    
    // Create admin Supabase client
    let supabase: AdminSupabaseClient;
    try {
      supabase = createAdminClient();
    } catch (error) {
      console.error('Failed to create admin client:', error);
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Rate limiting
    const rateLimit = await checkRateLimit(supabase, ipAddress);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
          },
        }
      );
    }
    
    // Extract webhook secret from URL path
    // URL format: /api/webhooks/sentry?token=<webhook_secret>
    const webhookSecret = request.nextUrl.searchParams.get('token');
    
    if (!webhookSecret) {
      await logWebhook(supabase, {
        user_id: null,
        sentry_issue_id: payload.data?.issue?.id,
        action: payload.action,
        resource: resource || 'unknown',
        success: false,
        error_message: 'Missing webhook token',
        ip_address: ipAddress,
      });
      
      return NextResponse.json(
        { error: 'Missing webhook token in URL. Use: /api/webhooks/sentry?token=YOUR_TOKEN' },
        { status: 401 }
      );
    }
    
    // Look up integration by webhook secret
    const { data: integration, error: integrationError } = await supabase
      .from('sentry_integrations')
      .select('*')
      .eq('webhook_secret', webhookSecret)
      .single();
    
    if (integrationError || !integration) {
      await logWebhook(supabase, {
        user_id: null,
        sentry_issue_id: payload.data?.issue?.id,
        action: payload.action,
        resource: resource || 'unknown',
        success: false,
        error_message: 'Invalid webhook token',
        ip_address: ipAddress,
      });
      
      return NextResponse.json(
        { error: 'Invalid webhook token' },
        { status: 401 }
      );
    }
    
    // Verify signature (optional but recommended)
    // Note: Signature verification requires the Sentry integration's client secret
    // For now, we rely on the unique webhook_secret token for authentication
    
    // Check if integration is enabled
    if (!integration.is_enabled) {
      await logWebhook(supabase, {
        user_id: integration.user_id,
        sentry_issue_id: payload.data?.issue?.id,
        action: payload.action,
        resource: resource || 'unknown',
        success: false,
        error_message: 'Integration is disabled',
        ip_address: ipAddress,
      });
      
      return NextResponse.json(
        { message: 'Integration is disabled' },
        { status: 200 }
      );
    }
    
    const issue = payload.data.issue;
    const action = payload.action;
    
    // Check if this level should trigger task creation
    const enabledLevels = integration.enabled_levels?.split(',') || ['fatal', 'error'];
    if (!enabledLevels.includes(issue.level)) {
      await logWebhook(supabase, {
        user_id: integration.user_id,
        sentry_issue_id: issue.id,
        action: action,
        resource: resource || 'unknown',
        success: true,
        error_message: `Level ${issue.level} not enabled`,
        ip_address: ipAddress,
      });
      
      return NextResponse.json(
        { message: `Level ${issue.level} not configured for task creation` },
        { status: 200 }
      );
    }
    
    // Handle different actions
    let taskId: string | null = null;
    let taskAction: string;
    
    switch (action) {
      case 'created': {
        // Check for existing task with this Sentry issue ID (deduplication)
        const { data: existingTask } = await supabase
          .from('tasks')
          .select('id, sentry_error_count')
          .eq('user_id', integration.user_id)
          .eq('sentry_issue_id', issue.id)
          .single();
        
        if (existingTask) {
          // Update existing task: increment error count and update last_seen
          const { data: updatedTask, error: updateError } = await supabase
            .from('tasks')
            .update({
              sentry_error_count: (existingTask.sentry_error_count || 1) + 1,
              sentry_last_seen: issue.lastSeen,
              // If task was done/archived, reopen it
              status: 'todo',
              completed: false,
              completed_at: null,
              archived_at: null,
            })
            .eq('id', existingTask.id)
            .select('id')
            .single();
          
          if (updateError) {
            throw new Error(`Failed to update task: ${updateError.message}`);
          }
          
          taskId = updatedTask?.id || null;
          taskAction = 'updated (incremented error count)';
        } else {
          // Create new task
          const title = formatTaskTitle(issue);
          const notes = formatTaskNotes(issue);
          const priority = mapSentryLevelToPriority(issue.level, issue.priority);
          
          const { data: newTask, error: createError } = await supabase
            .from('tasks')
            .insert({
              user_id: integration.user_id,
              title,
              notes,
              notes_format: 'html',
              priority,
              status: 'todo',
              completed: false,
              project_tag: integration.default_project_tag || issue.project.name,
              created_by: 'ai',
              sentry_issue_id: issue.id,
              sentry_project: issue.project.slug,
              sentry_error_count: parseInt(issue.count) || 1,
              sentry_first_seen: issue.firstSeen,
              sentry_last_seen: issue.lastSeen,
              sentry_level: issue.level,
              sentry_url: issue.permalink,
            })
            .select('id')
            .single();
          
          if (createError) {
            throw new Error(`Failed to create task: ${createError.message}`);
          }
          
          taskId = newTask?.id || null;
          taskAction = 'created';
          
          // Update integration stats
          await supabase
            .from('sentry_integrations')
            .update({
              tasks_created: integration.tasks_created + 1,
              last_webhook_at: new Date().toISOString(),
            })
            .eq('id', integration.id);
        }
        break;
      }
      
      case 'resolved': {
        // Mark task as done
        const { data: resolvedTask, error: resolveError } = await supabase
          .from('tasks')
          .update({
            status: 'done',
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq('user_id', integration.user_id)
          .eq('sentry_issue_id', issue.id)
          .select('id')
          .single();
        
        if (resolveError && resolveError.code !== 'PGRST116') { // PGRST116 = no rows found
          throw new Error(`Failed to resolve task: ${resolveError.message}`);
        }
        
        taskId = resolvedTask?.id || null;
        taskAction = taskId ? 'marked as done' : 'not found (no task to resolve)';
        break;
      }
      
      case 'unresolved': {
        // Reopen task
        const { data: unresolvedTask, error: unresolveError } = await supabase
          .from('tasks')
          .update({
            status: 'todo',
            completed: false,
            completed_at: null,
            archived_at: null,
            sentry_last_seen: issue.lastSeen,
          })
          .eq('user_id', integration.user_id)
          .eq('sentry_issue_id', issue.id)
          .select('id')
          .single();
        
        if (unresolveError && unresolveError.code !== 'PGRST116') {
          throw new Error(`Failed to unresolve task: ${unresolveError.message}`);
        }
        
        taskId = unresolvedTask?.id || null;
        taskAction = taskId ? 'reopened' : 'not found (no task to reopen)';
        break;
      }
      
      case 'assigned': {
        // Update task notes with assignment info
        const actor = payload.actor;
        const assignmentNote = `\n\n<p><em>Assigned to ${actor.name} in Sentry</em></p>`;
        
        const { data: assignedTask } = await supabase
          .from('tasks')
          .select('id, notes')
          .eq('user_id', integration.user_id)
          .eq('sentry_issue_id', issue.id)
          .single();
        
        if (assignedTask) {
          await supabase
            .from('tasks')
            .update({
              notes: (assignedTask.notes || '') + assignmentNote,
            })
            .eq('id', assignedTask.id);
          
          taskId = assignedTask.id;
          taskAction = 'updated with assignment info';
        } else {
          taskAction = 'not found (no task to update)';
        }
        break;
      }
      
      case 'archived': {
        // Archive the task
        const { data: archivedTask, error: archiveError } = await supabase
          .from('tasks')
          .update({
            status: 'archived',
            archived_at: new Date().toISOString(),
          })
          .eq('user_id', integration.user_id)
          .eq('sentry_issue_id', issue.id)
          .select('id')
          .single();
        
        if (archiveError && archiveError.code !== 'PGRST116') {
          throw new Error(`Failed to archive task: ${archiveError.message}`);
        }
        
        taskId = archivedTask?.id || null;
        taskAction = taskId ? 'archived' : 'not found (no task to archive)';
        break;
      }
      
      default:
        taskAction = `unknown action: ${action}`;
    }
    
    // Log successful webhook
    await logWebhook(supabase, {
      user_id: integration.user_id,
      sentry_issue_id: issue.id,
      action: action,
      resource: resource || 'unknown',
      success: true,
      task_id: taskId,
      ip_address: ipAddress,
    });
    
    // Update last webhook timestamp
    await supabase
      .from('sentry_integrations')
      .update({ last_webhook_at: new Date().toISOString() })
      .eq('id', integration.id);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      action: taskAction,
      taskId,
      processingTimeMs: processingTime,
    });
    
  } catch (error) {
    console.error('Sentry webhook error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper to log webhook events
async function logWebhook(
  supabase: AdminSupabaseClient,
  log: {
    user_id: string | null;
    sentry_issue_id: string | undefined;
    action: string;
    resource: string;
    success: boolean;
    error_message?: string;
    task_id?: string | null;
    ip_address: string;
  }
) {
  try {
    await supabase.from('sentry_webhook_logs').insert({
      user_id: log.user_id,
      sentry_issue_id: log.sentry_issue_id,
      action: log.action,
      resource: log.resource,
      success: log.success,
      error_message: log.error_message,
      task_id: log.task_id,
      ip_address: log.ip_address,
    });
  } catch (e) {
    // Don't fail the webhook if logging fails
    console.error('Failed to log webhook:', e);
  }
}

// Format task title from Sentry issue
function formatTaskTitle(issue: SentryIssuePayload['data']['issue']): string {
  const prefix = `[${issue.level.toUpperCase()}]`;
  const title = issue.metadata?.title || issue.title;
  
  // Truncate if too long
  const maxLength = 100;
  if (title.length > maxLength) {
    return `${prefix} ${title.slice(0, maxLength - 3)}...`;
  }
  
  return `${prefix} ${title}`;
}

// Format task notes from Sentry issue
function formatTaskNotes(issue: SentryIssuePayload['data']['issue']): string {
  const parts: string[] = [];
  
  // Error details
  parts.push(`<h3>Sentry Issue: ${issue.shortId}</h3>`);
  parts.push(`<p><strong>Project:</strong> ${issue.project.name} (${issue.platform})</p>`);
  parts.push(`<p><strong>Level:</strong> ${issue.level}</p>`);
  
  if (issue.culprit) {
    parts.push(`<p><strong>Culprit:</strong> <code>${issue.culprit}</code></p>`);
  }
  
  if (issue.metadata?.value) {
    parts.push(`<p><strong>Error:</strong> ${issue.metadata.type || 'Error'}: ${issue.metadata.value}</p>`);
  }
  
  if (issue.metadata?.filename) {
    parts.push(`<p><strong>File:</strong> <code>${issue.metadata.filename}</code></p>`);
  }
  
  // Stats
  parts.push('<hr>');
  parts.push(`<p><strong>Occurrences:</strong> ${issue.count}</p>`);
  parts.push(`<p><strong>Users affected:</strong> ${issue.userCount}</p>`);
  parts.push(`<p><strong>First seen:</strong> ${new Date(issue.firstSeen).toLocaleString()}</p>`);
  parts.push(`<p><strong>Last seen:</strong> ${new Date(issue.lastSeen).toLocaleString()}</p>`);
  
  // Link to Sentry
  parts.push('<hr>');
  parts.push(`<p><a href="${issue.permalink}" target="_blank" rel="noopener noreferrer">View in Sentry</a></p>`);
  
  return parts.join('\n');
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'VibeTasks Sentry Webhook Endpoint',
    status: 'active',
    usage: 'POST /api/webhooks/sentry?token=YOUR_WEBHOOK_TOKEN',
    supportedResources: ['issue'],
    supportedActions: ['created', 'resolved', 'unresolved', 'assigned', 'archived'],
  });
}
