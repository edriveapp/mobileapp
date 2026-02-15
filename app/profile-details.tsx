import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/app/stores/authStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

export default function ProfileDetailsScreen() {
    const router = useRouter();
    const { user } = useAuthStore();

    if (!user) return null;

    const displayName = (user as any).firstName || user.name || 'User';
    const phone = (user as any).phone || user.phoneNumber || 'Not set';
    const memberSince = (user as any).createdAt
        ? new Date((user as any).createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long' })
        : 'Feb 2026';

    const InfoRow = ({ icon, label, value }: { icon: any; label: string; value: string }) => (
        <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
                <Ionicons name={icon} size={18} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Personal Information</Text>
                <View style={{ width: 32 }} />
            </View>

            {/* Profile Avatar */}
            <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.nameText}>{displayName}</Text>
                <View style={styles.roleBadge}>
                    <Ionicons name={user.role === 'driver' ? 'car' : 'person'} size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.roleText}>
                        {user.role === 'driver' ? 'Driver' : 'Passenger'}
                    </Text>
                </View>
            </View>

            {/* Info Card */}
            <View style={styles.card}>
                <InfoRow icon="person-outline" label="Full Name" value={displayName} />
                <View style={styles.divider} />
                <InfoRow icon="mail-outline" label="Email Address" value={user.email} />
                <View style={styles.divider} />
                <InfoRow icon="call-outline" label="Phone Number" value={phone} />
                <View style={styles.divider} />
                <InfoRow icon="shield-checkmark-outline" label="Account Type" value={user.role === 'driver' ? 'Driver' : 'Passenger'} />
                <View style={styles.divider} />
                <InfoRow icon="calendar-outline" label="Member Since" value={memberSince} />
            </View>

            {/* Verified Badge */}
            <View style={styles.verifiedContainer}>
                <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    <Text style={styles.verifiedText}>Phone number verified</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, fontFamily: Fonts.bold },

    // Avatar
    avatarSection: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.s,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    avatarText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
    },
    nameText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
        fontFamily: Fonts.bold,
        marginBottom: 6,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },

    // Info Card
    card: {
        backgroundColor: COLORS.white,
        marginHorizontal: SPACING.l,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    infoIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    infoContent: { flex: 1 },
    infoLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
        fontFamily: Fonts.rounded,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginLeft: 66,
    },

    // Verified
    verifiedContainer: {
        alignItems: 'center',
        marginTop: SPACING.xl,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
    },
    verifiedText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
        fontFamily: Fonts.rounded,
    },
});
