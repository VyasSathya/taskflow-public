/**
 * GitHub Issues Webhook
 * Receives issue events and creates VibeTasks tasks for feedback/bugs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Verify GitHub webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

// Determine if issue is a bug/error or feedback
function classifyIssue(issue: any): 'error' | 'feedback' {
  const labels = issue.labels?.map((l: any) => l.name.toLowerCase()) || [];
  const title = issue.title?.toLowerCase() || '';
  const body = issue.body?.toLowerCase() || '';
  
  const errorPatterns = ['bug', 'error', 'crash', 'fix', 'broken', 'fail', 'issue', 'exception'];
  const isError = errorPatterns.some(p => 
    labels.includes(p) || title.includes(p) || body.includes(p)
  );
  
  return isError ? 'error' : 'feedback';
}

// Map GitHub labels to priority
function getPriority(labels: any[]): 'high' | 'medium' | 'low' | 'none' {
  const labelNames = labels?.map((l: any) => l.name.toLowerCase()) || [];
  
  if (labelNames.some(l => ['critical', 'urgent', 'p0', 'p1', 'high-priority'].includes(l))) {
    return 'high';
  }
  if (labelNames.some(l => ['p2', 'medium-priority'].includes(l))) {
    return 'medium';
  }
  if (labelNames.some(l => ['low-priority', 'p3', 'minor'].includes(l))) {
    return 'low';
  }
  return 'none';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    
    // Get user's webhook secret from query param (simple auth for MVP)
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Look up integration settings by token
    const { data: integration, error: integrationError } = await supabase
      .from('github_integrations')
      .select('*')
      .eq('webhook_secret', token)
      .single();
    
    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Optionally verify signature if secret is set
    if (integration.github_secret && signature) {
      if (!verifySignature(body, signature, integration.github_secret)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    const payload = JSON.parse(body);
    
    // Only handle issue events
    if (event !== 'issues' && event !== 'issue_comment') {
      return NextResponse.json({ message: 'Event ignored', event });
    }
    
    const action = payload.action;
    const issue = payload.issue;
    const repo = payload.repository;
    
    // Handle issue opened
    if (event === 'issues' && action === 'opened') {
      const type = classifyIssue(issue);
      const priority = type === 'error' ? 'high' : getPriority(issue.labels);
      
      // Check for duplicate
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', integration.user_id)
        .eq('github_issue_id', issue.id)
        .single();
      
      if (existing) {
        return NextResponse.json({ message: 'Issue already tracked', task_id: existing.id });
      }
      
      // Create task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: integration.user_id,
          title: `[${repo.name}] ${issue.title}`.slice(0, 200),
          notes: `**GitHub Issue #${issue.number}**\n\n${issue.body || ''}\n\n---\n[View on GitHub](${issue.html_url})`,
          priority,
          status: 'todo',
          project_tag: repo.name,
          created_by: 'human',
          source_type: type === 'error' ? 'github_bug' : 'github_feedback',
          github_issue_id: issue.id,
          github_issue_number: issue.number,
          github_repo: repo.full_name,
          github_url: issue.html_url,
        })
        .select()
        .single();
      
      if (taskError) {
        console.error('Failed to create task:', taskError);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
      }
      
      // Add tags
      const tags = ['github', type];
      for (const tagName of tags) {
        // Find or create tag
        let { data: tag } = await supabase
          .from('tags')
          .select('id')
          .eq('user_id', integration.user_id)
          .eq('name', tagName)
          .single();
        
        if (!tag) {
          const { data: newTag } = await supabase
            .from('tags')
            .insert({ user_id: integration.user_id, name: tagName })
            .select()
            .single();
          tag = newTag;
        }
        
        if (tag) {
          await supabase.from('task_tags').insert({ task_id: task.id, tag_id: tag.id });
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        task_id: task.id,
        type,
        message: `Created ${type} task from GitHub issue`
      });
    }
    
    // Handle issue closed
    if (event === 'issues' && action === 'closed') {
      const { data: task } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', integration.user_id)
        .eq('github_issue_id', issue.id)
        .single();
      
      if (task) {
        await supabase
          .from('tasks')
          .update({ status: 'done', completed: true, completed_at: new Date().toISOString() })
          .eq('id', task.id);
        
        return NextResponse.json({ success: true, message: 'Task marked as done' });
      }
    }
    
    // Handle issue reopened
    if (event === 'issues' && action === 'reopened') {
      const { data: task } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', integration.user_id)
        .eq('github_issue_id', issue.id)
        .single();
      
      if (task) {
        await supabase
          .from('tasks')
          .update({ status: 'todo', completed: false, completed_at: null })
          .eq('id', task.id);
        
        return NextResponse.json({ success: true, message: 'Task reopened' });
      }
    }
    
    return NextResponse.json({ message: 'Event processed', action });
    
  } catch (error) {
    console.error('GitHub webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
