import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { PostHogProvider } from 'posthog-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuthContext } from '../src/contexts/AuthContext';
import { SyncProvider } from '../src/contexts/SyncContext';
import { NotificationService } from '../src/services/NotificationService';
import { initializeDatabase, hasLegacyData, migrateLegacyData } from '../src/db';

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Initialize database and request notification permissions on app start
    const initApp = async () => {
      // Initialize v2 database (runs migrations)
      initializeDatabase();

      // Migrate legacy data if present
      if (hasLegacyData()) {
        console.log('[App] Migrating legacy data to v2 schema...');
        migrateLegacyData();
      }

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

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated and not already in auth group
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to app if authenticated and still in auth group
      router.replace('/(app)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PostHogProvider
        apiKey="phc_S53mwouff8agLuQBAisjZZJU4fbjOBkizHVycrbQzxr"
        options={{
          host: 'https://us.i.posthog.com',
          enableSessionReplay: true,
        }}
        autocapture
      >
        <AuthProvider>
          <SyncProvider>
            <RootLayoutNav />
          </SyncProvider>
        </AuthProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
});
