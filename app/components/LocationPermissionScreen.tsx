import { COLORS, Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  onAllow: () => Promise<void>;
  onSkip: () => void;
  isRequesting: boolean;
};

export default function LocationPermissionScreen({ onAllow, onSkip, isRequesting }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      {/* Icon badge */}
      <View style={styles.iconWrapper}>
        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <Ionicons name="location" size={42} color={COLORS.white} />
          </View>
        </View>
        {/* Pulse rings */}
        <View style={[styles.ring, styles.ring1]} />
        <View style={[styles.ring, styles.ring2]} />
      </View>

      {/* Text */}
      <Text style={styles.title}>Allow location access</Text>
      <Text style={styles.subtitle}>
        eDrive uses your location to show nearby drivers, calculate routes, and get you to your destination faster.
      </Text>

      {/* Feature bullets */}
      <View style={styles.bullets}>
        <BulletRow icon="car-sport" text="See drivers near you in real-time" />
        <BulletRow icon="navigate" text="Get accurate pickup & drop-off routing" />
        <BulletRow icon="shield-checkmark" text="Safety tracking for your trip" />
      </View>

      {/* Privacy note */}
      <View style={styles.privacyRow}>
        <Ionicons name="lock-closed-outline" size={13} color={COLORS.textSecondary} />
        <Text style={styles.privacyText}>
          Only used while you're in the app. Never shared without consent.
        </Text>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.btn, isRequesting && styles.btnDisabled]}
        onPress={onAllow}
        activeOpacity={0.85}
        disabled={isRequesting}
      >
        {isRequesting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <>
            <Ionicons name="location" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>Enable Location</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={onSkip} style={styles.skipBtn} activeOpacity={0.6}>
        <Text style={styles.skipText}>Not now</Text>
      </TouchableOpacity>
    </View>
  );
}

function BulletRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletIcon}>
        <Ionicons name={icon} size={16} color={COLORS.primary} />
      </View>
      <Text style={styles.bulletText}>{text}</Text>
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
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  iconOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 2,
  },
  iconInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  ring1: {
    width: 112,
    height: 112,
    opacity: 0.25,
  },
  ring2: {
    width: 136,
    height: 136,
    opacity: 0.12,
  },

  // Text
  title: {
    fontSize: 27,
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
    marginBottom: 32,
  },

  // Bullets
  bullets: {
    width: '100%',
    backgroundColor: '#F7FAF8',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E6F0EA',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bulletIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EAF4EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.rounded,
    color: COLORS.text,
  },

  // Privacy
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
  },
  privacyText: {
    fontSize: 12,
    fontFamily: Fonts.rounded,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 17,
  },

  // Buttons
  btn: {
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
    marginBottom: 16,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: Fonts.semibold,
    fontWeight: '600',
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 14,
    fontFamily: Fonts.rounded,
    color: COLORS.textSecondary,
  },
});
