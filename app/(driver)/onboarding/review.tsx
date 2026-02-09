import { View, Text, StyleSheet } from 'react-native';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

export default function ReviewScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Documents Under Review</Text>
      <Text style={styles.text}>
        Your driver information is being reviewed.
        This usually takes 24–48 hours.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.m,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.rounded,
    marginBottom: SPACING.m,
  },
  text: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
