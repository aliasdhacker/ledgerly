import { Stack } from 'expo-router';
import { COLORS } from '../../../src/constants';

export default function PayablesLayout() {
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
          title: 'Payables',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Payable Details',
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Payable',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
