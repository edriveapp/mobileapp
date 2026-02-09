import { useAuthStore } from '@/app/stores/authStore';
import { useDriverStore } from '@/app/stores/driverStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DriverHome() {
    const router = useRouter();
    const { user } = useAuthStore();
    const hasCompletedOnboarding = useDriverStore((s) => s.hasCompletedOnboarding);

    // Redirect to onboarding if not completed
    if (!hasCompletedOnboarding) {
        return <Redirect href="/(driver)/onboarding" />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.nameText}>{user?.name} 🚗</Text>
                </View>
                <TouchableOpacity style={styles.profileButton}>
                    <IconSymbol name="person.crop.circle.fill" size={40} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Trips</Text>
                    <Text style={styles.statValue}>12</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Rating</Text>
                    <Text style={styles.statValue}>4.9 ★</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Earnings</Text>
                    <Text style={styles.statValue}>₦45k</Text>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Manage Your Business</Text>

                <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push('/(driver)/create-trip')}
                >
                    <View style={styles.cardIcon}>
                        <IconSymbol name="plus.circle.fill" size={24} color={COLORS.white} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>Create New Trip</Text>
                        <Text style={styles.cardDescription}>Schedule a new interstate trip</Text>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.card}>
                    <View style={[styles.cardIcon, { backgroundColor: '#34C759' }]}>
                        <IconSymbol name="list.bullet.rectangle.fill" size={24} color={COLORS.white} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>My Active Trips</Text>
                        <Text style={styles.cardDescription}>View and manage ongoing trips</Text>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.l,
        paddingTop: SPACING.m,
    },
    welcomeText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
    },
    nameText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        fontFamily: Fonts.rounded,
    },
    profileButton: {
        padding: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.l,
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    statBox: {
        backgroundColor: COLORS.white,
        padding: SPACING.m,
        borderRadius: 16,
        width: '30%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.l,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.m,
        fontFamily: Fonts.rounded,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.m,
        borderRadius: 16,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    cardDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
});
