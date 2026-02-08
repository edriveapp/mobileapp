import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { useTripStore } from '../../stores/tripStore';
import { Trip } from '../../types';

export default function TripDetailsScreen() {
    const { id } = useLocalSearchParams(); // tripId
    const router = useRouter();

    const { trips, joinTrip, userJoinedTripIds } = useTripStore();
    const { user } = useAuthStore();

    const [trip, setTrip] = useState<Trip | undefined>(undefined);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (typeof id === 'string') {
            const foundTrip = trips.find(t => t.id === id);
            setTrip(foundTrip);
        }
    }, [id, trips]);

    const handleJoinTrip = async () => {
        if (!trip || !user) return;

        setLoading(true);
        try {
            await joinTrip(trip.id, user.id);
            Alert.alert('Success', 'You have joined the trip!', [
                { text: 'OK' }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to join trip');
        } finally {
            setLoading(false);
        }
    };

    if (!trip) {
        return (
            <View style={styles.center}>
                <Text>Trip not found</Text>
            </View>
        );
    }

    const isJoined = userJoinedTripIds.includes(trip.id);
    const isFull = trip.availableSeats === 0;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.card}>
                <Text style={styles.route}>{trip.origin} ➝ {trip.destination}</Text>
                <View style={styles.divider} />

                <View style={styles.row}>
                    <Text style={styles.label}>Date:</Text>
                    <Text style={styles.value}>{trip.date}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Time:</Text>
                    <Text style={styles.value}>{trip.time}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Price:</Text>
                    <Text style={styles.value}>₦{trip.price.toLocaleString()}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Seats Left:</Text>
                    <Text style={[styles.value, { color: isFull ? COLORS.error : COLORS.success }]}>
                        {trip.availableSeats} / {trip.seats}
                    </Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Status:</Text>
                    <Text style={styles.value}>{trip.status.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.driverInfo}>
                <Text style={styles.sectionTitle}>Driver Info</Text>
                <Text style={styles.driverId}>Driver ID: {trip.driverId}</Text>
                {/* In real app, fetch driver details */}
            </View>

            <TouchableOpacity
                style={[
                    styles.button,
                    (isJoined || isFull) && styles.disabledButton
                ]}
                onPress={handleJoinTrip}
                disabled={loading || isJoined || isFull}
            >
                {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                ) : (
                    <Text style={styles.buttonText}>
                        {isJoined ? 'Joined' : isFull ? 'Full' : 'Join Trip'}
                    </Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: SPACING.l,
    },
    card: {
        backgroundColor: COLORS.surface,
        padding: SPACING.m,
        borderRadius: 12,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    route: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: SPACING.m,
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: SPACING.m,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.s,
    },
    label: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    value: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    driverInfo: {
        marginBottom: SPACING.xl,
        padding: SPACING.m,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: SPACING.s,
    },
    driverId: {
        color: COLORS.textSecondary,
    },
    button: {
        backgroundColor: COLORS.primary,
        padding: SPACING.m,
        borderRadius: 8,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: COLORS.textSecondary,
        opacity: 0.7,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
