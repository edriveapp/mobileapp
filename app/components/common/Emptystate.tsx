import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function EmptyState({ title, message, icon = 'file-tray-outline' }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={40} color={COLORS.textSecondary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, marginTop: SPACING.xl * 2 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.m },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  message: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
});