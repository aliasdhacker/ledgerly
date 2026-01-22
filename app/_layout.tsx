import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PostHogProvider } from 'posthog-react-native';
import { NotificationService } from '../src/services/NotificationService';
import { DatabaseService } from '../src/services/DatabaseService';

export default function Layout() {
  useEffect(() => {
    // Initialize database and request notification permissions on app start
    const initApp = async () => {
      DatabaseService.init();

      // Request notification permissions
      const granted = await NotificationService.requestPermissions();

      if (granted) {
        // If daily reminder was previously enabled, re-schedule it
        if (NotificationService.isDailyReminderEnabled()) {
          const { hour, minute } = NotificationService.getReminderTime();
          await NotificationService.scheduleDailyReminder(hour, minute);
        }
      }
    };

    initApp();
  }, []);

  return (
    <PostHogProvider
      apiKey="phc_S53mwouff8agLuQBAisjZZJU4fbjOBkizHVycrbQzxr"
      options={{
        host: 'https://us.i.posthog.com',
        enableSessionReplay: true,
      }}
      autocapture
    >
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          headerStyle: {
            backgroundColor: '#F2F2F7',
          },
          tabBarStyle: {
            backgroundColor: '#F2F2F7',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Draft',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calculator" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="bills"
          options={{
            title: 'Bills',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Add Bill',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="add-circle" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Transactions',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="swap-horizontal" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="income"
          options={{
            title: 'Income',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cash" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </PostHogProvider>
  );
}
