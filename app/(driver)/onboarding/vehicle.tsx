import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, Fonts } from '@/constants/theme';

export default function VehicleInfoScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vehicle Information</Text>

      <TextInput style={styles.input} placeholder="Vehicle Make" />
      <TextInput style={styles.input} placeholder="Vehicle Model" />
      <TextInput style={styles.input} placeholder="Vehicle Year" keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Plate Number" />

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(driver)/onboarding/documents')}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.m },
  title: {
    fontSize: 22,
    fontFamily: Fonts.rounded,
    marginBottom: SPACING.l,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.m,
    marginBottom: SPACING.m,
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
    fontFamily: Fonts.rounded,
    fontWeight: '600',
  },
});
