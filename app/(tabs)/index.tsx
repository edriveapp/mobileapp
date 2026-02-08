import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';
import { LocationService } from '../services/locationService';
import { useAuthStore } from '../stores/authStore';
import { useTripStore } from '../stores/tripStore';
import { Trip } from '../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { trips, fetchTrips, isLoading } = useTripStore();

  const [locationState, setLocationState] = useState('Detecting...');
  const [emergencyNumbers, setEmergencyNumbers] = useState<{ police: string; ambulance: string; fire: string } | null>(null);

  useEffect(() => {
    loadLocationData();
    fetchTrips();
  }, []);

  const loadLocationData = async () => {
    const currentState = await LocationService.getCurrentState();
    setLocationState(currentState);
    setEmergencyNumbers(LocationService.getEmergencyNumbers(currentState));
  };

  const renderTripItem = ({ item }: { item: Trip }) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => router.push(`/trip-details/${item.id}`)}
    >
      <View style={styles.tripHeader}>
        <Text style={styles.tripRoute}>{item.origin} ➝ {item.destination}</Text>
        <Text style={styles.tripPrice}>₦{item.price.toLocaleString()}</Text>
      </View>
      <View style={styles.tripDetails}>
        <Text style={styles.tripTime}>{item.date} • {item.time}</Text>
        <Text style={[
          styles.tripSeats,
          { color: item.availableSeats > 0 ? COLORS.success : COLORS.error }
        ]}>
          {item.availableSeats} seats left
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header with Emergency Info */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name}</Text>
          <Text style={styles.roleBadge}>{user?.role === 'driver' ? 'Driver' : 'Rider'}</Text>
        </View>
        <View style={styles.emergencyContainer}>
          <Text style={styles.locationText}>📍 {locationState}</Text>
          {emergencyNumbers && (
            <View style={styles.numbersRow}>
              <Text style={styles.emergencyText}>👮 {emergencyNumbers.police}</Text>
              <Text style={styles.emergencyText}>🚑 {emergencyNumbers.ambulance}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {user?.role === 'driver' ? (
          <View style={styles.driverActions}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/(driver)/create-trip')}
            >
              <Text style={styles.createButtonText}>+ Create New Trip</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>My Upcoming Trips</Text>
          </View>
        ) : (
          <Text style={styles.sectionTitle}>Available Trips</Text>
        )}

        <FlatList
          data={trips}
          renderItem={renderTripItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchTrips} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No trips found nearby.</Text>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.l,
    paddingTop: 60, // Safe area
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  roleBadge: {
    color: COLORS.secondary,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  emergencyContainer: {
    alignItems: 'flex-end',
  },
  locationText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  numbersRow: {
    alignItems: 'flex-end',
  },
  emergencyText: {
    color: COLORS.white,
    fontSize: 12,
    marginBottom: 2,
  },
  content: {
    flex: 1,
    padding: SPACING.m,
  },
  driverActions: {
    marginBottom: SPACING.m,
  },
  createButton: {
    backgroundColor: COLORS.secondary,
    padding: SPACING.m,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  createButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  tripCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: 12,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.s,
  },
  tripRoute: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  tripPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripTime: {
    color: COLORS.textSecondary,
  },
  tripSeats: {
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: SPACING.xl,
  },
});
