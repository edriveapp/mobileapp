import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePaymentStore } from '@/app/stores/paymentStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

export default function PaymentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        tripId: string;
        price: string;
        origin: string;
        destination: string;
        date: string;
        driverName: string;
        seats: string;
    }>();

    const { processPayment, isProcessing } = usePaymentStore();
    const [selectedMethod, setSelectedMethod] = useState<'paystack' | 'wallet'>('paystack');
    const price = parseFloat(params.price || '0');

    const handlePay = async () => {
        if (price <= 0) {
            Alert.alert('Error', 'Invalid trip price.');
            return;
        }

        try {
            const authUrl = await processPayment(price);
            // In production, open authUrl in WebBrowser for Paystack checkout
            // For now, show success
            Alert.alert(
                '✅ Booking Confirmed',
                `You've successfully booked your trip from ${params.origin} to ${params.destination}.`,
                [
                    {
                        text: 'View My Trips',
                        onPress: () => router.replace('/(tabs)/trips'),
                    },
                ]
            );
        } catch (error: any) {
            Alert.alert('Payment Failed', error.message || 'Something went wrong. Please try again.');
        }
    };

    const PaymentMethod = ({
        icon,
        label,
        subtitle,
        value,
    }: {
        icon: any;
        label: string;
        subtitle: string;
        value: 'paystack' | 'wallet';
    }) => (
        <TouchableOpacity
            style={[styles.methodCard, selectedMethod === value && styles.methodCardActive]}
            onPress={() => setSelectedMethod(value)}
        >
            <View style={[styles.methodIcon, selectedMethod === value && styles.methodIconActive]}>
                <Ionicons name={icon} size={22} color={selectedMethod === value ? '#fff' : COLORS.text} />
            </View>
            <View style={styles.methodContent}>
                <Text style={[styles.methodLabel, selectedMethod === value && styles.methodLabelActive]}>{label}</Text>
                <Text style={styles.methodSubtitle}>{subtitle}</Text>
            </View>
            <View style={[styles.radio, selectedMethod === value && styles.radioActive]}>
                {selectedMethod === value && <View style={styles.radioDot} />}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Book Trip</Text>
                <View style={{ width: 32 }} />
            </View>

            <View style={styles.content}>
                {/* Trip Summary Card */}
                <View style={styles.tripCard}>
                    <View style={styles.tripHeader}>
                        <Ionicons name="car-sport" size={20} color={COLORS.primary} />
                        <Text style={styles.tripHeaderText}>Trip Summary</Text>
                    </View>

                    <View style={styles.routeContainer}>
                        {/* Origin */}
                        <View style={styles.routeRow}>
                            <View style={styles.routeDot} />
                            <View style={styles.routeInfo}>
                                <Text style={styles.routeLabel}>From</Text>
                                <Text style={styles.routeValue} numberOfLines={1}>{params.origin || 'Origin'}</Text>
                            </View>
                        </View>

                        <View style={styles.routeLine} />

                        {/* Destination */}
                        <View style={styles.routeRow}>
                            <View style={[styles.routeDot, styles.routeDotEnd]} />
                            <View style={styles.routeInfo}>
                                <Text style={styles.routeLabel}>To</Text>
                                <Text style={styles.routeValue} numberOfLines={1}>{params.destination || 'Destination'}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.tripDetails}>
                        {params.date && (
                            <View style={styles.detailChip}>
                                <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                                <Text style={styles.detailText}>{params.date}</Text>
                            </View>
                        )}
                        {params.driverName && (
                            <View style={styles.detailChip}>
                                <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
                                <Text style={styles.detailText}>{params.driverName}</Text>
                            </View>
                        )}
                        {params.seats && (
                            <View style={styles.detailChip}>
                                <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
                                <Text style={styles.detailText}>{params.seats} seat(s)</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Payment Method */}
                <Text style={styles.sectionTitle}>Payment Method</Text>

                <PaymentMethod
                    icon="card-outline"
                    label="Pay with Paystack"
                    subtitle="Card, Bank Transfer, USSD"
                    value="paystack"
                />
                <PaymentMethod
                    icon="wallet-outline"
                    label="E-Drive Wallet"
                    subtitle="Balance: ₦0.00"
                    value="wallet"
                />

                {/* Price Breakdown */}
                <View style={styles.priceCard}>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Trip Fare</Text>
                        <Text style={styles.priceValue}>₦{price.toLocaleString()}</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Service Fee</Text>
                        <Text style={styles.priceValue}>₦0</Text>
                    </View>
                    <View style={styles.priceDivider} />
                    <View style={styles.priceRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>₦{price.toLocaleString()}</Text>
                    </View>
                </View>
            </View>

            {/* Pay Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
                    onPress={handlePay}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="lock-closed" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.payButtonText}>Pay ₦{price.toLocaleString()}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, fontFamily: Fonts.bold },

    content: { flex: 1, padding: SPACING.l },

    // Trip Card
    tripCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: SPACING.l,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.xl,
    },
    tripHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
        gap: 8,
    },
    tripHeaderText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.bold,
    },
    routeContainer: { marginBottom: SPACING.m },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    routeDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
        borderWidth: 2,
        borderColor: '#C8E6C9',
    },
    routeDotEnd: {
        backgroundColor: '#D32F2F',
        borderColor: '#FFCDD2',
    },
    routeLine: {
        width: 2,
        height: 24,
        backgroundColor: COLORS.border,
        marginLeft: 5,
    },
    routeInfo: { flex: 1 },
    routeLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    routeValue: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.text,
        fontFamily: Fonts.rounded,
    },
    tripDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    detailChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    detailText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
    },

    // Payment Methods
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: SPACING.s,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    methodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        marginBottom: SPACING.s,
    },
    methodCardActive: {
        borderColor: COLORS.primary,
        backgroundColor: '#F1F8E9',
    },
    methodIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    methodIconActive: {
        backgroundColor: COLORS.primary,
    },
    methodContent: { flex: 1 },
    methodLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.rounded,
    },
    methodLabelActive: { color: COLORS.primary },
    methodSubtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioActive: { borderColor: COLORS.primary },
    radioDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
    },

    // Price
    priceCard: {
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: SPACING.l,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginTop: SPACING.m,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    priceLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
    },
    priceValue: {
        fontSize: 14,
        color: COLORS.text,
        fontFamily: Fonts.rounded,
    },
    priceDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 8,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        fontFamily: Fonts.bold,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        fontFamily: Fonts.bold,
    },

    // Footer
    footer: {
        padding: SPACING.l,
        paddingBottom: SPACING.xl,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    payButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    payButtonDisabled: { opacity: 0.6 },
    payButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
});
