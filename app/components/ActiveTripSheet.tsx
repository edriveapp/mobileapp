import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ActiveTripSheetProps {
    status: 'driver_en_route' | 'driver_arrived' | 'in_progress';
    driver: {
        name: string;
        rating: number;
        vehicle: string;
        plate: string;
        image: string;
        phone: string;
    };
    eta?: string;
    destAddress?: string;
    onEndTrip?: () => void; // For testing/demo
}

export default function ActiveTripSheet({ status, driver, eta, destAddress, onEndTrip }: ActiveTripSheetProps) {

    const handleCall = () => {
        Linking.openURL(`tel:${driver.phone}`);
    };

    const handleShare = () => {
        // Use Share API
        alert('Sharing trip details...');
    };

    const handleEmergency = () => {
        alert('Contacting Emergency Services...');
    };

    const renderHeader = () => {
        switch (status) {
            case 'driver_en_route':
                return (
                    <View style={styles.header}>
                        <Text style={styles.statusTitle}>Driver is on the way</Text>
                        <Text style={styles.statusSubtitle}>Arriving in {eta || '5 mins'}</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressJson, { width: '40%' }]} />
                        </View>
                    </View>
                );
            case 'driver_arrived':
                return (
                    <View style={styles.header}>
                        <Text style={styles.statusTitle}>Driver has arrived</Text>
                        <Text style={styles.statusSubtitle}>Waiting for you at pickup point</Text>
                        <View style={styles.timerBadge}>
                            <Text style={styles.timerText}>02:30</Text>
                        </View>
                    </View>
                );
            case 'in_progress':
                return (
                    <View style={styles.header}>
                        <Text style={styles.statusTitle}>Heading to Destination</Text>
                        <Text style={styles.statusSubtitle}>{destAddress || 'Your Destination'}</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressJson, { width: '70%', backgroundColor: COLORS.success }]} />
                        </View>
                    </View>
                );
        }
    };

    return (
        <View style={styles.container}>
            {/* Status Header */}
            {renderHeader()}

            {/* Driver & Car Info */}
            <View style={styles.driverCard}>
                <Image source={{ uri: driver.image }} style={styles.avatar} />
                <View style={styles.driverInfo}>
                    <Text style={styles.name}>{driver.name}</Text>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={styles.rating}>{driver.rating}</Text>
                        <Text style={styles.vehicle}> • {driver.vehicle}</Text>
                    </View>
                    <View style={styles.plateContainer}>
                        <Text style={styles.plate}>{driver.plate}</Text>
                    </View>
                </View>

                {/* Communication Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
                        <Ionicons name="call" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Safety Toolkit (Visible In Progress) */}
            {status === 'in_progress' && (
                <View style={styles.safetyRow}>
                    <TouchableOpacity style={styles.safetyBtn} onPress={handleShare}>
                        <Ionicons name="share-outline" size={20} color={COLORS.text} />
                        <Text style={styles.safetyText}>Share Trip</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.safetyBtn} onPress={handleEmergency}>
                        <Ionicons name="warning-outline" size={20} color={COLORS.error} />
                        <Text style={[styles.safetyText, { color: COLORS.error }]}>Emergency</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Arrived State Extra */}
            {status === 'driver_arrived' && (
                <View style={styles.arrivedNote}>
                    <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
                    <Text style={styles.noteText}>Please meet the driver at the pinned location.</Text>
                </View>
            )}

            {/* Debug/Demo Button */}
            {onEndTrip && (
                <TouchableOpacity onPress={onEndTrip} style={{ marginTop: 10, alignSelf: 'center' }}>
                    <Text style={{ color: 'gray' }}>Debug: End Trip</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: SPACING.l,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        marginBottom: SPACING.m,
        alignItems: 'center',
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.bold,
    },
    statusSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 8,
        fontFamily: Fonts.rounded,
    },
    progressBar: {
        width: '100%',
        height: 6,
        backgroundColor: COLORS.surface,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressJson: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },
    timerBadge: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    timerText: {
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.semibold,
    },
    driverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        backgroundColor: '#eee',
    },
    driverInfo: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.semibold,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    rating: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
    },
    vehicle: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
    },
    plateContainer: {
        backgroundColor: COLORS.surface,
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
    },
    plate: {
        fontSize: 12,
        fontFamily: Fonts.mono,
        color: COLORS.text,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    safetyRow: {
        flexDirection: 'row',
        paddingTop: SPACING.m,
        justifyContent: 'space-around',
    },
    safetyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 8,
    },
    safetyText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
        fontFamily: Fonts.rounded,
    },
    divider: {
        width: 1,
        backgroundColor: COLORS.border,
        height: '100%',
    },
    arrivedNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
        gap: 8,
    },
    noteText: {
        color: '#1565C0',
        fontSize: 12,
        flex: 1,
        fontFamily: Fonts.rounded,
    },
});
