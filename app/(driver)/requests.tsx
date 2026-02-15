import { useTripStore } from '@/app/stores/tripStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function DriverRequestsScreen() {
    const router = useRouter();
    const { availableTrips, fetchAvailableTrips, isLoading, error } = useTripStore();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        // Fetch rides where riders are searching (role='driver' tells backend to look for rider requests)
        await fetchAvailableTrips({ role: 'driver' });
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadRequests();
        setRefreshing(false);
    };

    const handleAccept = (rideId: string) => {
        // Implement accept logic (API call)
        // For now, allow mock accept or call store action
        Alert.alert("Accept Ride", "Are you sure you want to accept this ride?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Accept",
                onPress: () => {
                    // Call store.acceptRide(rideId) - Need to add this action to store
                    Alert.alert("Success", "Ride accepted!");
                    loadRequests(); // Refresh
                }
            }
        ]);
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.userRow}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.passenger?.name?.charAt(0) || 'U'}</Text>
                    </View>
                    <View>
                        <Text style={styles.userName}>{item.passenger?.name || 'Passenger'}</Text>
                        <Text style={styles.timeText}>
                            {item.departureTime
                                ? `Scheduled: ${new Date(item.departureTime).toLocaleString()}`
                                : 'Now'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.price}>₦{item.fare || 2500}</Text>
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

            <TouchableOpacity style={styles.acceptButton} onPress={() => handleAccept(item.id)}>
                <Text style={styles.acceptText}>Accept Ride</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
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

    acceptButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    acceptText: { color: COLORS.white, fontWeight: '600', fontSize: 14, fontFamily: Fonts.semibold },
});
