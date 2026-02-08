import { useAuthStore } from '@/app/stores/authStore';
import { useTripStore } from '@/app/stores/tripStore';
import { Trip } from '@/app/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, SPACING } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TripsScreen() {
    const router = useRouter();
    const { trips, fetchTrips, isLoading } = useTripStore();
    const { user } = useAuthStore();

    useEffect(() => {
        fetchTrips();
    }, []);

    const renderTripItem = ({ item }: { item: Trip }) => (
        <TouchableOpacity
            style={styles.tripCard}
            onPress={() => router.push(`/trip-details/${item.id}`)}
        >
            <View style={styles.tripHeader}>
                <View style={styles.routeContainer}>
                    <Text style={styles.tripRoute}>{item.origin}</Text>
                    <IconSymbol name="arrow.right" size={16} color={COLORS.textSecondary} style={styles.arrowIcon} />
                    <Text style={styles.tripRoute}>{item.destination}</Text>
                </View>
                <Text style={styles.tripPrice}>₦{item.price.toLocaleString()}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.tripDetails}>
                <View style={styles.detailItem}>
                    <IconSymbol name="calendar" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.tripInfoText}>{item.date}</Text>
                </View>
                <View style={styles.detailItem}>
                    <IconSymbol name="clock" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.tripInfoText}>{item.time}</Text>
                </View>
            </View>

            <View style={styles.statusContainer}>
                <Text style={[
                    styles.tripSeats,
                    { color: item.availableSeats > 0 ? COLORS.success : COLORS.error }
                ]}>
                    {item.availableSeats} seats left
                </Text>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Scheduled</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Trips</Text>
            </View>

            <FlatList
                data={trips}
                renderItem={renderTripItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={fetchTrips} colors={[COLORS.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <IconSymbol name="paperplane" size={48} color={COLORS.textSecondary} />
                        <Text style={styles.emptyText}>No trips found.</Text>
                        <TouchableOpacity style={styles.browseButton} onPress={() => router.push('/(tabs)')}>
                            <Text style={styles.browseButtonText}>Browse Trips</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
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
    listContent: {
        padding: SPACING.m,
        paddingBottom: SPACING.xl,
    },
    tripCard: {
        backgroundColor: COLORS.white,
        padding: SPACING.m,
        borderRadius: 12,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    routeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    arrowIcon: {
        marginHorizontal: SPACING.s,
    },
    tripRoute: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    tripPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: SPACING.s,
    },
    tripDetails: {
        flexDirection: 'row',
        marginBottom: SPACING.s,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: SPACING.m,
        gap: 4,
    },
    tripInfoText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    statusContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.xs,
    },
    tripSeats: {
        fontWeight: '600',
        fontSize: 14,
    },
    statusBadge: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: SPACING.s,
        paddingVertical: 2,
        borderRadius: 8,
    },
    statusText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: SPACING.xl * 2,
    },
    emptyText: {
        marginTop: SPACING.m,
        color: COLORS.textSecondary,
        fontSize: 16,
        marginBottom: SPACING.l,
    },
    browseButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.s,
        paddingHorizontal: SPACING.l,
        borderRadius: 8,
    },
    browseButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
    },
});
