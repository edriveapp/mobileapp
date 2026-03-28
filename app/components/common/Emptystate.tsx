import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string;
}

export default function EmptyState({ title, message, icon = 'file-tray-outline' }: EmptyStateProps) {
  const iconLabel = (icon || '•').split('-')[0]?.slice(0, 1).toUpperCase() || '•';

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>{iconLabel}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, marginTop: SPACING.xl * 2 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.m },
  iconText: { fontSize: 28, fontWeight: '700', color: COLORS.textSecondary },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  message: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
});
