import { useDriverStore } from '@/app/stores/driverStore';
import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';

export default function DriverHome() {
  const hasCompletedOnboarding = useDriverStore((s) => s.hasCompletedOnboarding);

  // Redirect to onboarding if not completed
  if (!hasCompletedOnboarding) {
    return <Redirect href="/(driver)/onboarding" />;
  }

  return (
    <View>
      <Text>Driver Dashboard</Text>
    </View>
  );
}
