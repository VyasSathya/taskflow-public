// Google Calendar Sync Edge Function
// Two-way sync between TaskFlow tasks and Google Calendar events

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Denv.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { action, taskId, calendarId } = await req.json();

    switch (action) {
      case 'sync_task_to_calendar':
        return await syncTaskToCalendar(supabase, user.id, taskId, calendarId);
      case 'sync_calendar_to_task':
        return await syncCalendarToTask(supabase, user.id, calendarId);
      case 'get_calendars':
        return await getCalendars(user.id);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

async function syncTaskToCalendar(supabase: any, userId: string, taskId: string, accessToken: string) {
  // Fetch task
  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  // Create Google Calendar event
  const event = {
    summary: task.title,
    description: task.notes || '',
    start: {
      dateTime: task.start_date || task.due_date,
      timeZone: 'UTC',
    },
    end: {
      dateTime: new Date(
        new Date(task.start_date || task.due_date).getTime() + (task.duration_minutes || 60) * 60 * 1000
      ).toISOString(),
      timeZone: 'UTC',
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.statusText}`);
  }

  const calendarEvent = await response.json();

  // Store calendar event ID in task
  await supabase
    .from('tasks')
    .update({ google_calendar_event_id: calendarEvent.id })
    .eq('id', taskId);

  return new Response(JSON.stringify({ success: true, eventId: calendarEvent.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function syncCalendarToTask(supabase: any, userId: string, accessToken: string) {
  // Fetch recent calendar events
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${oneMonthAgo.toISOString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.statusText}`);
  }

  const { items } = await response.json();

  // Sync each event to a task
  for (const event of items) {
    // Check if task already exists for this event
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('google_calendar_event_id', event.id)
      .single();

    if (!existing) {
      // Create new task
      await supabase.from('tasks').insert({
        user_id: userId,
        title: event.summary,
        notes: event.description || '',
        start_date: event.start.dateTime || event.start.date,
        due_date: event.end.dateTime || event.end.date,
        google_calendar_event_id: event.id,
        completed: false,
        priority: 'none',
        notes_format: 'html',
        position: 0,
      });
    }
  }

  return new Response(JSON.stringify({ success: true, synced: items.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getCalendars(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.statusText}`);
  }

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
