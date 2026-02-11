import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTripStore } from '@/app/stores/tripStore';
import { Trip } from '@/app/types';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

// Mock Driver Data (To be replaced with real backend data later)
const MOCK_DRIVER = {
    id: 'd1',
    name: 'David Okeke',
    image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200',
    rating: 4.8,
    tripsCompleted: 142,
    isVerified: true,
    phoneNumber: '+2348012345678', // Mock phone
    vehicle: {
        model: 'Toyota Sienna',
        color: 'Silver',
        plateNumber: 'LND-123-XY',
        year: '2015'
    }
};

export default function TripDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { trips } = useTripStore();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate fetching trip details
        const foundTrip = trips.find(t => t.id === id);

        // Simulate network delay for realism
        setTimeout(() => {
            if (foundTrip) {
                setTrip(foundTrip);
            }
            setLoading(false);
        }, 500);
    }, [id, trips]);

    const handleCallDriver = () => {
        Linking.openURL(`tel:${MOCK_DRIVER.phoneNumber}`);
    };

    const handleChatDriver = () => {
        // Opens SMS with a pre-filled message
        const message = `Hello ${MOCK_DRIVER.name}, I'm interested in your trip to ${trip?.destination}.`;
        const url = Platform.OS === 'ios' ? `sms:${MOCK_DRIVER.phoneNumber}&body=${message}` : `sms:${MOCK_DRIVER.phoneNumber}?body=${message}`;
        Linking.openURL(url);
    };

    const handleBookSeat = () => {
        Alert.alert(
            "Book Seat",
            `Confirm booking for ₦${trip?.price.toLocaleString()}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: () => {
                        Alert.alert("Success", "Your seat has been reserved! The driver will be notified.");
                        router.back();
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!trip) {
        return (
            <View style={styles.errorContainer}>
                <Text>Trip not found.</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={{ color: COLORS.primary, marginTop: 10 }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="dark" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Trip Details</Text>
                {/* Share Button (Optional) */}
                <TouchableOpacity>
                    <Ionicons name="share-outline" size={24} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Route Header */}
                <View style={styles.routeHeader}>
                    <Text style={styles.originText}>{trip.origin}</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.textSecondary} />
                    <Text style={styles.destText}>{trip.destination}</Text>
                </View>
                <Text style={styles.dateText}>{trip.date} • {trip.time}</Text>

                {/* Price Card */}
                <View style={styles.priceCard}>
                    <View>
                        <Text style={styles.priceLabel}>Price per seat</Text>
                        <Text style={styles.priceValue}>₦{trip.price.toLocaleString()}</Text>
                    </View>
                    <View style={styles.seatsContainer}>
                        <Text style={styles.seatsValue}>{trip.availableSeats}</Text>
                        <Text style={styles.seatsLabel}>seats left</Text>
                    </View>
                </View>

                {/* Driver Profile Card */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Driver</Text>
                    <View style={styles.driverCard}>
                        <Image source={{ uri: MOCK_DRIVER.image }} style={styles.driverImage} />
                        <View style={styles.driverInfo}>
                            <View style={styles.driverNameRow}>
                                <Text style={styles.driverName}>{MOCK_DRIVER.name}</Text>
                                {MOCK_DRIVER.isVerified && <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />}
                            </View>
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={14} color="#FFD700" />
                                <Text style={styles.ratingText}>{MOCK_DRIVER.rating} ({MOCK_DRIVER.tripsCompleted} trips)</Text>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.contactActions}>
                            <TouchableOpacity style={styles.iconButton} onPress={handleChatDriver}>
                                <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconButton} onPress={handleCallDriver}>
                                <Ionicons name="call-outline" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Vehicle Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Vehicle</Text>
                    <View style={styles.vehicleCard}>
                        <View style={styles.vehicleIcon}>
                            <Ionicons name="car-sport-outline" size={32} color={COLORS.textSecondary} />
                        </View>
                        <View>
                            <Text style={styles.vehicleName}>{MOCK_DRIVER.vehicle.color} {MOCK_DRIVER.vehicle.model}</Text>
                            <Text style={styles.vehiclePlate}>{MOCK_DRIVER.vehicle.plateNumber}</Text>
                        </View>
                    </View>
                </View>

                {/* Amenities / Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences & Amenities</Text>
                    <View style={styles.amenitiesRow}>
                        <View style={styles.amenityBadge}>
                            <Ionicons name="snow-outline" size={16} color={COLORS.text} />
                            <Text style={styles.amenityText}>AC: {trip.preferences?.ac ? 'Yes' : 'No'}</Text>
                        </View>
                        <View style={styles.amenityBadge}>
                            <Ionicons name="briefcase-outline" size={16} color={COLORS.text} />
                            <Text style={styles.amenityText}>Luggage: {trip.preferences?.luggage ? 'Yes' : 'Small'}</Text>
                        </View>
                    </View>
                </View>

                {/* Description */}
                {trip.description && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Note from Driver</Text>
                        <Text style={styles.descriptionText}>"{trip.description}"</Text>
                    </View>
                )}

            </ScrollView>

            {/* Bottom Footer */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.bookButton} onPress={handleBookSeat}>
                    <Text style={styles.bookButtonText}>Book Seat - ₦{trip.price.toLocaleString()}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        backgroundColor: '#FAFAFA',
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', fontFamily: Fonts.bold },

    content: { padding: SPACING.l, paddingBottom: 100 },

    // Route Header
    routeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 8,
    },
    originText: { fontSize: 20, fontWeight: '600', color: COLORS.text },
    destText: { fontSize: 20, fontWeight: '600', color: COLORS.text },
    dateText: { textAlign: 'center', color: COLORS.textSecondary, marginBottom: SPACING.l },

    // Price Card
    priceCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.m,
        borderRadius: 16,
        marginBottom: SPACING.l,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    priceLabel: { fontSize: 12, color: COLORS.textSecondary },
    priceValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
    seatsContainer: { alignItems: 'flex-end' },
    seatsValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
    seatsLabel: { fontSize: 12, color: COLORS.textSecondary },

    // Section
    section: { marginBottom: SPACING.xl },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: SPACING.s, color: COLORS.text },

    // Driver Card
    driverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.m,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    driverImage: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eee' },
    driverInfo: { flex: 1, marginLeft: 12 },
    driverNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    driverName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    ratingText: { fontSize: 12, color: COLORS.textSecondary },

    contactActions: { flexDirection: 'row', gap: 8 },
    iconButton: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9',
        justifyContent: 'center', alignItems: 'center'
    },

    // Vehicle Card
    vehicleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    vehicleIcon: {
        width: 50, height: 50, borderRadius: 12, backgroundColor: '#F5F5F5',
        justifyContent: 'center', alignItems: 'center'
    },
    vehicleName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
    vehiclePlate: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2, fontFamily: Fonts.mono, backgroundColor: '#eee', paddingHorizontal: 6, borderRadius: 4, alignSelf: 'flex-start' },

    // Amenities
    amenitiesRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    amenityBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1, borderColor: COLORS.border
    },
    amenityText: { fontSize: 14, fontWeight: '500', color: COLORS.text },

    descriptionText: { fontSize: 14, color: COLORS.text, lineHeight: 22, fontStyle: 'italic' },

    // Footer
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: COLORS.white,
        padding: SPACING.l,
        borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    bookButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    bookButtonText: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
});
