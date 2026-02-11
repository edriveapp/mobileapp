import { useAuthStore } from '@/app/stores/authStore';
import { useDriverStore } from '@/app/stores/driverStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Modal, Pressable,
    ScrollView,
    StyleSheet, Text, TouchableOpacity,
    View
} from 'react-native';
// 1. FIX: Import SafeAreaView from the correct library
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DriverHome() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const hasCompletedOnboarding = useDriverStore((s) => s.hasCompletedOnboarding);

    // Menu State
    const [menuVisible, setMenuVisible] = useState(false);

    // Mock Data
    const stats = {
        activeTrips: 2,
        totalTrips: 65,
        rating: 4.2,
        earnings: '₦45,000',
        remittance: '₦4,500'
    };

    const handleAction = (action: () => void) => {
        if (!hasCompletedOnboarding) {
            Alert.alert(
                "Verification Required",
                "Please complete your driver profile to access this.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Verify Now", onPress: () => router.push('/(driver)/onboarding') }
                ]
            );
            return;
        }
        action();
    };

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: () => {
                    setMenuVisible(false);
                    logout();
                    router.replace('/(auth)/login');
                }
            }
        ]);
    };

    return (
        // 2. FIX: Use the new SafeAreaView
        <SafeAreaView style={styles.container} edges={['top']}>

            {/* --- SIDE MENU MODAL --- */}
            <Modal
                visible={menuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
                    <View style={styles.sideMenu}>
                        {/* Menu Header */}
                        <View style={styles.menuHeader}>
                            <View style={styles.menuUserContainer}>
                                <View style={styles.menuAvatar}>
                                    <Text style={styles.menuAvatarText}>
                                        {user?.name?.charAt(0) || 'D'}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={styles.menuUserName}>{user?.name || 'Driver'}</Text>
                                    <Text style={styles.menuUserRole}>Driver Account</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setMenuVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.menuDivider} />

                        {/* Menu Items */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setMenuVisible(false);
                                router.push('/(driver)/wallet');
                            }}
                        >
                            <Ionicons name="wallet-outline" size={22} color={COLORS.text} />
                            <Text style={styles.menuItemText}>My Wallet</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setMenuVisible(false);
                                router.push('/(driver)/onboarding'); // Re-visit onboarding to edit
                            }}
                        >
                            <Ionicons name="person-outline" size={22} color={COLORS.text} />
                            <Text style={styles.menuItemText}>Profile & Documents</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setMenuVisible(false);
                                router.push('/(driver)/settings');
                            }}
                        >
                            <Ionicons name="settings-outline" size={22} color={COLORS.text} />
                            <Text style={styles.menuItemText}>Settings</Text>
                        </TouchableOpacity>

                        {/* Spacer to push logout to bottom */}
                        <View style={{ flex: 1 }} />

                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
                            <Text style={styles.logoutText}>Log Out</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            {/* --- FIXED HEADER (Outside ScrollView) --- */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
                    <Ionicons name="menu" size={28} color="#000" />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.screenTitle}>Dashboard</Text>
                    <Text style={styles.screenSubtitle}>Transportation Summary</Text>
                </View>

                {/* Invisible spacer to balance the header layout */}
                <View style={{ width: 28 }} />
            </View>

            {/* --- SCROLLABLE CONTENT --- */}
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Verification Banner */}
                {!hasCompletedOnboarding && (
                    <TouchableOpacity style={styles.alertBanner} onPress={() => router.push('/(driver)/onboarding')}>
                        <Text style={styles.alertText}>⚠️ Complete your profile to start driving</Text>
                    </TouchableOpacity>
                )}

                {/* 1. Active Trips Card */}
                <TouchableOpacity
                    style={[styles.card, styles.cardBorderGreen]}
                    onPress={() => handleAction(() => console.log('View Active Trips'))}
                >
                    <View style={styles.cardRow}>
                        <View>
                            <Text style={styles.cardTitle}>Active Trips</Text>
                            <Text style={styles.cardSubtitle}>View Active Trips</Text>
                        </View>
                        <Text style={styles.seeDetails}>see details</Text>
                    </View>
                </TouchableOpacity>

                {/* 2. Total Trips Card */}
                <View style={[styles.card, styles.cardBgGreen]}>
                    <View style={styles.cardRow}>
                        <View>
                            <Text style={styles.cardTitle}>Trips</Text>
                            <Text style={styles.cardSubtitle}>Total covered</Text>
                        </View>
                        <Text style={styles.bigValue}>{stats.totalTrips}</Text>
                    </View>
                </View>

                {/* 3. Rating Card */}
                <View style={[styles.card, styles.cardBgYellow]}>
                    <View style={styles.cardRow}>
                        <View>
                            <Text style={styles.cardTitle}>Rating</Text>
                            <Text style={styles.cardSubtitle}>Total Rating</Text>
                        </View>
                        <Text style={styles.bigValue}>{stats.rating}</Text>
                    </View>
                </View>

                {/* 4. Earnings Card */}
                <TouchableOpacity
                    style={[styles.card, styles.cardBorderGreen]}
                    onPress={() => console.log('View Earnings')}
                >
                    <View style={styles.cardRow}>
                        <View>
                            <Text style={styles.cardTitle}>Earnings</Text>
                            <Text style={styles.cardSubtitle}>Total Earnings</Text>
                        </View>
                        <Text style={styles.seeDetails}>see details</Text>
                    </View>
                </TouchableOpacity>

                {/* 5. Remittance Card */}
                <TouchableOpacity
                    style={[styles.card, styles.cardBgRed]}
                    onPress={() => console.log('View Remittance')}
                >
                    <View style={styles.cardRow}>
                        <View>
                            <Text style={styles.cardTitle}>Remittance</Text>
                            <Text style={styles.cardSubtitle}>Total Remittance</Text>
                        </View>
                        <Text style={styles.seeDetails}>see details</Text>
                    </View>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    // Header is now fixed at top
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.s,
        paddingBottom: SPACING.m,
        backgroundColor: '#fff', // Ensure background covers scrolling content
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0', // Optional: adds subtle separation
        zIndex: 10,
    },
    scrollContent: {
        padding: SPACING.l,
        paddingTop: SPACING.m, // Add spacing since header is removed from scrollview
    },

    menuButton: {
        padding: 4,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        fontFamily: Fonts.bold,
        marginBottom: 4,
    },
    screenSubtitle: {
        fontSize: 14,
        color: '#666',
        fontFamily: Fonts.rounded,
    },

    // Side Menu Styles
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-start',
    },
    sideMenu: {
        width: '75%',
        height: '100%',
        backgroundColor: '#fff',
        padding: SPACING.l,
        paddingTop: 60,
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.l,
    },
    menuUserContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuAvatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    menuUserName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    menuUserRole: {
        fontSize: 12,
        color: '#666',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#eee',
        marginBottom: SPACING.l,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    menuItemText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    logoutText: {
        fontSize: 16,
        color: '#FF3B30',
        fontWeight: '600',
    },

    // Card Styles
    card: {
        borderRadius: 12,
        paddingVertical: 20,
        paddingHorizontal: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        fontFamily: Fonts.bold,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#666',
        fontFamily: Fonts.rounded,
    },
    seeDetails: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        fontFamily: Fonts.mono,
    },
    bigValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000',
        fontFamily: Fonts.bold,
    },
    cardBorderGreen: {
        borderColor: '#2E8B57',
        backgroundColor: '#fff',
    },
    cardBgGreen: {
        backgroundColor: '#E8F5E9',
        borderColor: '#2E8B57',
    },
    cardBgYellow: {
        backgroundColor: '#FEFCE8',
        borderColor: '#EAB308',
    },
    cardBgRed: {
        backgroundColor: '#FFF5F5',
        borderColor: '#FF4d4d',
    },
    alertBanner: {
        backgroundColor: '#FFF3CD',
        borderColor: '#FFEEBA',
        borderWidth: 1,
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
        alignItems: 'center',
    },
    alertText: {
        color: '#856404',
        fontSize: 14,
    },
});