import { useAuthStore } from '@/app/stores/authStore';
import { COLORS, SPACING } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        router.replace('/(auth)/login');
    };

    const ProfileItem = ({ label, value, icon }: { label: string, value: string, icon: string }) => (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.inputWrapper}>

                <Text style={styles.inputValue}>{value}</Text>
                {/* Icon could go here if needed */}
            </View>
        </View>
    );

    if (!user) return null;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Text>
                    </View>
                </View>

                <View style={styles.formContainer}>
                    <ProfileItem label="Full Name" value={user.name} icon="person" />
                    <ProfileItem label="Email Address" value={user.email} icon="envelope" />
                    <ProfileItem label="Role" value={user.role === 'driver' ? 'Driver Account' : 'Rider Account'} icon="person.badge.key" />
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>

                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>Version 1.0.0</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        backgroundColor: COLORS.background,
        padding: SPACING.m,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    content: {
        padding: SPACING.m,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
        marginTop: SPACING.m,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.s,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    roleBadge: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.m,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    roleText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
        fontSize: 12,
    },
    formContainer: {
        marginBottom: SPACING.xl,
        gap: SPACING.m,
    },
    inputContainer: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    inputWrapper: {
        height: 50,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: SPACING.m,
        justifyContent: 'center',
        backgroundColor: COLORS.white,
    },
    inputValue: {
        fontSize: 16,
        color: COLORS.text,
    },
    logoutButton: {
        backgroundColor: COLORS.primary,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    logoutButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    versionContainer: {
        alignItems: 'center',
    },
    versionText: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
});
