import { COLORS, Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  onOpenSettings: () => void;
  onContinueWithout: () => void;
};

export default function LocationDeniedScreen({ onOpenSettings, onContinueWithout }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      {/* Icon */}
      <View style={styles.iconWrapper}>
        <View style={styles.iconOuter}>
          <Ionicons name="location-outline" size={42} color="#EF4444" />
        </View>
        <View style={[styles.badge]}>
          <Ionicons name="close" size={14} color={COLORS.white} />
        </View>
      </View>

      <Text style={styles.title}>Location access denied</Text>
      <Text style={styles.subtitle}>
        Without location access, eDrive can't show nearby drivers or calculate your route. You can enable it in your device settings.
      </Text>

      {/* Steps card */}
      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>How to enable</Text>
        {Platform.OS === 'ios' ? (
          <>
            <StepRow n={1} text="Open Settings on your iPhone" />
            <StepRow n={2} text='Scroll down and tap "eDrive"' />
            <StepRow n={3} text='Tap "Location" → While Using the App' />
          </>
        ) : (
          <>
            <StepRow n={1} text="Open Settings on your phone" />
            <StepRow n={2} text='Tap "Apps" → eDrive → Permissions' />
            <StepRow n={3} text='Tap "Location" → Allow' />
          </>
        )}
      </View>

      {/* Buttons */}
      <TouchableOpacity style={styles.primaryBtn} onPress={onOpenSettings} activeOpacity={0.85}>
        <Ionicons name="settings-outline" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
        <Text style={styles.primaryBtnText}>Open Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={onContinueWithout} activeOpacity={0.7}>
        <Text style={styles.secondaryBtnText}>Continue without location</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Some features like driver tracking and route display will be limited.
      </Text>
    </View>
  );
}

function StepRow({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // Icon
  iconWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  iconOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  // Text
  title: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: COLORS.text,
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.rounded,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },

  // Steps
  stepsCard: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  stepsTitle: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: COLORS.white,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.rounded,
    color: COLORS.text,
    lineHeight: 20,
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 14,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: Fonts.semibold,
    fontWeight: '600',
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: Fonts.rounded,
    color: COLORS.text,
  },
  note: {
    fontSize: 12,
    fontFamily: Fonts.rounded,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
});
