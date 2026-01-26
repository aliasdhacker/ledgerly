import { Stack } from 'expo-router';
import { COLORS } from '../../../src/constants';

export default function AccountsLayout() {
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
          title: 'Accounts',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Account Details',
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Account',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="transfer"
        options={{
          title: 'Transfer',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
