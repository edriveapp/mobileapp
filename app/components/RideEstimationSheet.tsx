import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RideTier {
    id: string;
    name: string;
    image: string; // URL or local asset
    price: number;
    eta: number; // minutes
    description: string;
}

const MOCK_TIERS: RideTier[] = [
    {
        id: 'lite',
        name: 'Edrive Lite',
        image: 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png', // Placeholder
        price: 1500,
        eta: 4,
        description: 'Affordable, compact rides',
    },
    {
        id: 'comfort',
        name: 'Comfort',
        image: 'https://cdn-icons-png.flaticon.com/512/75/75702.png', // Placeholder
        price: 2200,
        eta: 6,
        description: 'Newer cars, more legroom',
    },
    {
        id: 'van',
        name: 'Van',
        image: 'https://cdn-icons-png.flaticon.com/512/2555/2555013.png', // Placeholder
        price: 4500,
        eta: 12,
        description: 'Groups of up to 6',
    },
];

interface RideEstimationSheetProps {
    destination: string;
    onRequestRide: (tier: RideTier) => void;
}

export default function RideEstimationSheet({ destination, onRequestRide }: RideEstimationSheetProps) {
    const [selectedTier, setSelectedTier] = useState<string>(MOCK_TIERS[0].id);

    const handleSelect = (id: string) => {
        setSelectedTier(id);
    };

    const handleRequest = () => {
        const tier = MOCK_TIERS.find(t => t.id === selectedTier);
        if (tier) onRequestRide(tier);
    };

    return (
        <View style={styles.container}>
            {/* Header / Destination Preview */}
            <View style={styles.header}>
                <Text style={styles.title}>Choose a ride</Text>
                <View style={styles.destRow}>
                    <Ionicons name="location" size={16} color={COLORS.primary} />
                    <Text style={styles.destText} numberOfLines={1}>To {destination}</Text>
                </View>
            </View>

            {/* Tiers List */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tiersContainer}
            >
                {MOCK_TIERS.map((tier) => {
                    const isSelected = selectedTier === tier.id;
                    return (
                        <TouchableOpacity
                            key={tier.id}
                            style={[
                                styles.tierCard,
                                isSelected && styles.tierCardSelected
                            ]}
                            onPress={() => handleSelect(tier.id)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.tierHeader}>
                                <Text style={[styles.tierName, isSelected && styles.textSelected]}>{tier.name}</Text>
                                {isSelected && <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />}
                            </View>

                            <Image source={{ uri: tier.image }} style={styles.tierImage} resizeMode="contain" />

                            <Text style={[styles.tierPrice, isSelected && styles.textSelected]}>
                                ₦{tier.price.toLocaleString()}
                            </Text>
                            <Text style={[styles.tierEta, isSelected && styles.textSelected]}>
                                {tier.eta} min
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Payment Method Preview (Static for now) */}
            <View style={styles.paymentRow}>
                <View style={styles.paymentMethod}>
                    <Ionicons name="cash-outline" size={20} color={COLORS.text} />
                    <Text style={styles.paymentText}>Cash</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
            </View>

            {/* Request Button */}
            <TouchableOpacity style={styles.requestButton} onPress={handleRequest}>
                <Text style={styles.requestButtonText}>
                    Confirm {MOCK_TIERS.find(t => t.id === selectedTier)?.name}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: SPACING.l,
        paddingBottom: 40, // standard safe area
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        marginBottom: SPACING.m,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.semibold,
        marginBottom: 8,
    },
    destRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.surface,
        padding: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    destText: {
        fontSize: 14,
        color: COLORS.text,
        fontFamily: Fonts.rounded,
        maxWidth: 250,
    },
    tiersContainer: {
        gap: 12,
        paddingBottom: SPACING.l,
    },
    tierCard: {
        width: 140,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        alignItems: 'center',
    },
    tierCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight,
    },
    tierHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    tierName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.semibold,
    },
    textSelected: {
        color: COLORS.primary,
    },
    tierImage: {
        width: 80,
        height: 50,
        marginBottom: 12,
    },
    tierPrice: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.semibold,
    },
    tierEta: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        marginBottom: 12,
    },
    paymentMethod: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    paymentText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
        fontFamily: Fonts.rounded,
    },
    requestButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    requestButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.white,
        fontFamily: Fonts.semibold,
    },
});
