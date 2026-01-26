import { Stack } from 'expo-router';
import { COLORS } from '../../../src/constants';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerTintColor: COLORS.primary,
        contentStyle: {
          backgroundColor: COLORS.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="import"
        options={{
          title: 'Import',
        }}
      />
      <Stack.Screen
        name="export"
        options={{
          title: 'Export Data',
        }}
      />
    </Stack>
  );
}
