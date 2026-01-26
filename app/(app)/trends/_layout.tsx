import { Stack } from 'expo-router';
import { COLORS } from '../../../src/constants';

export default function TrendsLayout() {
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
          title: 'Trends',
        }}
      />
      <Stack.Screen
        name="budgets"
        options={{
          title: 'Budgets',
        }}
      />
      <Stack.Screen
        name="goals"
        options={{
          title: 'Goals',
        }}
      />
    </Stack>
  );
}
