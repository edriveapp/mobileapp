import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, Fonts } from '@/constants/theme';

export default function DocumentsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Documents</Text>

      <Text style={styles.text}>• Driver’s License</Text>
      <Text style={styles.text}>• Vehicle Photos</Text>
      <Text style={styles.text}>• Proof of Ownership</Text>

      {/* Later replace with image picker */}

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace('/(driver)/onboarding/review')}
      >
        <Text style={styles.buttonText}>Submit for Review</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.m },
  title: {
    fontSize: 22,
    fontFamily: Fonts.rounded,
    marginBottom: SPACING.m,
  },
  text: {
    fontSize: 14,
    marginBottom: SPACING.s,
    fontFamily: Fonts.rounded,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: SPACING.l,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontFamily: Fonts.rounded,
  },
});
