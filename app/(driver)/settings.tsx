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
// 1. IMPORT SafeAreaView from the correct library
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/app/stores/authStore';
import { useDriverStore } from '@/app/stores/driverStore';
import { useSettingsStore } from '@/app/stores/settingsStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

export default function SettingsScreen() {
    const router = useRouter();
    const { logout, user } = useAuthStore();
    const driverStore = useDriverStore();
    const { preferences, fetchPreferences, updatePreference } = useSettingsStore();

    useEffect(() => {
        fetchPreferences();
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

    return (
        // 2. USE THE edges prop to ensure top padding
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Profile Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>ACCOUNT</Text>
                    <View style={styles.sectionBody}>
                        <SettingItem
                            icon="person-outline"
                            title="Personal Information"
                            subtitle={user?.name}
                            onPress={() => router.push('/(driver)/onboarding')}
                        />
                        <View style={styles.divider} />
                        <SettingItem
                            icon="document-text-outline"
                            title="Vehicle & Documents"
                            subtitle="License, Vehicle Info"
                            onPress={() => router.push('/(driver)/onboarding')}
                        />
                        <View style={styles.divider} />
                        <SettingItem
                            icon="location-outline"
                            title="Saved Places"
                            subtitle="Home, Work"
                            onPress={() => router.push('/saved-places')}
                        />
                    </View>
                </View>

                {/* Preferences Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>PREFERENCES</Text>
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
                            icon="finger-print-outline"
                            title="Biometric Login"
                            hasSwitch_Value={preferences.biometricLogin}
                            onSwitchChange={(val) => updatePreference('biometricLogin', val)}
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
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        backgroundColor: COLORS.white, // Changed to match SafeAreaView bg usually
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, fontFamily: Fonts.bold },

    content: { padding: SPACING.l, paddingBottom: 40 },

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