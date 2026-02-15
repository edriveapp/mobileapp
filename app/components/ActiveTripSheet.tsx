import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, Fonts } from '@/constants/theme';

export interface ActiveTripSheetProps {
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
    onCall?: () => void;
    onChat?: () => void;
    onCancel?: () => void;
}

export default function ActiveTripSheet({
    status,
    driver,
    eta,
    destAddress,
    onEndTrip,
    onCall,
    onChat,
    onCancel
}: ActiveTripSheetProps) {

    // Helper to get status text and color
    const getStatusInfo = () => {
        switch (status) {
            case 'driver_en_route':
                return { title: `Driver is ${eta || 'nearby'}`, color: COLORS.text, sub: 'Meet at pickup point' };
            case 'driver_arrived':
                return { title: 'Driver has arrived', color: COLORS.primary, sub: 'Please meet your driver' };
            case 'in_progress':
                return { title: 'Heading to destination', color: COLORS.success, sub: destAddress || 'On trip' };
            default:
                return { title: 'Trip Active', color: COLORS.text, sub: '' };
        }
    };

    const statusInfo = getStatusInfo();

    return (
        <View style={styles.container}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            {/* 1. Status Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.statusTitle, { color: statusInfo.color }]}>{statusInfo.title}</Text>
                    <Text style={styles.statusSub}>{statusInfo.sub}</Text>
                </View>
                {eta && status === 'driver_en_route' && (
                    <View style={styles.etaBadge}>
                        <Text style={styles.etaText}>{eta}</Text>
                    </View>
                )}
            </View>

            <View style={styles.divider} />

            {/* 2. Driver & Vehicle Profile */}
            <View style={styles.profileContainer}>
                <View style={styles.driverInfo}>
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: driver.image }} style={styles.avatar} />
                        <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={10} color="#FFD700" />
                            <Text style={styles.ratingText}>{driver.rating}</Text>
                        </View>
                    </View>
                    <View style={styles.texts}>
                        <Text style={styles.driverName}>{driver.name}</Text>
                        <Text style={styles.plateNumber}>{driver.plate}</Text>
                        <Text style={styles.vehicleModel}>{driver.vehicle}</Text>
                    </View>
                </View>
                
                {/* Vehicle Image Placeholder (Optional visual) */}
                <Image 
                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png' }} 
                    style={styles.carImage} 
                    resizeMode="contain"
                />
            </View>

            {/* 3. Action Buttons Grid */}
            <View style={styles.actionsGrid}>
                <TouchableOpacity style={styles.actionBtn} onPress={onCall || (() => Linking.openURL(`tel:${driver.phone}`))}>
                    <View style={[styles.iconCircle, { backgroundColor: '#E0F2F1' }]}>
                        <Ionicons name="call" size={24} color={COLORS.primary} />
                    </View>
                    <Text style={styles.actionLabel}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={onChat}>
                    <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                        <Ionicons name="chatbubble-ellipses" size={24} color="#1E88E5" />
                    </View>
                    <Text style={styles.actionLabel}>Chat</Text>
                </TouchableOpacity>

                {status !== 'in_progress' ? (
                     <TouchableOpacity style={styles.actionBtn} onPress={onCancel}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
                            <Ionicons name="close" size={24} color="#D32F2F" />
                        </View>
                        <Text style={styles.actionLabel}>Cancel</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.actionBtn}>
                        <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                             <Ionicons name="shield-checkmark" size={24} color={COLORS.success} />
                        </View>
                        <Text style={styles.actionLabel}>Safety</Text>
                    </TouchableOpacity>
                )}

                 {/* Demo Button: End Trip (Only visible if handler provided) */}
                 {onEndTrip && (
                    <TouchableOpacity style={styles.actionBtn} onPress={onEndTrip}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="flag" size={24} color="#F57C00" />
                        </View>
                        <Text style={styles.actionLabel}>End (Dev)</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: SPACING.l,
        paddingBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    handleContainer: { alignItems: 'center', marginBottom: SPACING.m },
    handle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2 },
    
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.m,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
        marginBottom: 4,
    },
    statusSub: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontFamily: Fonts.mono,
    },
    etaBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    etaText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#F5F5F5',
        marginVertical: SPACING.s,
    },
    profileContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        marginRight: SPACING.m,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#eee',
    },
    ratingBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: COLORS.white,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    ratingText: {
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 2,
    },
    texts: {
        justifyContent: 'center',
    },
    driverName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.semibold,
    },
    plateNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        backgroundColor: '#F5F5F5',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginVertical: 2,
        overflow: 'hidden', // important for borderRadius on text
    },
    vehicleModel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    carImage: {
        width: 60,
        height: 35,
        opacity: 0.8,
    },
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: SPACING.s,
    },
    actionBtn: {
        alignItems: 'center',
        width: 60,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionLabel: {
        fontSize: 12,
        color: COLORS.text,
        fontFamily: Fonts.mono,
    },
});