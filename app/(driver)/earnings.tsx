import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Transaction, useWalletStore } from '@/app/stores/walletStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

export default function EarningsScreen() {
  const router = useRouter();
  const { transactions, fetchWallet } = useWalletStore();

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const earnings = useMemo(
    () => transactions.filter((txn) => ['driver_earning', 'passenger_payment', 'wallet_adjustment_credit'].includes(txn.type)),
    [transactions]
  );

  const totalEarnings = useMemo(
    () => earnings.filter((txn) => txn.type === 'driver_earning').reduce((sum, txn) => sum + Number(txn.amount || 0), 0),
    [earnings]
  );

  const renderItem = ({ item }: { item: Transaction }) => {
    const isDriverEarning = item.type === 'driver_earning';
    const grossFare = Number(item.metadata?.grossFare || 0);
    const platformCut = Number(item.metadata?.platformCut || 0);
    const insuranceReserve = Number(item.metadata?.insuranceReserveAmount || 0);

    return (
      <View style={styles.itemCard}>
        <View style={[styles.itemIcon, isDriverEarning ? styles.itemIconSuccess : styles.itemIconInfo]}>
          <Ionicons name={isDriverEarning ? 'cash-outline' : 'card-outline'} size={18} color={isDriverEarning ? '#00695C' : '#2457C5'} />
        </View>
        <View style={styles.itemBody}>
          <Text style={styles.itemTitle}>{item.description || 'Trip transaction'}</Text>
          <Text style={styles.itemDate}>{new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString()}</Text>
          {item.rideId ? <Text style={styles.metaText}>Trip ID: {item.rideId.slice(0, 8)}</Text> : null}
          {item.paymentReference ? <Text style={styles.metaText}>Payment Ref: {item.paymentReference}</Text> : null}
          {grossFare > 0 ? <Text style={styles.metaText}>Gross Fare: ₦{grossFare.toLocaleString()}</Text> : null}
          {platformCut > 0 ? <Text style={styles.metaText}>Platform Cut: ₦{platformCut.toLocaleString()}</Text> : null}
          {insuranceReserve > 0 ? <Text style={styles.metaText}>Insurance Reserve: ₦{insuranceReserve.toLocaleString()}</Text> : null}
        </View>
        <Text style={styles.itemAmount}>{item.direction === 'debit' ? '-' : '+'}₦{Number(item.amount || 0).toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={earnings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Driver Earnings</Text>
            <Text style={styles.summaryValue}>₦{totalEarnings.toLocaleString()}</Text>
            <Text style={styles.summaryMeta}>{earnings.length} earning transaction{earnings.length === 1 ? '' : 's'}</Text>
          </View>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No earnings yet</Text>
            <Text style={styles.emptyText}>Completed trip earnings and passenger payments will appear here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { width: 24 },
  headerTitle: { fontSize: 18, fontFamily: Fonts.bold, color: COLORS.text },
  listContent: { padding: SPACING.l, paddingBottom: SPACING.xl },
  summaryCard: {
    backgroundColor: '#E9F7EF',
    borderRadius: 14,
    padding: SPACING.l,
    marginBottom: SPACING.l,
    borderWidth: 1,
    borderColor: '#CBEAD8',
  },
  summaryLabel: { fontSize: 13, fontFamily: Fonts.rounded, color: COLORS.textSecondary, marginBottom: 6 },
  summaryValue: { fontSize: 32, fontFamily: Fonts.bold, color: '#005124', marginBottom: 6 },
  summaryMeta: { fontSize: 13, color: COLORS.textSecondary },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: SPACING.s,
    backgroundColor: '#fff',
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.m,
  },
  itemIconSuccess: { backgroundColor: '#E0F2F1' },
  itemIconInfo: { backgroundColor: '#E8EEFF' },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontFamily: Fonts.semibold, color: COLORS.text, marginBottom: 2 },
  itemDate: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6 },
  metaText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  itemAmount: { fontSize: 14, fontFamily: Fonts.bold, color: '#00695C' },
  emptyState: { alignItems: 'center', marginTop: 64 },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.semibold, color: COLORS.text, marginBottom: 4 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
});
