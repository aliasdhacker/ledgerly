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
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NotificationService } from '../src/services/NotificationService';

export default function SettingsScreen() {
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

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

  const handleTestNotification = async () => {
    const granted = await NotificationService.requestPermissions();
    if (!granted) {
      Alert.alert('Error', 'Notification permissions not granted');
      return;
    }

    // Send a test notification immediately
    const { scheduleNotificationAsync, SchedulableTriggerInputTypes } = await import('expo-notifications');
    await scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'This is a test notification from Ledgerly!',
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });

    Alert.alert('Test Sent', 'You should receive a notification in 2 seconds');
  };

  return (
    <ScrollView style={styles.container}>
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
          <Text style={styles.aboutValue}>com.ledgerly.mobile</Text>
        </View>
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
});
