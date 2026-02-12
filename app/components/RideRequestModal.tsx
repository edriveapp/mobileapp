import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

interface RideRequestModalProps {
    isVisible: boolean;
    request: {
        id: string;
        passengerName: string;
        passengerRating: number;
        pickup: string;
        dropoff: string;
        distance: string;
        price: number;
        eta: string;
    } | null;
    onAccept: () => void;
    onDecline: () => void;
}

export default function RideRequestModal({ isVisible, request, onAccept, onDecline }: RideRequestModalProps) {
    const [timeLeft, setTimeLeft] = useState(30);

    useEffect(() => {
        if (isVisible) {
            setTimeLeft(30);
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        onDecline(); // Auto decline
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isVisible]);

    if (!request) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onDecline}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header: Timer */}
                    <View style={styles.header}>
                        <Text style={styles.title}>New Request</Text>
                        <View style={styles.timerBadge}>
                            <Ionicons name="time" size={16} color={COLORS.white} />
                            <Text style={styles.timerText}>{timeLeft}s</Text>
                        </View>
                    </View>

                    {/* Passenger Info */}
                    <View style={styles.passengerCard}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={24} color={COLORS.textSecondary} />
                        </View>
                        <View style={styles.passengerInfo}>
                            <Text style={styles.passengerName}>{request.passengerName}</Text>
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={12} color="#FFD700" />
                                <Text style={styles.ratingText}>{request.passengerRating}</Text>
                            </View>
                        </View>
                        <Text style={styles.price}>₦{request.price.toLocaleString()}</Text>
                    </View>

                    {/* Route Info */}
                    <View style={styles.routeContainer}>
                        <View style={styles.routeRow}>
                            <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
                            <Text style={styles.address} numberOfLines={1}>{request.pickup}</Text>
                        </View>
                        <View style={styles.routeLine} />
                        <View style={styles.routeRow}>
                            <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
                            <Text style={styles.address} numberOfLines={1}>{request.dropoff}</Text>
                        </View>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Ionicons name="resize" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.statText}>{request.distance}</Text>
                        </View>
                        <View style={styles.stat}>
                            <Ionicons name="navigate" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.statText}>~{request.eta}</Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
                            <Text style={styles.declineText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
                            <Text style={styles.acceptText}>Accept Ride</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: SPACING.l,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.semibold,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.error,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    timerText: {
        color: COLORS.white,
        fontWeight: '600',
        fontFamily: Fonts.mono,
    },
    passengerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: SPACING.m,
        borderRadius: 16,
        marginBottom: SPACING.m,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    passengerInfo: {
        flex: 1,
    },
    passengerName: {
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
    ratingText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
    },
    price: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.primary,
        fontFamily: Fonts.bold,
    },
    routeContainer: {
        marginBottom: SPACING.m,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 4,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    routeLine: {
        width: 2,
        height: 20,
        backgroundColor: COLORS.border,
        marginLeft: 4,
    },
    address: {
        fontSize: 14,
        color: COLORS.text,
        fontFamily: Fonts.rounded,
        flex: 1,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: SPACING.l,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
    },
    declineButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#FFEBEE',
        alignItems: 'center',
    },
    declineText: {
        color: COLORS.error,
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    acceptButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    acceptText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
});
