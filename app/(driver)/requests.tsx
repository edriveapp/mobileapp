import { useTripStore } from '@/app/stores/tripStore';
import { useRideRealtimeStore } from '@/app/stores/rideRealtimeStore';
import { useSocketStore } from '@/app/stores/socketStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DriverRequestsScreen() {
    const router = useRouter();
    const { availableTrips, fetchAvailableTrips, acceptRide, isLoading } = useTripStore();
    const dequeueRideRequest = useRideRealtimeStore((state) => state.dequeueRideRequest);
    const isSocketConnected = useSocketStore((state) => state.isConnected);
    const [refreshing, setRefreshing] = useState(false);

    const getPassengerName = (ride: any) => {
        const firstName = String(ride?.passenger?.firstName || '').trim();
        return firstName || ride?.passenger?.name || ride?.passenger?.email || ride?.passenger?.phone || 'Passenger';
    };

    const loadRequests = useCallback(async () => {
        // Fetch rides where riders are searching (role='driver' tells backend to look for rider requests)
        await fetchAvailableTrips({ role: 'driver' });
    }, [fetchAvailableTrips]);

    const getRideType = (ride: any) => ride?.preferences?.shared ? 'Shared' : 'Only me';

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    // Fallback polling: only when WebSocket is disconnected
    useEffect(() => {
        if (isSocketConnected) return;
        const interval = setInterval(loadRequests, 15000);
        return () => clearInterval(interval);
    }, [isSocketConnected, loadRequests]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadRequests();
        setRefreshing(false);
    };

    const handleAccept = (rideId: string) => {
        Alert.alert("Accept Ride", "Are you sure you want to accept this ride?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Accept",
                onPress: async () => {
                    try {
                        const ride = await acceptRide(rideId);
                        dequeueRideRequest(rideId);
                        Alert.alert("Success", "Ride accepted!");
                        router.push({
                            pathname: '/chat/[id]',
                            params: {
                                id: ride.id,
                                recipientName: getPassengerName(ride),
                            },
                        });
                    } catch (error: any) {
                        Alert.alert('Accept failed', error?.message || 'Could not accept this ride.');
                    }
                },
            }
        ]);
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.userRow}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getPassengerName(item).charAt(0) || 'U'}</Text>
                    </View>
                    <View>
                        <Text style={styles.userName}>{getPassengerName(item)}</Text>
                        <Text style={styles.timeText}>
                            {item.departureTime
                                ? `Scheduled: ${new Date(item.departureTime).toLocaleString()}`
                                : 'Now'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.price}>
                    {Number(item.fare || item.price || 0) > 0
                        ? `₦${Number(item.fare || item.price || 0).toLocaleString()}`
                        : 'Offer pending'}
                </Text>
            </View>

            <View style={styles.routeContainer}>
                <View style={styles.routeRow}>
                    <Ionicons name="radio-button-on" size={16} color={COLORS.success} />
                    <Text style={styles.address} numberOfLines={1}>{item.origin?.address}</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routeRow}>
                    <Ionicons name="location" size={16} color={COLORS.primary} />
                    <Text style={styles.address} numberOfLines={1}>{item.destination?.address}</Text>
                </View>
            </View>

            <View style={styles.metaPills}>
                <View style={styles.metaPill}>
                    <Ionicons name="people-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.metaPillText}>{getRideType(item)}</Text>
                </View>
            </View>

            {!!item.notes && (
                <View style={styles.noteCard}>
                    <Text style={styles.noteLabel}>Passenger note</Text>
                    <Text style={styles.noteText}>{item.notes}</Text>
                </View>
            )}

            <TouchableOpacity style={styles.acceptButton} onPress={() => handleAccept(item.id)}>
                <Text style={styles.acceptText}>Accept Ride</Text>
            </TouchableOpacity>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => {
                        const phone = item.passenger?.phone;
                        if (!phone) {
                            Alert.alert('No phone number', 'Passenger phone is not available for this request.');
                            return;
                        }
                        Linking.canOpenURL(`tel:${phone}`).then((supported) => {
                            if (!supported) {
                                Alert.alert('Call unavailable', 'This device cannot place phone calls.');
                                return;
                            }
                            Linking.openURL(`tel:${phone}`).catch(() => {
                                Alert.alert('Call failed', 'Could not open the phone dialer.');
                            });
                        });
                    }}
                >
                    <Ionicons name="call-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.callText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => router.push({
                        pathname: '/chat/[id]',
                        params: {
                            id: item.id,
                            recipientName: getPassengerName(item),
                        },
                    })}
                >
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.white} />
                    <Text style={styles.chatText}>Chat</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Ride Requests</Text>
                <TouchableOpacity onPress={loadRequests} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {isLoading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={availableTrips}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No ride requests found.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.m,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: { padding: 8 },
    refreshBtn: { padding: 8 },
    title: { fontSize: 18,  color: COLORS.text, fontFamily: Fonts.bold },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    listContent: { padding: SPACING.m },
    emptyText: { color: COLORS.textSecondary, fontSize: 16, fontFamily: Fonts.rounded },

    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0f2f1', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 18, color: COLORS.primary, fontWeight: 'bold' },
    userName: { fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: Fonts.semibold },
    timeText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: Fonts.rounded },
    price: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },

    routeContainer: { marginBottom: 16 },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    routeLine: { width: 1, height: 12, backgroundColor: '#ddd', marginLeft: 7, marginVertical: 2 },
    address: { fontSize: 14, color: COLORS.textSecondary, flex: 1, fontFamily: Fonts.rounded },
    metaPills: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#EEF6F0',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    metaPillText: { color: COLORS.primary, fontSize: 12, fontFamily: Fonts.semibold },
    noteCard: {
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E4E7EC',
        padding: 12,
        marginBottom: 14,
    },
    noteLabel: { color: COLORS.textSecondary, fontSize: 12, fontFamily: Fonts.rounded, marginBottom: 4 },
    noteText: { color: COLORS.text, fontSize: 13, lineHeight: 18, fontFamily: Fonts.rounded },

    acceptButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    acceptText: { color: COLORS.white, fontWeight: '600', fontSize: 14, fontFamily: Fonts.semibold },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'center' },
    callButton: {
        flex: 1,
        height: 44,
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'center',
    },
    callText: { color: COLORS.primary, fontFamily: Fonts.semibold, fontSize: 13, lineHeight: 16, includeFontPadding: false },
    chatButton: {
        flex: 1,
        height: 44,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'center',
    },
    chatText: { color: COLORS.white, fontFamily: Fonts.semibold, fontSize: 13, lineHeight: 16, includeFontPadding: false },
});
