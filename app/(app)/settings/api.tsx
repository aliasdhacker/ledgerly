import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Typography, Spacing, BorderRadius } from '../../../src/constants';
import { CredentialService } from '../../../src/services/CredentialService';
import { OCRService } from '../../../src/services/OCRService';
import { AIService } from '../../../src/services/v2';

export default function ApiSettingsScreen() {
  const [testing, setTesting] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [aiStatus, setAiStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');

  const hasCredentials = CredentialService.hasCredentials();

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
          Service credentials are configured at build time. Use the button below to test connectivity to the backend services.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Credentials</Text>
            <View style={styles.configValue}>
              <Ionicons
                name={hasCredentials ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={hasCredentials ? COLORS.success : COLORS.error}
              />
              <Text style={[styles.configText, { color: hasCredentials ? COLORS.success : COLORS.error }]}>
                {hasCredentials ? 'Configured' : 'Not configured'}
              </Text>
            </View>
          </View>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>OCR Endpoint</Text>
            <Text style={styles.configText}>{CredentialService.getOCREndpoint()}</Text>
          </View>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>AI Endpoint</Text>
            <Text style={styles.configText}>{CredentialService.getAIEndpoint()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>OCR Pipeline</Text>
            <StatusIcon status={ocrStatus} />
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>AI Service</Text>
            <StatusIcon status={aiStatus} />
          </View>

          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleTestConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="wifi" size={18} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>Test Connection</Text>
              </>
            )}
          </Pressable>
        </View>

        {!hasCredentials && (
          <View style={styles.warningSection}>
            <Ionicons name="warning" size={24} color={COLORS.warning} />
            <Text style={styles.warningText}>
              API credentials are not configured. The app needs to be rebuilt with the correct environment variables.
            </Text>
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
    color: COLORS.textSecondary,
    marginBottom: Spacing.xl,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  configLabel: {
    ...Typography.body,
    color: COLORS.textSecondary,
  },
  configValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  configText: {
    ...Typography.body,
    color: COLORS.textPrimary,
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
    color: COLORS.textPrimary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    ...Typography.body,
    color: COLORS.white,
    fontWeight: '600',
  },
  warningSection: {
    backgroundColor: COLORS.warning + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  warningText: {
    ...Typography.body,
    color: COLORS.warning,
    flex: 1,
  },
});
