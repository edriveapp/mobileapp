import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/app/stores/authStore';
import { useSettingsStore } from '@/app/stores/settingsStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

export default function ProfileScreen() {
    const router = useRouter();
    const { logout, user } = useAuthStore();
    const { preferences, fetchPreferences, updatePreference, savedPlaces, fetchSavedPlaces } = useSettingsStore();

    useEffect(() => {
        fetchPreferences();
        fetchSavedPlaces();
    }, []);

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: () => {
                    logout();
                    router.replace('/(auth)/login');
                }
            }
        ]);
    };

    const SettingItem = ({
        icon,
        title,
        subtitle,
        onPress,
        hasSwitch_Value,
        onSwitchChange,
        isDestructive = false
    }: {
        icon: any,
        title: string,
        subtitle?: string,
        onPress?: () => void,
        hasSwitch_Value?: boolean,
        onSwitchChange?: (val: boolean) => void,
        isDestructive?: boolean
    }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={onPress}
            disabled={hasSwitch_Value !== undefined}
        >
            <View style={[styles.iconBox, isDestructive && styles.destructiveIconBox]}>
                <Ionicons name={icon} size={20} color={isDestructive ? '#D32F2F' : COLORS.text} />
            </View>
            <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, isDestructive && styles.destructiveText]}>{title}</Text>
                {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
            </View>

            {hasSwitch_Value !== undefined ? (
                <Switch
                    value={hasSwitch_Value}
                    onValueChange={onSwitchChange}
                    trackColor={{ false: '#767577', true: COLORS.primary }}
                    thumbColor={'#fff'}
                />
            ) : (
                !isDestructive && <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            )}
        </TouchableOpacity>
    );

    if (!user) return null;

    // Use firstName from backend, fall back to name
    const displayName = (user as any).firstName || user.name || 'User';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Avatar Section */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.userName}>{displayName}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <View style={styles.roleBadge}>
                        <Ionicons name="person" size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
                        <Text style={styles.roleText}>
                            {user.role === 'driver' ? 'Driver Account' : 'Rider Account'}
                        </Text>
                    </View>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>ACCOUNT</Text>
                    <View style={styles.sectionBody}>
                        <SettingItem
                            icon="person-outline"
                            title="Personal Information"
                            subtitle="View your details"
                            onPress={() => router.push('/profile-details')}
                        />
                        <View style={styles.divider} />
                        <SettingItem
                            icon="card-outline"
                            title="Payment Methods"
                            subtitle="Manage payment"
                        />
                        <View style={styles.divider} />
                        <SettingItem
                            icon="location-outline"
                            title="Saved Places"
                            subtitle={savedPlaces.length > 0 ? savedPlaces.map(p => p.label).join(', ') : 'Add places'}
                            onPress={() => router.push('/saved-places')}
                        />
                    </View>
                </View>

                {/* Preferences Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
                    <View style={styles.sectionBody}>
                        <SettingItem
                            icon="notifications-outline"
                            title="Push Notifications"
                            hasSwitch_Value={preferences.pushNotifications}
                            onSwitchChange={(val) => updatePreference('pushNotifications', val)}
                        />
                        <View style={styles.divider} />
                        <SettingItem
                            icon="mail-outline"
                            title="Email Updates"
                            hasSwitch_Value={preferences.emailNotifications}
                            onSwitchChange={(val) => updatePreference('emailNotifications', val)}
                        />
                        <View style={styles.divider} />
                        <SettingItem
                            icon="cloud-download-outline"
                            title="OTA Updates"
                            hasSwitch_Value={preferences.otaUpdates}
                            onSwitchChange={(val) => updatePreference('otaUpdates', val)}
                        />
                    </View>
                </View>

                {/* Support Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>SUPPORT</Text>
                    <View style={styles.sectionBody}>
                        <SettingItem
                            icon="help-circle-outline"
                            title="Help & Support"
                        />
                        <View style={styles.divider} />
                        <SettingItem
                            icon="lock-closed-outline"
                            title="Privacy Policy"
                        />
                        <View style={styles.divider} />
                        <SettingItem
                            icon="document-outline"
                            title="Terms of Service"
                        />
                    </View>
                </View>

                {/* Logout Section */}
                <View style={styles.section}>
                    <View style={styles.sectionBody}>
                        <SettingItem
                            icon="log-out-outline"
                            title="Log Out"
                            isDestructive
                            onPress={handleLogout}
                        />
                    </View>
                    <Text style={styles.versionText}>Version 1.0.0 (Build 2026.02)</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, fontFamily: Fonts.bold },

    content: { padding: SPACING.l, paddingBottom: 40 },

    // Avatar Styles
    avatarContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
        marginTop: SPACING.s,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.s,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 2,
        fontFamily: Fonts.bold,
    },
    userEmail: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: SPACING.s,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },

    // Section Styles
    section: { marginBottom: SPACING.xl },
    sectionHeader: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginLeft: 4, letterSpacing: 1 },
    sectionBody: { backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },

    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: COLORS.white
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    destructiveIconBox: { backgroundColor: '#FFEBEE' },

    itemContent: { flex: 1 },
    itemTitle: { fontSize: 16, color: COLORS.text, fontFamily: Fonts.rounded, fontWeight: '500' },
    destructiveText: { color: '#D32F2F', fontWeight: 'bold' },
    itemSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

    divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 60 },

    versionText: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, marginTop: SPACING.m },
});