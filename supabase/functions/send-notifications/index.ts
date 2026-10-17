/**
 * Send Notifications Edge Function
 * Runs every minute to check for scheduled reminders and send push notifications
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskReminder {
  id: string;
  title: string;
  due_date: string;
  reminder_time: string;
  reminder_minutes_before: number;
  user_id: string;
}

interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key (has full access)
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
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Find tasks with reminders due in the next 5 minutes that haven't been sent yet
    const { data: tasksToRemind, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('id, title, due_date, reminder_time, reminder_minutes_before, user_id')
      .not('reminder_time', 'is', null)
      .eq('notification_sent', false)
      .lte('reminder_time', fiveMinutesFromNow.toISOString())
      .gte('reminder_time', now.toISOString());

    if (tasksError) {
      throw tasksError;
    }

    if (!tasksToRemind || tasksToRemind.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders to send', count: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Found ${tasksToRemind.length} tasks with reminders to send`);

    let sentCount = 0;

    // Process each task
    for (const task of tasksToRemind as TaskReminder[]) {
      // Get device tokens for this user
      const { data: deviceTokens, error: tokensError } = await supabaseAdmin
        .from('device_tokens')
        .select('*')
        .eq('user_id', task.user_id)
        .eq('active', true);

      if (tokensError) {
        console.error(`Error fetching device tokens for user ${task.user_id}:`, tokensError);
        continue;
      }

      if (!deviceTokens || deviceTokens.length === 0) {
        console.log(`No active device tokens for user ${task.user_id}`);
        // Still mark as sent even if no devices
        await supabaseAdmin
          .from('tasks')
          .update({ notification_sent: true })
          .eq('id', task.id);
        continue;
      }

      // Send notification to each device
      for (const device of deviceTokens as DeviceToken[]) {
        try {
          // For mobile (iOS/Android), you'd integrate with Expo Push Notifications or FCM here
          // For web, you'd use Web Push API

          // Example structure for Expo Push Notifications:
          // const message = {
          //   to: device.token,
          //   sound: 'default',
          //   title: 'Task Reminder',
          //   body: task.title,
          //   data: { taskId: task.id, type: 'reminder' },
          // };

          // For now, we'll just log and create a notification record
          console.log(`Would send notification to ${device.platform} device for task: ${task.title}`);

          // Insert notification record
          await supabaseAdmin.from('task_notifications').insert({
            task_id: task.id,
            user_id: task.user_id,
            type: 'reminder',
            title: 'Task Reminder',
            body: task.title,
            scheduled_for: task.reminder_time,
            sent_at: new Date().toISOString(),
            platform: device.platform,
          });

          sentCount++;
        } catch (error) {
          console.error(`Error sending notification to device ${device.id}:`, error);
        }
      }

      // Mark task notification as sent
      await supabaseAdmin
        .from('tasks')
        .update({ notification_sent: true })
        .eq('id', task.id);
    }

    return new Response(
      JSON.stringify({
        message: 'Notifications processed',
        tasksProcessed: tasksToRemind.length,
        notificationsSent: sentCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-notifications function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
