import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;

  async requestPermission(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Notification permission error:', error);
      return false;
    }
  }

  async getExpoPushToken(): Promise<string | null> {
    if (this.expoPushToken) return this.expoPushToken;

    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) return null;

      // Get project ID from app config
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = tokenData.data;
      return this.expoPushToken;
    } catch (error) {
      console.error('Get push token error:', error);
      return null;
    }
  }

  async scheduleLocal(
    content: Notifications.NotificationContentInput,
    trigger: Notifications.NotificationTriggerInput
  ): Promise<string> {
    return Notifications.scheduleNotificationAsync({ content, trigger });
  }

  async cancelScheduled(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllScheduled(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getBadgeCount(): Promise<number> {
    return Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  // Subscribe to notification events
  onNotificationReceived(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  onNotificationResponse(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Android channel setup
  async setupAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    await Notifications.setNotificationChannelAsync('task-reminders', {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B5CF6',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('due-soon', {
      name: 'Tasks Due Soon',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F59E0B',
    });

    await Notifications.setNotificationChannelAsync('overdue', {
      name: 'Overdue Tasks',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#EF4444',
      sound: 'default',
    });
  }

  // Task-specific notification methods
  async scheduleTaskReminder(
    taskId: string,
    taskTitle: string,
    dueDate: Date,
    minutesBefore: number = 0
  ): Promise<string | null> {
    try {
      const reminderTime = new Date(dueDate.getTime() - minutesBefore * 60 * 1000);
      const now = new Date();

      if (reminderTime <= now) return null;

      const identifier = await this.scheduleLocal(
        {
          title: minutesBefore > 0 ? `⏰ Reminder: ${taskTitle}` : `📌 Task Due: ${taskTitle}`,
          body: minutesBefore > 0 ? `Due in ${minutesBefore} minutes` : 'Due now',
          data: {
            taskId,
            type: minutesBefore > 0 ? 'reminder' : 'due',
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        reminderTime
      );

      return identifier;
    } catch (error) {
      console.error('Error scheduling task reminder:', error);
      return null;
    }
  }

  async cancelTaskNotifications(taskId: string): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const taskNotifications = scheduled.filter(
        (notif) => notif.content.data?.taskId === taskId
      );

      for (const notif of taskNotifications) {
        await this.cancelScheduled(notif.identifier);
      }
    } catch (error) {
      console.error('Error canceling task notifications:', error);
    }
  }

  async scheduleDailySummary(hour: number = 9, minute: number = 0): Promise<string | null> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const existing = scheduled.find(notif => notif.content.data?.type === 'daily-summary');
      if (existing) {
        await this.cancelScheduled(existing.identifier);
      }

      const identifier = await this.scheduleLocal(
        {
          title: '📋 Daily Summary',
          body: 'Tap to see your tasks for today',
          data: { type: 'daily-summary' },
          sound: 'default',
        },
        {
          hour,
          minute,
          repeats: true,
        }
      );

      return identifier;
    } catch (error) {
      console.error('Error scheduling daily summary:', error);
      return null;
    }
  }
}

export const notificationService = new NotificationService();
