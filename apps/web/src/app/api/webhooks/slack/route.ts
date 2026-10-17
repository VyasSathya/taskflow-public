/**
 * Slack Events Webhook
 * Receives messages from specific channels and creates feedback tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Verify Slack request signature
function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string
): boolean {
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', signingSecret);
  const mySignature = 'v0=' + hmac.update(baseString).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
}

// Classify message as error or feedback
function classifyMessage(text: string): 'error' | 'feedback' {
  const lowerText = text.toLowerCase();
  const errorPatterns = ['bug', 'error', 'crash', 'broken', 'not working', 'fail', 'issue', 'problem'];
  
  return errorPatterns.some(p => lowerText.includes(p)) ? 'error' : 'feedback';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const timestamp = request.headers.get('x-slack-request-timestamp');
    const signature = request.headers.get('x-slack-signature');
    
    // Get token from query param
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Look up integration settings
    const { data: integration, error: integrationError } = await supabase
      .from('slack_integrations')
      .select('*')
      .eq('webhook_secret', token)
      .single();
    
    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Verify signature if signing secret is configured
    if (integration.slack_signing_secret && timestamp && signature) {
      // Check timestamp is within 5 minutes
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - parseInt(timestamp)) > 300) {
        return NextResponse.json({ error: 'Request too old' }, { status: 401 });
      }
      
      if (!verifySlackSignature(body, timestamp, signature, integration.slack_signing_secret)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    const payload = JSON.parse(body);
    
    // Handle URL verification challenge
    if (payload.type === 'url_verification') {
      return NextResponse.json({ challenge: payload.challenge });
    }
    
    // Handle events
    if (payload.type === 'event_callback') {
      const event = payload.event;
      
      // Only handle messages (not bot messages or edits)
      if (event.type !== 'message' || event.bot_id || event.subtype) {
        return NextResponse.json({ message: 'Event ignored' });
      }
      
      // Check if channel is in allowed list
      const allowedChannels = integration.allowed_channels || [];
      if (allowedChannels.length > 0 && !allowedChannels.includes(event.channel)) {
        return NextResponse.json({ message: 'Channel not monitored' });
      }
      
      // Check for trigger keywords or reactions
      const triggerWords = integration.trigger_words || ['feedback', 'bug', 'feature request', 'suggestion'];
      const hasKeyword = triggerWords.some((word: string) => 
        event.text?.toLowerCase().includes(word.toLowerCase())
      );
      
      // Check for trigger emoji reaction
      const hasTriggerReaction = event.type === 'reaction_added' && 
        (integration.trigger_reactions || ['eyes', 'memo', 'bug']).includes(event.reaction);
      
      if (!hasKeyword && !hasTriggerReaction) {
        return NextResponse.json({ message: 'No trigger found' });
      }
      
      const type = classifyMessage(event.text || '');
      const priority = type === 'error' ? 'high' : 'none';
      
      // Create task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: integration.user_id,
          title: `[Slack] ${(event.text || '').slice(0, 100)}${event.text?.length > 100 ? '...' : ''}`,
          notes: `**From Slack**\n\nChannel: <#${event.channel}>\nUser: <@${event.user}>\n\n---\n\n${event.text}`,
          priority,
          status: 'todo',
          created_by: 'human',
          source_type: type === 'error' ? 'slack_bug' : 'slack_feedback',
          slack_channel: event.channel,
          slack_user: event.user,
          slack_ts: event.ts,
        })
        .select()
        .single();
      
      if (taskError) {
        console.error('Failed to create task:', taskError);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
      }
      
      // Add tags
      const tags = ['slack', type];
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
        message: `Created ${type} task from Slack message`,
      });
    }
    
    return NextResponse.json({ message: 'Event processed' });
    
  } catch (error) {
    console.error('Slack webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
