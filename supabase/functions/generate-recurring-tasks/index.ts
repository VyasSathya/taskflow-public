/**
 * Generate Recurring Tasks Edge Function
 * Runs daily at midnight to create instances of recurring tasks
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  days?: number[]; // 0 = Sunday, 6 = Saturday
  time?: string; // HH:mm format
}

interface RecurringTask {
  id: string;
  user_id: string;
  title: string;
  notes?: string;
  priority: string;
  duration_minutes?: number;
  due_date?: string;
  recurrence_pattern: RecurrencePattern;
  recurrence_end_date?: string;
  tags?: any[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all active recurring tasks
    const { data: recurringTasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('is_recurring', true)
      .eq('completed', false);

    if (tasksError) {
      throw tasksError;
    }

    if (!recurringTasks || recurringTasks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recurring tasks found', count: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Found ${recurringTasks.length} recurring tasks`);

    let generatedCount = 0;

    for (const task of recurringTasks as RecurringTask[]) {
      // Skip if past end date
      if (task.recurrence_end_date && new Date(task.recurrence_end_date) < now) {
        console.log(`Task ${task.id} past recurrence end date, skipping`);
        continue;
      }

      const pattern = task.recurrence_pattern;
      if (!pattern) {
        console.log(`Task ${task.id} has no recurrence pattern, skipping`);
        continue;
      }

      // Calculate next occurrence
      const nextOccurrence = calculateNextOccurrence(task.due_date ? new Date(task.due_date) : now, pattern);

      // Check if we need to create an instance for tomorrow
      if (isSameDay(nextOccurrence, tomorrow)) {
        // Check if instance already exists
        const { data: existingInstances } = await supabaseAdmin
          .from('tasks')
          .select('id')
          .eq('parent_recurring_task_id', task.id)
          .gte('due_date', tomorrow.toISOString().split('T')[0])
          .lt('due_date', new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        if (existingInstances && existingInstances.length > 0) {
          console.log(`Instance already exists for task ${task.id} on ${tomorrow.toISOString().split('T')[0]}`);
          continue;
        }

        // Create new task instance
        const newTask = {
          user_id: task.user_id,
          title: task.title,
          notes: task.notes,
          priority: task.priority,
          duration_minutes: task.duration_minutes,
          due_date: nextOccurrence.toISOString(),
          parent_recurring_task_id: task.id,
          completed: false,
          is_recurring: false, // Instances are not recurring themselves
        };

        const { error: insertError } = await supabaseAdmin.from('tasks').insert(newTask);

        if (insertError) {
          console.error(`Error creating instance for task ${task.id}:`, insertError);
          continue;
        }

        generatedCount++;
        console.log(`Created instance for task ${task.id} on ${nextOccurrence.toISOString()}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Recurring tasks processed',
        tasksProcessed: recurringTasks.length,
        instancesGenerated: generatedCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in generate-recurring-tasks function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Calculate next occurrence based on recurrence pattern
 */
function calculateNextOccurrence(baseDate: Date, pattern: RecurrencePattern): Date {
  const next = new Date(baseDate);

  switch (pattern.type) {
    case 'daily':
      next.setDate(next.getDate() + (pattern.interval || 1));
      break;

    case 'weekly': {
      // Add weeks
      next.setDate(next.getDate() + (pattern.interval || 1) * 7);

      // If specific days are set, find next matching day
      if (pattern.days && pattern.days.length > 0) {
        const currentDay = next.getDay();
        const sortedDays = [...pattern.days].sort((a, b) => a - b);

        // Find next matching day
        let found = false;
        for (const day of sortedDays) {
          if (day > currentDay) {
            next.setDate(next.getDate() + (day - currentDay));
            found = true;
            break;
          }
        }

        // If no matching day found this week, use first day of next interval
        if (!found) {
          const daysUntilNextWeek = 7 - currentDay + sortedDays[0];
          next.setDate(next.getDate() + daysUntilNextWeek);
        }
      }
      break;
    }

    case 'monthly':
      next.setMonth(next.getMonth() + (pattern.interval || 1));
      break;

    case 'yearly':
      next.setFullYear(next.getFullYear() + (pattern.interval || 1));
      break;
  }

  // Set time if specified
  if (pattern.time) {
    const [hours, minutes] = pattern.time.split(':').map(Number);
    next.setHours(hours, minutes, 0, 0);
  }

  return next;
}

/**
 * Check if two dates are on the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
