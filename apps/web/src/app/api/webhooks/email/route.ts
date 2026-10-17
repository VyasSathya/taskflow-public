/**
 * Email Inbound Webhook
 * Works with Mailgun, SendGrid, or Postmark inbound parsing
 * Creates VibeTasks tasks from support emails
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Classify email as error report or feedback
function classifyEmail(subject: string, body: string): 'error' | 'feedback' {
  const text = `${subject} ${body}`.toLowerCase();
  const errorPatterns = ['bug', 'error', 'crash', 'broken', 'not working', 'fail', 'issue', 'problem', 'exception', 'stack trace'];
  
  return errorPatterns.some(p => text.includes(p)) ? 'error' : 'feedback';
}

// Extract priority from subject
function getPriority(subject: string): 'high' | 'medium' | 'low' | 'none' {
  const s = subject.toLowerCase();
  if (s.includes('urgent') || s.includes('critical') || s.includes('asap')) {
    return 'high';
  }
  if (s.includes('important')) {
    return 'medium';
  }
  return 'none';
}

// Parse different email webhook formats
function parseEmailPayload(body: any, provider: string): {
  from: string;
  subject: string;
  text: string;
  html?: string;
} | null {
  try {
    switch (provider) {
      case 'mailgun':
        return {
          from: body.sender || body.from,
          subject: body.subject || '(No Subject)',
          text: body['stripped-text'] || body['body-plain'] || '',
          html: body['stripped-html'] || body['body-html'],
        };
      
      case 'sendgrid':
        return {
          from: body.from,
          subject: body.subject || '(No Subject)',
          text: body.text || '',
          html: body.html,
        };
      
      case 'postmark':
        return {
          from: body.From || body.FromFull?.Email,
          subject: body.Subject || '(No Subject)',
          text: body.TextBody || '',
          html: body.HtmlBody,
        };
      
      default:
        // Generic format
        return {
          from: body.from || body.sender || body.email,
          subject: body.subject || '(No Subject)',
          text: body.text || body.body || body.content || '',
          html: body.html,
        };
    }
  } catch (e) {
    console.error('Failed to parse email payload:', e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get provider and token from query params
    const provider = request.nextUrl.searchParams.get('provider') || 'generic';
    const token = request.nextUrl.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Look up integration settings
    const { data: integration, error: integrationError } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('webhook_secret', token)
      .single();
    
    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Parse request body (handle both JSON and form data)
    let body: any;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = await request.json();
    }
    
    // Parse email
    const email = parseEmailPayload(body, provider);
    if (!email) {
      return NextResponse.json({ error: 'Failed to parse email' }, { status: 400 });
    }
    
    const type = classifyEmail(email.subject, email.text);
    const priority = type === 'error' ? 'high' : getPriority(email.subject);
    
    // Create task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: integration.user_id,
        title: `[Email] ${email.subject}`.slice(0, 200),
        notes: `**From:** ${email.from}\n**Subject:** ${email.subject}\n\n---\n\n${email.text}`,
        priority,
        status: 'todo',
        created_by: 'human',
        source_type: type === 'error' ? 'email_bug' : 'email_feedback',
        email_from: email.from,
        email_subject: email.subject,
      })
      .select()
      .single();
    
    if (taskError) {
      console.error('Failed to create task:', taskError);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
    
    // Add tags
    const tags = ['email', type];
    for (const tagName of tags) {
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
      message: `Created ${type} task from email`,
    });
    
  } catch (error) {
    console.error('Email webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
