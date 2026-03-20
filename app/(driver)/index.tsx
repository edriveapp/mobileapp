import { useAuthStore } from '@/app/stores/authStore';
import { useDriverStore } from '@/app/stores/driverStore';
import { useRideRealtimeStore } from '@/app/stores/rideRealtimeStore';
import { useTripStore } from '@/app/stores/tripStore';
import RideRequestModal from '@/app/components/RideRequestModal';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
    const { availableTrips, activeTrips, history, fetchAvailableTrips, fetchMyTrips, acceptRide, cancelRide, updateTripStatus } = useTripStore();
    const latestRideRequest = useRideRealtimeStore((state) => state.latestRideRequest);
    const requestQueue = useRideRealtimeStore((state) => state.requestQueue);
    const clearLatestRideRequest = useRideRealtimeStore((state) => state.clearLatestRideRequest);
    const dequeueRideRequest = useRideRealtimeStore((state) => state.dequeueRideRequest);
    const lastRequestCountRef = useRef(0);

    // Menu State
    const [menuVisible, setMenuVisible] = useState(false);
    const [isRefreshingRequests, setIsRefreshingRequests] = useState(false);

    const stats = {
        activeTrips: activeTrips.length,
        totalTrips: activeTrips.length + history.length,
        rating: Number((user as any)?.rating || 4.8).toFixed(1),
        earnings: '--',
        remittance: '--',
    };

    const getPassengerName = (ride: any) => {
        const fullName = [ride?.passenger?.firstName, ride?.passenger?.lastName].filter(Boolean).join(' ').trim();
        return fullName || ride?.passenger?.name || ride?.passenger?.email || ride?.passenger?.phone || 'Passenger';
    };

    const getRouteAddress = (value: any, fallback: string) => {
        if (value && typeof value === 'object') return value.address || fallback;
        return value || fallback;
    };

    const formatTripTime = (trip: any) => {
        if (trip?.departureTime) {
            const date = new Date(trip.departureTime);
            return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        return `${trip?.date || 'Today'} • ${trip?.time || 'Any time'}`;
    };

    const getRideType = (ride: any) => ride?.preferences?.shared ? 'Shared' : 'Only me';

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

    const handleEditTrip = (tripId: string) => {
        router.push({ pathname: '/(driver)/create-trip', params: { tripId } } as never);
    };

    const handleCancelTrip = (tripId: string) => {
        Alert.alert('Remove trip', 'This will take the trip off the rider side.', [
            { text: 'Keep it', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelRide(tripId);
                    } catch (error: any) {
                        Alert.alert('Could not remove trip', error?.message || 'Please try again.');
                    }
                }
            }
        ]);
    };

    const handleCompleteTrip = (tripId: string) => {
        Alert.alert('Mark trip as done', 'This will move the trip out of your active list.', [
            { text: 'Not yet', style: 'cancel' },
            {
                text: 'Mark done',
                onPress: async () => {
                    try {
                        await updateTripStatus(tripId, 'completed');
                    } catch (error: any) {
                        Alert.alert('Could not complete trip', error?.message || 'Please try again.');
                    }
                }
            }
        ]);
    };

    const refreshDriverRequests = useCallback(async (showLoader = false) => {
        if (showLoader) setIsRefreshingRequests(true);
        try {
            await fetchAvailableTrips({ role: 'driver' });
        } finally {
            if (showLoader) setIsRefreshingRequests(false);
        }
    }, [fetchAvailableTrips]);

    useEffect(() => {
        refreshDriverRequests(true);
        fetchMyTrips();
        const interval = setInterval(() => {
            refreshDriverRequests(false);
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchMyTrips, refreshDriverRequests]);

    useEffect(() => {
        const currentCount = availableTrips.length;
        if (lastRequestCountRef.current > 0 && currentCount > lastRequestCountRef.current) {
            const diff = currentCount - lastRequestCountRef.current;
            Alert.alert(
                'New rider request',
                `${diff} new live request${diff > 1 ? 's' : ''} just came in.`
            );
        }
        lastRequestCountRef.current = currentCount;
    }, [availableTrips.length]);

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

                {/* 1. Requests / Active Trips Card */}
                <TouchableOpacity
                    style={[styles.card, styles.cardBorderGreen]}
                    onPress={() => router.push('/(driver)/requests')}
                >
                    <View style={styles.cardRow}>
                        <View>
                            <Text style={styles.cardTitle}>Ride Requests</Text>
                            <Text style={styles.cardSubtitle}>
                                {availableTrips.length} live request{availableTrips.length === 1 ? '' : 's'} nearby
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => refreshDriverRequests(true)}>
                            <Text style={styles.seeDetails}>
                                {isRefreshingRequests ? 'refreshing...' : 'see details'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>

                <View style={styles.quickActionsRow}>
                    <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/(driver)/create-trip')}>
                        <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.quickActionText}>Post Trip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/(driver)/requests')}>
                        <Ionicons name="flash-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.quickActionText}>Live Requests</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.tripManagerSection}>
                    <View style={styles.liveSectionHeader}>
                        <Text style={styles.liveSectionTitle}>Your active trips</Text>
                        <Text style={styles.liveSectionMeta}>{activeTrips.length} live</Text>
                    </View>
                    {activeTrips.length > 0 ? (
                        activeTrips.slice(0, 4).map((trip: any) => {
                            const isSearchTrip = String(trip.status).toLowerCase() === 'searching';
                            const passengerName = getPassengerName(trip);
                            const pickupAddress = getRouteAddress(trip.pickupLocation || trip.origin, 'Pickup');
                            return (
                                <View key={trip.id} style={styles.tripManagerCard}>
                                    <View style={styles.tripManagerTop}>
                                        <View style={styles.tripManagerRoute}>
                                            <Text style={styles.tripManagerRouteText}>
                                                {getRouteAddress(trip.origin, 'Pickup')}
                                            </Text>
                                            <Ionicons name="arrow-forward" size={14} color={COLORS.textSecondary} />
                                            <Text style={styles.tripManagerRouteText}>
                                                {getRouteAddress(trip.destination, 'Destination')}
                                            </Text>
                                        </View>
                                        <View style={styles.tripStatusPill}>
                                            <Text style={styles.tripStatusPillText}>{String(trip.status || 'active')}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.tripManagerMeta}>
                                        {formatTripTime(trip)} • {trip.availableSeats ?? trip.seats ?? 0} seats left • ₦
                                        {Number(trip.fare || trip.price || 0).toLocaleString()}
                                    </Text>
                                    {!isSearchTrip && (
                                        <View style={styles.tripPickupCard}>
                                            <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.tripPickupTitle}>{passengerName}</Text>
                                                <Text style={styles.tripPickupText}>Pickup near {pickupAddress}</Text>
                                            </View>
                                        </View>
                                    )}
                                    <View style={styles.tripManagerActions}>
                                        {isSearchTrip ? (
                                            <>
                                                <TouchableOpacity
                                                    style={styles.tripActionSecondary}
                                                    onPress={() => handleEditTrip(trip.id)}
                                                >
                                                    <Text style={styles.tripActionSecondaryText}>Edit</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.tripActionDanger}
                                                    onPress={() => handleCancelTrip(trip.id)}
                                                >
                                                    <Text style={styles.tripActionDangerText}>Remove</Text>
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <>
                                                <TouchableOpacity
                                                    style={styles.tripActionSecondary}
                                                    onPress={() => router.push('/(driver)/maps')}
                                                >
                                                    <Text style={styles.tripActionSecondaryText}>View pickup</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.tripActionPrimary}
                                                    onPress={() => handleCompleteTrip(trip.id)}
                                                >
                                                    <Text style={styles.tripActionPrimaryText}>Mark done</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <View style={styles.tripManagerEmpty}>
                            <Text style={styles.tripManagerEmptyTitle}>No active trips yet</Text>
                            <Text style={styles.tripManagerEmptyText}>
                                Post a trip and it will stay here so you can edit, remove, or close it out quickly.
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.liveSection}>
                    <View style={styles.liveSectionHeader}>
                        <Text style={styles.liveSectionTitle}>Live rider queue</Text>
                        <Text style={styles.liveSectionMeta}>{requestQueue.length} waiting</Text>
                    </View>
                    {requestQueue.length > 0 ? (
                        requestQueue.slice(0, 3).map((ride) => (
                            <View key={ride.id} style={styles.liveRideCard}>
                                <View style={styles.liveRideTop}>
                                    <View>
                                        <Text style={styles.liveRideName}>{getPassengerName(ride)}</Text>
                                        <Text style={styles.liveRideRoute}>
                                            {ride.origin?.address || 'Pickup'} to {ride.destination?.address || 'Destination'}
                                        </Text>
                                    </View>
                                    <Text style={styles.liveRideFare}>
                                        {Number(ride.fare || ride.price || 0) > 0
                                            ? `₦${Number(ride.fare || ride.price || 0).toLocaleString()}`
                                            : 'Offer pending'}
                                    </Text>
                                </View>
                                <View style={styles.liveRideMetaRow}>
                                    <View style={styles.liveRideMetaPill}>
                                        <Ionicons name="people-outline" size={12} color={COLORS.primary} />
                                        <Text style={styles.liveRideMetaText}>{getRideType(ride)}</Text>
                                    </View>
                                </View>
                                {!!ride.notes && (
                                    <Text style={styles.liveRideNote} numberOfLines={2}>
                                        {ride.notes}
                                    </Text>
                                )}
                                <View style={styles.liveRideActions}>
                                    <TouchableOpacity
                                        style={styles.liveRideSecondary}
                                        onPress={() => router.push('/(driver)/maps')}
                                    >
                                        <Text style={styles.liveRideSecondaryText}>View on map</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.liveRidePrimary}
                                        onPress={async () => {
                                            try {
                                                const accepted = await acceptRide(ride.id);
                                                dequeueRideRequest(ride.id);
                                                clearLatestRideRequest();
                                                router.push(`/chat/${accepted.id}`);
                                            } catch (error: any) {
                                                Alert.alert('Accept failed', error?.message || 'Could not accept this ride.');
                                            }
                                        }}
                                    >
                                        <Text style={styles.liveRidePrimaryText}>Accept</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.liveRideEmpty}>
                            <Text style={styles.liveRideEmptyText}>New rider requests will appear here in real time.</Text>
                        </View>
                    )}
                </View>

                {/* 2. Total Trips Card */}
                <View style={[styles.card, styles.cardBgGreen]}>
                    <View style={styles.cardRow}>
                        <View>
                            <Text style={styles.cardTitle}>Trips</Text>
                            <Text style={styles.cardSubtitle}>{stats.activeTrips} active right now</Text>
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

            <RideRequestModal
                isVisible={!!latestRideRequest}
                request={latestRideRequest ? {
                    id: latestRideRequest.id,
                    passengerName: getPassengerName(latestRideRequest),
                    passengerRating: latestRideRequest.passenger?.rating || 5,
                    pickup: latestRideRequest.origin?.address || 'Unknown pickup',
                    dropoff: latestRideRequest.destination?.address || 'Unknown destination',
                    distance: 'Live request',
                    price: Number(latestRideRequest.fare || latestRideRequest.price || 0),
                    eta: 'Now',
                    rideType: getRideType(latestRideRequest),
                    note: latestRideRequest.notes || '',
                } : null}
                onDecline={() => {
                    if (latestRideRequest?.id) {
                        dequeueRideRequest(latestRideRequest.id);
                    }
                    clearLatestRideRequest();
                }}
                onAccept={async () => {
                    if (!latestRideRequest?.id) return;
                    try {
                        const ride = await acceptRide(latestRideRequest.id);
                        dequeueRideRequest(latestRideRequest.id);
                        clearLatestRideRequest();
                        router.push(`/chat/${ride.id}`);
                    } catch (error: any) {
                        Alert.alert('Accept failed', error?.message || 'Could not accept the live request.');
                    }
                }}
            />
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
    quickActionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    quickActionCard: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#D8E7DC',
        backgroundColor: '#F4FBF6',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    quickActionText: {
        color: COLORS.primary,
        fontSize: 13,
        fontFamily: Fonts.semibold,
    },
    tripManagerSection: {
        marginBottom: 18,
    },
    tripManagerCard: {
        backgroundColor: '#FFFDF8',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#ECE7DA',
        padding: 14,
        marginBottom: 10,
    },
    tripManagerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 8,
    },
    tripManagerRoute: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tripManagerRouteText: {
        flexShrink: 1,
        fontSize: 14,
        color: '#101828',
        fontFamily: Fonts.semibold,
    },
    tripManagerMeta: {
        color: '#667085',
        fontSize: 12,
        fontFamily: Fonts.rounded,
        marginBottom: 12,
    },
    tripPickupCard: {
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: '#F6FBF7',
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    tripPickupTitle: {
        color: '#101828',
        fontSize: 13,
        fontFamily: Fonts.semibold,
        marginBottom: 2,
    },
    tripPickupText: {
        color: '#667085',
        fontSize: 12,
        fontFamily: Fonts.rounded,
    },
    tripStatusPill: {
        backgroundColor: '#EBF7EE',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    tripStatusPillText: {
        color: COLORS.primary,
        fontSize: 11,
        fontFamily: Fonts.semibold,
        textTransform: 'capitalize',
    },
    tripManagerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    tripActionSecondary: {
        flex: 1,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D0D5DD',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    tripActionSecondaryText: {
        color: '#344054',
        fontFamily: Fonts.semibold,
        fontSize: 13,
    },
    tripActionPrimary: {
        flex: 1,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
    },
    tripActionPrimaryText: {
        color: '#FFFFFF',
        fontFamily: Fonts.semibold,
        fontSize: 13,
    },
    tripActionDanger: {
        flex: 1,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF1F3',
    },
    tripActionDangerText: {
        color: '#D92D20',
        fontFamily: Fonts.semibold,
        fontSize: 13,
    },
    tripManagerEmpty: {
        borderRadius: 18,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#D0D5DD',
        padding: 18,
        backgroundColor: '#FCFCFD',
    },
    tripManagerEmptyTitle: {
        fontSize: 15,
        color: '#101828',
        fontFamily: Fonts.semibold,
        marginBottom: 4,
    },
    tripManagerEmptyText: {
        fontSize: 13,
        color: '#667085',
        fontFamily: Fonts.rounded,
        lineHeight: 19,
    },
    liveSection: {
        marginBottom: 16,
    },
    liveSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    liveSectionTitle: {
        fontSize: 16,
        color: COLORS.text,
        fontFamily: Fonts.bold,
    },
    liveSectionMeta: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
    },
    liveRideCard: {
        backgroundColor: '#F7FBF8',
        borderWidth: 1,
        borderColor: '#DBEDE0',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
    },
    liveRideTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    liveRideName: {
        fontSize: 15,
        color: COLORS.text,
        fontFamily: Fonts.semibold,
        marginBottom: 4,
    },
    liveRideRoute: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
        maxWidth: 220,
    },
    liveRideFare: {
        fontSize: 15,
        color: COLORS.primary,
        fontFamily: Fonts.bold,
    },
    liveRideMetaRow: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    liveRideMetaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EEF6F0',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    liveRideMetaText: {
        color: COLORS.primary,
        fontSize: 11,
        fontFamily: Fonts.semibold,
    },
    liveRideNote: {
        color: '#667085',
        fontSize: 12,
        fontFamily: Fonts.rounded,
        marginBottom: 10,
    },
    liveRideActions: {
        flexDirection: 'row',
        gap: 10,
    },
    liveRideSecondary: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#C7D8CC',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    liveRideSecondaryText: {
        color: COLORS.text,
        fontFamily: Fonts.semibold,
        fontSize: 13,
    },
    liveRidePrimary: {
        flex: 1,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    liveRidePrimaryText: {
        color: COLORS.white,
        fontFamily: Fonts.semibold,
        fontSize: 13,
    },
    liveRideEmpty: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#ECECEC',
        borderStyle: 'dashed',
        padding: 16,
        backgroundColor: '#FCFCFC',
    },
    liveRideEmptyText: {
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
        fontSize: 13,
        textAlign: 'center',
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
