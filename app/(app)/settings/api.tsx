import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Typography, Spacing, BorderRadius, CommonStyles } from '../../../src/constants';
import { CredentialService } from '../../../src/services/CredentialService';
import { OCRService } from '../../../src/services/OCRService';
import { AIService } from '../../../src/services/v2';

export default function ApiSettingsScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [aiStatus, setAiStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');

  useEffect(() => {
    checkExistingCredentials();
  }, []);

  const checkExistingCredentials = async () => {
    const has = await CredentialService.hasCredentials();
    setHasCredentials(has);
    if (has) {
      const creds = await CredentialService.getCredentials();
      if (creds) {
        setUsername(creds.username);
        setPassword('••••••••'); // Don't show actual password
      }
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    if (!password.trim() || (hasCredentials && password === '••••••••')) {
      // Keep existing password if not changed
      if (!hasCredentials) {
        Alert.alert('Error', 'Please enter a password');
        return;
      }
    }

    setSaving(true);
    try {
      // Only save if password was changed
      if (password !== '••••••••') {
        await CredentialService.setCredentials(username.trim(), password);
      }
      setHasCredentials(true);
      Alert.alert('Success', 'API credentials saved securely');
    } catch (error) {
      Alert.alert('Error', 'Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setOcrStatus('unknown');
    setAiStatus('unknown');

    try {
      // Test OCR
      const ocrHealth = await OCRService.checkHealth();
      setOcrStatus(ocrHealth ? 'ok' : 'error');

      // Test AI
      const aiHealth = await AIService.checkHealth();
      setAiStatus(aiHealth.available ? 'ok' : 'error');

      if (ocrHealth && aiHealth.available) {
        Alert.alert('Success', 'Both services are connected and responding');
      } else {
        const issues = [];
        if (!ocrHealth) issues.push('OCR Pipeline');
        if (!aiHealth.available) issues.push(`AI Service${aiHealth.error ? `: ${aiHealth.error}` : ''}`);
        Alert.alert('Connection Issues', `Failed to connect to: ${issues.join(', ')}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleClearCredentials = () => {
    Alert.alert(
      'Clear Credentials',
      'Are you sure you want to remove saved API credentials?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await CredentialService.clearCredentials();
            setUsername('');
            setPassword('');
            setHasCredentials(false);
            setOcrStatus('unknown');
            setAiStatus('unknown');
          },
        },
      ]
    );
  };

  const StatusIcon = ({ status }: { status: 'unknown' | 'ok' | 'error' }) => {
    if (status === 'unknown') return null;
    return (
      <Ionicons
        name={status === 'ok' ? 'checkmark-circle' : 'close-circle'}
        size={20}
        color={status === 'ok' ? COLORS.success : COLORS.error}
        style={{ marginLeft: Spacing.sm }}
      />
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'API Settings' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Configure credentials for the OCR pipeline and AI services. These are stored securely on your device.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credentials</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={COLORS.gray400}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={COLORS.gray400}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={COLORS.gray500}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Save Credentials</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>OCR Pipeline (api.acarr.org)</Text>
            <StatusIcon status={ocrStatus} />
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>AI Service (ollama.acarr.org)</Text>
            <StatusIcon status={aiStatus} />
          </View>

          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={handleTestConnection}
            disabled={testing || !hasCredentials}
          >
            {testing ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <>
                <Ionicons name="wifi" size={18} color={COLORS.primary} />
                <Text style={styles.secondaryButtonText}>Test Connection</Text>
              </>
            )}
          </Pressable>
        </View>

        {hasCredentials && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>
            <Pressable
              style={[styles.button, styles.dangerButton]}
              onPress={handleClearCredentials}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              <Text style={styles.dangerButtonText}>Clear Saved Credentials</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: Spacing.lg,
  },
  description: {
    ...Typography.body,
    color: COLORS.gray600,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.caption,
    color: COLORS.gray600,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
    color: COLORS.gray900,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: Spacing.md,
    padding: Spacing.xs,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    marginTop: Spacing.md,
  },
  primaryButtonText: {
    ...Typography.body,
    color: COLORS.white,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginTop: Spacing.md,
  },
  secondaryButtonText: {
    ...Typography.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  dangerButtonText: {
    ...Typography.body,
    color: COLORS.error,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusLabel: {
    ...Typography.body,
    color: COLORS.gray700,
  },
});
