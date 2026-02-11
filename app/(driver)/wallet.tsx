import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
// 1. IMPORT SafeAreaView from the correct library
import { SafeAreaView } from 'react-native-safe-area-context';

import { Transaction, useWalletStore } from '@/app/stores/walletStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

export default function WalletScreen() {
    const router = useRouter();
    const {
        balance,
        commissionDue,
        transactions,
        payCommission,
        fundWallet,
        isAccountAtRisk
    } = useWalletStore();

    const [loading, setLoading] = useState(false);
    const atRisk = isAccountAtRisk();

    const handlePayCommission = () => {
        if (balance < commissionDue) {
            Alert.alert("Insufficient Funds", "Please fund your wallet to pay the commission.");
            return;
        }

        Alert.alert(
            "Pay Commission",
            `Are you sure you want to pay ₦${commissionDue.toLocaleString()}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Pay Now",
                    onPress: async () => {
                        setLoading(true);
                        // Simulate API call
                        setTimeout(() => {
                            payCommission();
                            setLoading(false);
                            Alert.alert("Success", "Commission paid successfully!");
                        }, 1500);
                    }
                }
            ]
        );
    };

    const handleFundWallet = () => {
        Alert.alert("Fund Wallet", "This feature will integrate with a payment gateway. Simulating ₦10,000.", [
            { text: "Cancel", style: "cancel" },
            { text: "Simulate Fund", onPress: () => fundWallet(10000) }
        ]);
    };

    const renderTransactionItem = ({ item }: { item: Transaction }) => {
        const isCredit = item.type === 'credit';
        
        return (
            <View style={styles.transactionItem}>
                <View style={[styles.iconContainer, { backgroundColor: isCredit ? '#E0F2F1' : '#FFEBEE' }]}>
                    <Ionicons
                        name={isCredit ? "arrow-down" : "arrow-up"}
                        size={20}
                        color={isCredit ? "#00695C" : "#C62828"}
                    />
                </View>
                <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>{item.description}</Text>
                    <Text style={styles.transactionDate}>{new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString()}</Text>
                </View>
                <Text style={[styles.transactionAmount, { color: isCredit ? "#00695C" : "#C62828" }]}>
                    {isCredit ? "+" : "-"}₦{item.amount.toLocaleString()}
                </Text>
            </View>
        );
    };

    // Components to render at the top of the list (scrolling with content)
    const ListHeader = () => (
        <View>
            {/* Warning Banner */}
            {atRisk && (
                <View style={styles.warningBanner}>
                    <Ionicons name="warning" size={20} color="#fff" />
                    <Text style={styles.warningText}>
                        Overdue Commission! Your account is at risk of suspension. Pay immediately.
                    </Text>
                </View>
            )}

            <View style={styles.balanceContainer}>
                {/* Main Balance Card */}
                <View style={styles.mainBalanceCard}>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <Text style={styles.balanceValue}>₦{balance.toLocaleString()}</Text>
                    <TouchableOpacity style={styles.fundButton} onPress={handleFundWallet}>
                        <Ionicons name="add" size={16} color="#005124" />
                        <Text style={styles.fundButtonText}>Fund Wallet</Text>
                    </TouchableOpacity>
                </View>

                {/* Commission Card */}
                <View style={styles.commissionCard}>
                    <View>
                        <Text style={styles.commissionLabel}>Commission Due</Text>
                        <Text style={[styles.commissionValue, { color: commissionDue > 0 ? '#C62828' : '#005124' }]}>
                            ₦{commissionDue.toLocaleString()}
                        </Text>
                    </View>
                    {commissionDue > 0 && (
                        <TouchableOpacity
                            style={styles.payButton}
                            onPress={handlePayCommission}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.payButtonText}>Pay Now</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <Text style={styles.sectionTitle}>Recent Transactions</Text>
        </View>
    );

    return (
        // 2. USE SafeAreaView with edges top
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

            {/* 3. FIXED HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Wallet</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* 4. FLATLIST HANDLES SCROLLING FOR EVERYTHING */}
            <FlatList
                data={transactions}
                keyExtractor={(item) => item.id}
                renderItem={renderTransactionItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={ListHeader} // Cards are now here
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No transactions yet.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    
    // Fixed Header Styles
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        zIndex: 10,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, fontFamily: Fonts.bold },

    // Scrollable Content Styles
    listContent: { 
        padding: SPACING.l,
        paddingBottom: 40 
    },

    warningBanner: {
        backgroundColor: '#D32F2F',
        padding: SPACING.m,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
        gap: 10,
    },
    warningText: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },

    balanceContainer: { marginBottom: SPACING.xl },

    // Main Balance Card (Green Theme)
    mainBalanceCard: {
        backgroundColor: '#005124',
        borderRadius: 16,
        padding: SPACING.l,
        marginBottom: SPACING.m,
        alignItems: 'center',
        shadowColor: "#005124",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    balanceLabel: { color: '#E8F5E9', fontSize: 14, marginBottom: 8, fontFamily: Fonts.rounded },
    balanceValue: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 16, fontFamily: Fonts.bold },
    fundButton: {
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    fundButtonText: { color: '#005124', fontWeight: 'bold', fontSize: 14 },

    // Commission Card
    commissionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: SPACING.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    commissionLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 },
    commissionValue: { fontSize: 20, fontWeight: 'bold' },
    payButton: { backgroundColor: '#C62828', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    payButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.m, fontFamily: Fonts.bold },

    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: SPACING.m,
        borderRadius: 12,
        marginBottom: SPACING.s,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    transactionDetails: { flex: 1 },
    transactionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
    transactionDate: { fontSize: 11, color: COLORS.textSecondary },
    transactionAmount: { fontSize: 14, fontWeight: 'bold' },

    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: COLORS.textSecondary },
});