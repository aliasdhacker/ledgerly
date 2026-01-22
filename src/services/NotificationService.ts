import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DatabaseService } from './DatabaseService';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationService = {
  // Request permission for notifications
  requestPermissions: async (): Promise<boolean> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    // Required for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      await Notifications.setNotificationChannelAsync('daily-reminder', {
        name: 'Daily Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Daily bill reminders',
      });
    }

    return true;
  },

  // Schedule a daily reminder at a specific time
  scheduleDailyReminder: async (hour: number = 9, minute: number = 0): Promise<string | null> => {
    try {
      // Cancel existing daily reminders first
      await NotificationService.cancelDailyReminder();

      // Get upcoming bills count for the notification message
      const bills = DatabaseService.getBills();
      const unpaidBills = bills.filter(b => !b.isPaid);
      const unpaidCount = unpaidBills.length;
      const unpaidTotal = unpaidBills.reduce((sum, b) => sum + b.amount, 0);

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Ledgerly Daily Check-in',
          body: unpaidCount > 0
            ? `You have ${unpaidCount} upcoming bill${unpaidCount > 1 ? 's' : ''} totaling $${unpaidTotal.toFixed(2)}`
            : 'All bills are paid! Check your safe to spend.',
          data: { type: 'daily-reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });

      // Save reminder settings
      DatabaseService.setSetting('daily_reminder_enabled', 'true');
      DatabaseService.setSetting('daily_reminder_hour', hour.toString());
      DatabaseService.setSetting('daily_reminder_minute', minute.toString());
      DatabaseService.setSetting('daily_reminder_id', identifier);

      console.log(`Daily reminder scheduled for ${hour}:${minute.toString().padStart(2, '0')}`);
      return identifier;
    } catch (error) {
      console.error('Failed to schedule daily reminder:', error);
      return null;
    }
  },

  // Cancel the daily reminder
  cancelDailyReminder: async (): Promise<void> => {
    try {
      const existingId = DatabaseService.getSetting('daily_reminder_id');
      if (existingId) {
        await Notifications.cancelScheduledNotificationAsync(existingId);
      }
      DatabaseService.setSetting('daily_reminder_enabled', 'false');
      DatabaseService.setSetting('daily_reminder_id', '');
      console.log('Daily reminder cancelled');
    } catch (error) {
      console.error('Failed to cancel daily reminder:', error);
    }
  },

  // Check if daily reminder is enabled
  isDailyReminderEnabled: (): boolean => {
    return DatabaseService.getSetting('daily_reminder_enabled') === 'true';
  },

  // Get the scheduled reminder time
  getReminderTime: (): { hour: number; minute: number } => {
    const hour = parseInt(DatabaseService.getSetting('daily_reminder_hour') || '9', 10);
    const minute = parseInt(DatabaseService.getSetting('daily_reminder_minute') || '0', 10);
    return { hour, minute };
  },

  // Schedule a one-time bill due reminder
  scheduleBillReminder: async (billName: string, amount: number, dueDate: Date): Promise<string | null> => {
    try {
      // Schedule for 9 AM on the due date
      const triggerDate = new Date(dueDate);
      triggerDate.setHours(9, 0, 0, 0);

      // Don't schedule if the date has passed
      if (triggerDate <= new Date()) {
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Bill Due Today',
          body: `${billName} ($${amount.toFixed(2)}) is due today!`,
          data: { type: 'bill-due', billName },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      return identifier;
    } catch (error) {
      console.error('Failed to schedule bill reminder:', error);
      return null;
    }
  },

  // Cancel all scheduled notifications
  cancelAllNotifications: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    DatabaseService.setSetting('daily_reminder_enabled', 'false');
    DatabaseService.setSetting('daily_reminder_id', '');
  },

  // Get all scheduled notifications (for debugging)
  getScheduledNotifications: async () => {
    return await Notifications.getAllScheduledNotificationsAsync();
  },
};
