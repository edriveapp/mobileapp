import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Export this if you need to use the type elsewhere
export interface RideTier {
    id: string;
    name: string;
    image: string;
    price: number;
    eta: number;
    description: string;
}

const MOCK_TIERS: RideTier[] = [
    {
        id: 'lite',
        name: 'Edrive Lite',
        image: 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png',
        price: 1500,
        eta: 4,
        description: 'Affordable, compact rides',
    },
    {
        id: 'comfort',
        name: 'Comfort',
        image: 'https://cdn-icons-png.flaticon.com/512/75/75702.png',
        price: 2200,
        eta: 6,
        description: 'Newer cars, more legroom',
    },
    {
        id: 'van',
        name: 'Van',
        image: 'https://cdn-icons-png.flaticon.com/512/2555/2555013.png',
        price: 4500,
        eta: 12,
        description: 'Groups of up to 6',
    },
];

interface RideEstimationSheetProps {
    destination?: string; // Optional because logic might default to "Destination"
    visible?: boolean;    // Added to satisfy index.tsx TS error
    onClose: () => void;  // Added for closing the sheet
    onConfirm: (tierId: string, scheduledTime?: string) => void; // Update signature
}

import DateTimePicker from '@react-native-community/datetimepicker';

export default function RideEstimationSheet({
    destination = "Destination",
    onClose,
    onConfirm
}: RideEstimationSheetProps) {
    const [selectedTier, setSelectedTier] = useState<string>(MOCK_TIERS[0].id);
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [isScheduled, setIsScheduled] = useState(false);

    const handleSelect = (id: string) => {
        setSelectedTier(id);
    };

    const handleRequest = () => {
        // Pass tier ID and optional scheduled time
        // We cast to any or update interface in props. 
        // Index.tsx needs to be updated to accept 2 args or object.
        // For now, let's assume onConfirm handles it? 
        // Wait, props definition: onConfirm: (tierId: string) => void;
        // I need to update interface first.
        // But replace_file_content replaces block.
        // I'll assume index.tsx will be updated next.
        onConfirm(selectedTier, isScheduled ? date.toISOString() : undefined);
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setShowPicker(false);
        setDate(currentDate);
        setIsScheduled(true);
    };

    return (
        <View style={styles.container}>
            {/* ... Header ... */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.title}>Choose a ride</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.destRow}>
                    <Ionicons name="location" size={16} color={COLORS.primary} />
                    <Text style={styles.destText} numberOfLines={1}>To {destination}</Text>
                </View>
            </View>

            {/* Schedule Button */}
            <TouchableOpacity
                style={styles.scheduleRow}
                onPress={() => setShowPicker(true)}
            >
                <Ionicons name="time-outline" size={20} color={COLORS.text} />
                <Text style={styles.scheduleText}>
                    {isScheduled ? `Pick up: ${date.toLocaleString()}` : 'Schedule for later'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {showPicker && (
                <DateTimePicker
                    testID="dateTimePicker"
                    value={date}
                    mode={'datetime'}
                    is24Hour={true}
                    onChange={onDateChange}
                />
            )}

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

            {/* Payment Method Preview */}
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
                    {isScheduled ? 'Schedule' : 'Confirm'} {MOCK_TIERS.find(t => t.id === selectedTier)?.name}
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
        paddingBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        marginBottom: SPACING.m,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    closeBtn: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.semibold,
    },
    destRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.surface, // Ensure this color exists in theme or use '#F5F5F5'
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
        backgroundColor: '#F0F9FF', // Light primary color
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
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        marginBottom: 10,
        backgroundColor: COLORS.surface,
        borderRadius: 10,
    },
    scheduleText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        color: COLORS.text,
        fontFamily: Fonts.rounded,
    },
});