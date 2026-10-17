# Push Notifications Setup Guide

Complete guide for setting up push notifications in your Expo app using Expo's push notification service.

**Official Docs:**
- [Expo Push Notifications Overview](https://docs.expo.dev/push-notifications/overview/)
- [Expo Notifications API](https://docs.expo.dev/versions/latest/sdk/notifications/)

---

## How Expo Push Works

```
Your App → Gets Push Token → Sends to Your Server → Server calls Expo API → Expo sends to APNs/FCM → Device
```

Expo handles the complexity of APNs (iOS) and FCM (Android) for you.

---

## Step 1: Install Dependencies

```bash
npx expo install expo-notifications expo-device expo-constants
```

---

## Step 2: Configure app.json

Add notification configuration:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "defaultChannel": "default",
          "sounds": ["./assets/sounds/notification.wav"]
        }
      ]
    ],
    "android": {
      "useNextNotificationsApi": true
    },
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    }
  }
}
```

### Notification Icon (Android)
- Create `assets/notification-icon.png`
- Must be 96x96 pixels
- White icon on transparent background
- Only white pixels will show (colored by system)

---

## Step 3: Create Notification Service

Create `lib/services/notifications.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushToken {
  token: string;
  type: 'expo' | 'fcm' | 'apns';
}

export const notificationService = {
  /**
   * Register for push notifications and get token
   */
  async registerForPushNotifications(): Promise<PushToken | null> {
    // Must be a physical device
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Get Expo push token
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      // Android: Create notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return {
        token: tokenData.data,
        type: 'expo',
      };
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  },

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: trigger || null, // null = immediate
    });
  },

  /**
   * Schedule notification for specific time
   */
  async scheduleNotificationAt(
    title: string,
    body: string,
    date: Date,
    data?: Record<string, any>
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
  },

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  },

  /**
   * Set badge count (iOS)
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  },

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  },
};
```

---

## Step 4: Create Notification Hook

Create `lib/hooks/useNotifications.ts`:

```typescript
import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationService, PushToken } from '@/lib/services/notifications';

interface UseNotificationsResult {
  pushToken: PushToken | null;
  notification: Notifications.Notification | null;
  error: Error | null;
  requestPermission: () => Promise<PushToken | null>;
}

export function useNotifications(): UseNotificationsResult {
  const [pushToken, setPushToken] = useState<PushToken | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Register and get token
    notificationService
      .registerForPushNotifications()
      .then(setPushToken)
      .catch(setError);

    // Listen for incoming notifications (app in foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
        console.log('Notification received:', notification);
      }
    );

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log('Notification tapped:', data);

        // Handle navigation based on notification data
        handleNotificationTap(data);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const requestPermission = async () => {
    try {
      const token = await notificationService.registerForPushNotifications();
      setPushToken(token);
      return token;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  };

  return { pushToken, notification, error, requestPermission };
}

// Handle navigation when notification is tapped
function handleNotificationTap(data: Record<string, any>) {
  // Example: Navigate to specific screen based on notification type
  if (data.screen) {
    // Use your router to navigate
    // router.push(data.screen);
  }
}
```

---

## Step 5: Save Token to Backend

When you get a push token, save it to your backend (Supabase):

### 5.1 Create Supabase Table
Run in Supabase SQL Editor:

```sql
create table public.push_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  token text not null,
  device_type text, -- 'ios' or 'android'
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, token)
);

alter table public.push_tokens enable row level security;

create policy "Users can manage own tokens"
  on public.push_tokens for all
  using (auth.uid() = user_id);
```

### 5.2 Save Token in App
```typescript
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

async function savePushToken(userId: string, token: string) {
  const { error } = await supabase
    .from('push_tokens')
    .upsert({
      user_id: userId,
      token: token,
      device_type: Platform.OS,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,token',
    });

  if (error) {
    console.error('Error saving push token:', error);
  }
}
```

---

## Step 6: Send Notifications from Server

### 6.1 Supabase Edge Function
Create a Supabase Edge Function to send notifications:

```typescript
// supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  const { userId, title, body, data } = await req.json();

  // Get user's push tokens from database
  const { data: tokens, error } = await supabaseAdmin
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId);

  if (error || !tokens?.length) {
    return new Response(JSON.stringify({ error: 'No tokens found' }), {
      status: 404,
    });
  }

  // Send to all user's devices
  const messages = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data,
    sound: 'default',
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const result = await response.json();

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### 6.2 Call from Your Backend
```typescript
// From any backend/serverless function
const response = await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'ExponentPushToken[xxxxxx]',
    title: 'New Message',
    body: 'You have a new message!',
    data: { screen: '/messages' },
  }),
});
```

---

## Step 7: Use in Your App

### 7.1 Initialize in Layout
```typescript
// app/_layout.tsx
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useAuth } from '@/lib/hooks';
import { useEffect } from 'react';

function RootLayout() {
  const { pushToken } = useNotifications();
  const { user } = useAuth();

  useEffect(() => {
    if (pushToken && user) {
      // Save token to backend
      savePushToken(user.id, pushToken.token);
    }
  }, [pushToken, user]);

  // ...
}
```

### 7.2 Schedule Local Notification
```typescript
import { notificationService } from '@/lib/services/notifications';

// Immediate notification
await notificationService.scheduleLocalNotification(
  'Reminder',
  'Don\'t forget to complete your daily goal!',
  { type: 'reminder' }
);

// Scheduled notification
await notificationService.scheduleNotificationAt(
  'Good morning!',
  'Start your day with a quick workout',
  new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
  { type: 'morning_reminder' }
);
```

---

## Step 8: Testing

### 8.1 Test on Physical Device
Push notifications don't work on simulators/emulators. Use:
- Physical iOS device
- Physical Android device
- Expo Go app (limited functionality)
- Development build (recommended)

### 8.2 Test with Expo Push Tool
1. Get your push token from the app console logs
2. Go to [expo.dev/notifications](https://expo.dev/notifications)
3. Enter your token and message
4. Click **Send**

### 8.3 Test Local Notifications
```typescript
// Add a test button in dev
<Button
  title="Test Notification"
  onPress={() => {
    notificationService.scheduleLocalNotification(
      'Test',
      'This is a test notification',
      { test: true }
    );
  }}
/>
```

---

## Android Notification Channels

For Android 8.0+, create channels for different notification types:

```typescript
import * as Notifications from 'expo-notifications';

// Create channels on app start
async function createNotificationChannels() {
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'message.wav',
    vibrationPattern: [0, 250, 250, 250],
  });

  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'reminder.wav',
  });

  await Notifications.setNotificationChannelAsync('marketing', {
    name: 'Promotions',
    importance: Notifications.AndroidImportance.LOW,
  });
}
```

---

## Common Issues & Solutions

### Token is null
- Must be physical device, not simulator
- Check permissions are granted
- Verify EAS project ID in Constants

### Notifications not received
- Check device is online
- Verify token format (`ExponentPushToken[...]`)
- Check Expo push receipts for errors

### iOS: Permission dialog not showing
- Already answered (check Settings)
- Add `expo-notifications` to app.json plugins
- Rebuild the app

### Android: Notifications not showing
- Check notification channel exists
- Verify channel importance is not NONE
- Check app notification settings in device settings

---

## Checklist

- [ ] Installed `expo-notifications`, `expo-device`, `expo-constants`
- [ ] Added plugin configuration to `app.json`
- [ ] Created notification service
- [ ] Created push token registration
- [ ] Set up notification listeners
- [ ] Created Supabase table for tokens
- [ ] Saving tokens to backend on login
- [ ] Created server-side send function
- [ ] Tested on physical device
- [ ] Created Android notification channels

---

## Next Steps

Your notifications are now set up! Consider:
- Rich notifications with images
- Notification actions (buttons)
- Deep linking from notifications
- Notification scheduling for reminders
- Analytics for notification engagement
