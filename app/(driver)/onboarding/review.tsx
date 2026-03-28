import { useDriverStore } from '@/app/stores/driverStore';
import { useAuthStore } from '@/app/stores/authStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUS_COPY: Record<'pending' | 'approved' | 'rejected', { title: string; message: string; color: string; bg: string }> = {
  pending: {
    title: 'Verification Pending',
    message: 'Your onboarding details were submitted and are waiting for manual review by our team.',
    color: '#B54708',
    bg: '#FFFAEB',
  },
  approved: {
    title: 'Verification Approved',
    message: 'Your profile has been approved. You can now accept and complete trips.',
    color: '#027A48',
    bg: '#ECFDF3',
  },
  rejected: {
    title: 'Verification Rejected',
    message: 'Some details could not be verified. Please contact support to resolve this quickly.',
    color: '#B42318',
    bg: '#FEF3F2',
  },
};

export default function ReviewScreen() {
  const router = useRouter();
  const driverStoreStatus = useDriverStore((state) => state.status);
  const userStatus = useAuthStore((state) => state.user?.verificationStatus);
  const status = (userStatus || driverStoreStatus || 'pending') as 'pending' | 'approved' | 'rejected';
  const copy = STATUS_COPY[status];

  const handleContactSupport = () => {
    router.push('/support');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
    <View style={styles.topBar}>
      <TouchableOpacity onPress={() => router.replace('/(driver)')} style={styles.closeBtn}>
        <Ionicons name="close" size={22} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: copy.bg }]}>
        <Text style={[styles.badgeText, { color: copy.color }]}>{status.toUpperCase()}</Text>
      </View>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.text}>{copy.message}</Text>

      <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
        <Text style={styles.supportButtonText}>Contact Support</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closePageButton} onPress={() => router.replace('/(driver)')}>
        <Text style={styles.closePageButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  topBar: {
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.s,
    alignItems: 'flex-end',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F4F7',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SPACING.m,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    marginBottom: SPACING.m,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.rounded,
    marginBottom: SPACING.m,
    color: COLORS.text,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  supportButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
  },
  supportButtonText: {
    color: COLORS.white,
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    fontSize: 15,
  },
  closePageButton: {
    marginTop: SPACING.s,
    borderRadius: 12,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  closePageButtonText: {
    color: COLORS.textSecondary,
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
});
