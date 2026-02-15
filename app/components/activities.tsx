import React, { useEffect, useState } from 'react';
import { FlatList, TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../services/api';
import EmptyState from './common/Emptystate';
import { COLORS, SPACING } from '@/constants/theme';

export default function ActivitiesScreen() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/rides/history');
      setRides(res.data[0]); // NestJS returns [data, count]
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push(`/trip-details/${item.id}`)}
    >
      <View style={styles.row}>
        <Text style={styles.date}>{new Date(item.createdAt).toDateString()}</Text>
        <Text style={[styles.status, { color: item.status === 'COMPLETED' ? 'green' : 'red' }]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.address}>{item.destination.address}</Text>
      <Text style={styles.price}>₦{item.fare}</Text>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator style={{marginTop:50}} size="large" color={COLORS.primary} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={rides}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: SPACING.m }}
        ListEmptyComponent={
          <EmptyState 
            title="No recent trips" 
            message="You haven't taken any trips yet." 
            icon="car-sport-outline"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  date: { color: 'gray', fontSize: 12 },
  status: { fontWeight: 'bold', fontSize: 12 },
  address: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  price: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary }
});