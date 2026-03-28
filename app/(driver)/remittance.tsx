import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Alert, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Transaction, useWalletStore } from '@/app/stores/walletStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

export default function RemittanceScreen() {
  const router = useRouter();
  const { commissionDue, transactions, fetchWallet, payCommission } = useWalletStore();

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const remittanceTransactions = useMemo(
    () => transactions.filter((txn) => txn.type === 'commission_deduction' || txn.type === 'debit'),
    [transactions]
  );

  const totalPaid = useMemo(
    () =>
      remittanceTransactions
        .filter((txn) => txn.type === 'commission_deduction')
        .reduce((sum, txn) => sum + Number(txn.amount || 0), 0),
    [remittanceTransactions]
  );

  const handlePayNow = async () => {
    if (commissionDue <= 0) {
      Alert.alert('Nothing due', 'Your remittance is currently cleared.');
      return;
    }

    try {
      await payCommission(commissionDue);
      Alert.alert('Payment successful', 'Outstanding remittance has been paid.');
    } catch (error: any) {
      Alert.alert('Payment failed', error?.message || 'Could not pay remittance right now.');
    }
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const isCommission = item.type === 'commission_deduction';
    return (
      <View style={styles.itemCard}>
        <View style={[styles.itemIcon, isCommission ? styles.itemIconDanger : styles.itemIconNeutral]}>
          <Ionicons name={isCommission ? 'receipt-outline' : 'arrow-up'} size={18} color={isCommission ? '#B42318' : '#5F6D7A'} />
        </View>
        <View style={styles.itemBody}>
          <Text style={styles.itemTitle}>{item.description || 'Remittance activity'}</Text>
          <Text style={styles.itemDate}>
            {new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString()}
          </Text>
        </View>
        <Text style={styles.itemAmount}>-₦{Number(item.amount || 0).toLocaleString()}</Text>
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
        <Text style={styles.headerTitle}>Remittance</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={remittanceTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Outstanding Remittance</Text>
            <Text style={styles.summaryValue}>₦{Number(commissionDue || 0).toLocaleString()}</Text>
            <Text style={styles.summaryMeta}>Total paid: ₦{totalPaid.toLocaleString()}</Text>
            <TouchableOpacity style={styles.payButton} onPress={handlePayNow}>
              <Text style={styles.payButtonText}>Pay Outstanding</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No remittance records yet</Text>
            <Text style={styles.emptyText}>Commission deductions and payouts will show here.</Text>
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
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: COLORS.text,
  },
  listContent: {
    padding: SPACING.l,
    paddingBottom: SPACING.xl,
  },
  summaryCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    padding: SPACING.l,
    marginBottom: SPACING.l,
    borderWidth: 1,
    borderColor: '#FFD8D8',
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: Fonts.rounded,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: '#B42318',
    marginBottom: 4,
  },
  summaryMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
  },
  payButton: {
    backgroundColor: '#B42318',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  itemIconDanger: {
    backgroundColor: '#FEE4E2',
  },
  itemIconNeutral: {
    backgroundColor: '#F2F4F7',
  },
  itemBody: { flex: 1 },
  itemTitle: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: COLORS.text,
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  itemAmount: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#B42318',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: COLORS.text,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
