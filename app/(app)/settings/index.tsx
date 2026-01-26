import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NotificationService } from '../../../src/services/NotificationService';
import { deleteAllData } from '../../../src/db';
import { useAuthContext } from '../../../src/contexts/AuthContext';
import { useSyncContext } from '../../../src/contexts/SyncContext';
import { COLORS, Typography, Spacing, BorderRadius } from '../../../src/constants';

export default function SettingsScreen() {
  const router = useRouter();
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
      'Are you sure you want to delete ALL data? This will permanently remove all accounts, transactions, and bills. This action cannot be undone.',
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
                    deleteAllData();
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
        return COLORS.primary;
      case 'success':
        return COLORS.success;
      case 'error':
        return COLORS.error;
      default:
        return pendingChanges > 0 ? COLORS.warning : COLORS.success;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

        <Pressable
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={isSigningOut || authLoading}
        >
          {isSigningOut ? (
            <ActivityIndicator color={COLORS.error} />
          ) : (
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          )}
        </Pressable>
      </View>

      {/* Sync Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cloud Sync</Text>

        <View style={styles.settingRow}>
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

        <Pressable
          style={[styles.syncButton, syncStatus === 'syncing' && styles.syncButtonDisabled]}
          onPress={handleSyncNow}
          disabled={syncStatus === 'syncing'}
        >
          {syncStatus === 'syncing' ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.syncButtonText}>Sync Now</Text>
          )}
        </Pressable>
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>

        <Pressable style={styles.menuItem} onPress={() => router.push('/settings/import')}>
          <View style={styles.menuItemContent}>
            <Ionicons name="download-outline" size={20} color={COLORS.primary} />
            <Text style={styles.menuItemText}>Import Statement</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </Pressable>

        <Pressable style={styles.menuItem} onPress={() => router.push('/settings/export')}>
          <View style={styles.menuItemContent}>
            <Ionicons name="share-outline" size={20} color={COLORS.primary} />
            <Text style={styles.menuItemText}>Export Data</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </Pressable>
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
            trackColor={{ false: COLORS.gray300, true: COLORS.success }}
            thumbColor={COLORS.white}
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
            <Pressable style={styles.timeButton} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.timeButtonText}>Change</Text>
            </Pressable>
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
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>2.0.0</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Package</Text>
          <Text style={styles.aboutValue}>com.driftmoney.acarr</Text>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.dangerSection}>
        <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
        <Pressable style={styles.deleteButton} onPress={handleDeleteAllData}>
          <Text style={styles.deleteButtonText}>DELETE ALL DATA</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: Spacing.xxxl,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.lg,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '600',
  },
  accountDetails: {
    marginLeft: Spacing.lg,
    flex: 1,
  },
  userName: {
    ...Typography.bodyBold,
  },
  userEmail: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  signOutButton: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: 'center',
  },
  signOutButtonText: {
    ...Typography.bodyBold,
    color: COLORS.error,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  settingLabel: {
    ...Typography.body,
  },
  settingDescription: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  syncStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  syncStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  syncStatusText: {
    ...Typography.footnote,
    fontWeight: '500',
  },
  syncButton: {
    backgroundColor: COLORS.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: COLORS.primary + '80',
  },
  syncButtonText: {
    ...Typography.bodyBold,
    color: COLORS.white,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuItemText: {
    ...Typography.body,
  },
  timeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  timeButtonText: {
    ...Typography.footnote,
    color: COLORS.white,
    fontWeight: '600',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  aboutLabel: {
    ...Typography.body,
  },
  aboutValue: {
    ...Typography.body,
    color: COLORS.textSecondary,
  },
  dangerSection: {
    backgroundColor: COLORS.surface,
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  dangerSectionTitle: {
    ...Typography.title3,
    color: COLORS.error,
    marginBottom: Spacing.lg,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  deleteButtonText: {
    ...Typography.bodyBold,
    color: COLORS.white,
    letterSpacing: 1,
  },
});
