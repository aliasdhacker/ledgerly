import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NotificationService } from '../../src/services/NotificationService';
import { DatabaseService } from '../../src/services/DatabaseService';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useSyncContext } from '../../src/contexts/SyncContext';

export default function SettingsScreen() {
  const { user, signOut, isLoading: authLoading } = useAuthContext();
  const { status: syncStatus, lastSyncedAt, pendingChanges, sync } = useSyncContext();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = () => {
    const enabled = NotificationService.isDailyReminderEnabled();
    setReminderEnabled(enabled);

    const { hour, minute } = NotificationService.getReminderTime();
    const time = new Date();
    time.setHours(hour, minute, 0, 0);
    setReminderTime(time);
  };

  const handleToggleReminder = async (value: boolean) => {
    setReminderEnabled(value);

    if (value) {
      const granted = await NotificationService.requestPermissions();
      if (!granted) {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in your device settings to receive daily reminders.',
          [{ text: 'OK' }]
        );
        setReminderEnabled(false);
        return;
      }

      const hour = reminderTime.getHours();
      const minute = reminderTime.getMinutes();
      await NotificationService.scheduleDailyReminder(hour, minute);

      Alert.alert(
        'Reminder Set',
        `You'll receive a daily reminder at ${formatTime(hour, minute)}`,
        [{ text: 'OK' }]
      );
    } else {
      await NotificationService.cancelDailyReminder();
    }
  };

  const handleTimeChange = async (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');

    if (selectedTime) {
      setReminderTime(selectedTime);

      if (reminderEnabled) {
        const hour = selectedTime.getHours();
        const minute = selectedTime.getMinutes();
        await NotificationService.scheduleDailyReminder(hour, minute);
      }
    }
  };

  const formatTime = (hour: number, minute: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${ampm}`;
  };

  const formatLastSynced = (isoDate: string | null): string => {
    if (!isoDate) return 'Never';
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const handleTestNotification = async () => {
    const granted = await NotificationService.requestPermissions();
    if (!granted) {
      Alert.alert('Error', 'Notification permissions not granted');
      return;
    }

    const { scheduleNotificationAsync, SchedulableTriggerInputTypes } = await import('expo-notifications');
    await scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'This is a test notification from Driftmoney!',
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });

    Alert.alert('Test Sent', 'You should receive a notification in 2 seconds');
  };

  const handleSyncNow = async () => {
    const result = await sync();
    if (result.success) {
      Alert.alert('Sync Complete', 'Your data has been synced successfully.');
    } else {
      Alert.alert('Sync Failed', result.error || 'Unable to sync data.');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            const result = await signOut();
            setIsSigningOut(false);
            if (result.error) {
              Alert.alert('Error', result.error);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'Are you sure you want to delete ALL data? This will permanently remove all bills, debts, transactions, and account information. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This is your last chance. All your financial data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'DELETE ALL',
                  style: 'destructive',
                  onPress: () => {
                    DatabaseService.deleteAllData();
                    Alert.alert('Data Deleted', 'All data has been permanently deleted.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const getSyncStatusText = (): string => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'success':
        return 'Synced';
      case 'error':
        return 'Sync failed';
      default:
        return pendingChanges > 0 ? `${pendingChanges} pending` : 'Up to date';
    }
  };

  const getSyncStatusColor = (): string => {
    switch (syncStatus) {
      case 'syncing':
        return '#007AFF';
      case 'success':
        return '#34C759';
      case 'error':
        return '#FF3B30';
      default:
        return pendingChanges > 0 ? '#FF9500' : '#34C759';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        {user && (
          <View style={styles.accountInfo}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.accountDetails}>
              {user.name && <Text style={styles.userName}>{user.name}</Text>}
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={isSigningOut || authLoading}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#FF3B30" />
          ) : (
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Sync Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cloud Sync</Text>

        <View style={styles.syncStatusRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Status</Text>
            <View style={styles.syncStatusContainer}>
              <View style={[styles.syncStatusDot, { backgroundColor: getSyncStatusColor() }]} />
              <Text style={[styles.syncStatusText, { color: getSyncStatusColor() }]}>
                {getSyncStatusText()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Last Synced</Text>
          <Text style={styles.aboutValue}>{formatLastSynced(lastSyncedAt)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.syncButton, syncStatus === 'syncing' && styles.syncButtonDisabled]}
          onPress={handleSyncNow}
          disabled={syncStatus === 'syncing'}
        >
          {syncStatus === 'syncing' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.syncButtonText}>Sync Now</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Daily Reminder</Text>
            <Text style={styles.settingDescription}>
              Get a daily notification about upcoming bills
            </Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={handleToggleReminder}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {reminderEnabled && (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Reminder Time</Text>
              <Text style={styles.settingDescription}>
                {formatTime(reminderTime.getHours(), reminderTime.getMinutes())}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.timeButtonText}>Change</Text>
            </TouchableOpacity>
          </View>
        )}

        {showTimePicker && (
          <DateTimePicker
            value={reminderTime}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}

        <TouchableOpacity
          style={styles.testButton}
          onPress={handleTestNotification}
        >
          <Text style={styles.testButtonText}>Send Test Notification</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Package</Text>
          <Text style={styles.aboutValue}>com.driftmoney.acarr</Text>
        </View>
      </View>

      <View style={styles.dangerSection}>
        <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAllData}
        >
          <Text style={styles.deleteButtonText}>DELETE ALL DATA</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  accountDetails: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  signOutButton: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  syncStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  syncStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  syncStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  syncStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  syncButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#A0C4FF',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  timeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#F2F2F7',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  aboutLabel: {
    fontSize: 16,
    color: '#000000',
  },
  aboutValue: {
    fontSize: 16,
    color: '#8E8E93',
  },
  dangerSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 40,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  dangerSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
