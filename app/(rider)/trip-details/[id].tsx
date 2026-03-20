import { LocationService } from '@/app/services/locationService';
import { useTripStore } from '@/app/stores/tripStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PAYMENT_METHODS = [
  { id: 'card', label: 'Card', icon: 'card-outline' as const },
  { id: 'transfer', label: 'Transfer', icon: 'swap-horizontal-outline' as const },
  { id: 'cash', label: 'Cash', icon: 'cash-outline' as const },
];

const getAddressText = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.address || '';
};

const getDriverName = (driver: any) => {
  const fullName = [driver?.firstName, driver?.lastName].filter(Boolean).join(' ').trim();
  return fullName || driver?.name || driver?.email || 'Driver';
};

const formatTripDateTime = (trip: any) => {
  if (trip?.departureTime) {
    const departure = new Date(trip.departureTime);
    return departure.toLocaleString([], {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const date = trip?.date || 'Today';
  const time = trip?.time || 'Any time';
  return `${date} • ${time}`;
};

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { trips, availableTrips, activeTrips, history, bookTrip, isLoading } = useTripStore();
  const [loading, setLoading] = useState(true);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');

  const trip = useMemo(() => {
    const allTrips = [...trips, ...availableTrips, ...activeTrips, ...history];
    return allTrips.find((item: any) => item.id === id) || null;
  }, [activeTrips, availableTrips, history, id, trips]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(timer);
  }, []);

  const driver = trip?.driver || {};
  const driverName = getDriverName(driver);
  const driverPhone = driver?.phone || driver?.phoneNumber || null;
  const driverVehicle = trip?.tier || driver?.vehicleType || 'Vehicle details pending';
  const driverRating = Number(driver?.rating || 4.8).toFixed(1);
  const driverTrips = Number(driver?.tripsCompleted || 0);

  const handleCallDriver = () => {
    if (!driverPhone) {
      Alert.alert('No phone number', 'Driver phone number is not available yet.');
      return;
    }

    Linking.canOpenURL(`tel:${driverPhone}`).then((supported) => {
      if (!supported) {
        Alert.alert('Call unavailable', 'This device cannot place phone calls.');
        return;
      }
      Linking.openURL(`tel:${driverPhone}`).catch(() => {
        Alert.alert('Call failed', 'Could not open the phone dialer.');
      });
    });
  };

  const handleChatDriver = () => {
    if (!trip?.id) return;
    router.push(`/chat/${trip.id}`);
  };

  const confirmBooking = async () => {
    if (!trip?.id) return;

    try {
      const coords = await LocationService.getCurrentCoordinates();
      const locationLabel = await LocationService.getCurrentState();
      const bookedRide = await bookTrip(trip.id, {
        paymentMethod: selectedPaymentMethod,
        paymentStatus: selectedPaymentMethod === 'cash' ? 'pending' : 'awaiting_payment',
        pickupLocation: {
          lat: coords?.latitude || 0,
          lon: coords?.longitude || 0,
          address: locationLabel || getAddressText(trip.origin),
        },
      });

      setShowPaymentModal(false);
      Alert.alert(
        'Trip booked',
        `Driver notified. Pickup set near ${locationLabel || 'your current location'}.`,
        [
          {
            text: 'Open chat',
            onPress: () => router.push(`/chat/${bookedRide.id}`),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Booking failed', error?.message || 'Could not complete this booking.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.errorContainer}>
        <Text>Trip not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: COLORS.primary, marginTop: 10 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <TouchableOpacity>
          <Ionicons name="share-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.routeHeader}>
          <Text style={styles.originText}>{getAddressText(trip.origin)}</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.textSecondary} />
          <Text style={styles.destText}>{getAddressText(trip.destination)}</Text>
        </View>
        <Text style={styles.dateText}>{formatTripDateTime(trip)}</Text>

        <View style={styles.priceCard}>
          <View>
            <Text style={styles.priceLabel}>Price per seat</Text>
            <Text style={styles.priceValue}>₦{Number(trip.price || trip.fare || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.seatsContainer}>
            <Text style={styles.seatsValue}>{trip.availableSeats ?? trip.seats ?? 0}</Text>
            <Text style={styles.seatsLabel}>seats left</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver</Text>
          <TouchableOpacity style={styles.driverCard} onPress={() => setShowDriverModal(true)}>
            <Image
              source={{ uri: driver?.image || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200' }}
              style={styles.driverImage}
            />
            <View style={styles.driverInfo}>
              <View style={styles.driverNameRow}>
                <Text style={styles.driverName}>{driverName}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
              </View>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>{driverRating} • {driverTrips} trips</Text>
              </View>
              <Text style={styles.driverMetaText}>{driverVehicle}</Text>
            </View>

            <View style={styles.contactActions}>
              <TouchableOpacity style={styles.iconButton} onPress={handleChatDriver}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={handleCallDriver}>
                <Ionicons name="call-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle</Text>
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleIcon}>
              <Ionicons name="car-sport-outline" size={32} color={COLORS.textSecondary} />
            </View>
            <View>
              <Text style={styles.vehicleName}>{driverVehicle}</Text>
              <Text style={styles.vehiclePlate}>{driver?.plateNumber || 'Plate number pending'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup and payment flow</Text>
          <View style={styles.flowCard}>
            <Text style={styles.flowText}>1. Choose payment method</Text>
            <Text style={styles.flowText}>2. We send your live pickup area to the driver</Text>
            <Text style={styles.flowText}>3. Driver gets notified in real time</Text>
          </View>
        </View>

        {!!trip.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Note from Driver</Text>
            <Text style={styles.descriptionText}>{trip.notes}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.bookButton} onPress={() => setShowPaymentModal(true)}>
          <Text style={styles.bookButtonText}>Continue to Payment</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showDriverModal} transparent animationType="slide" onRequestClose={() => setShowDriverModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Image
              source={{ uri: driver?.image || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200' }}
              style={styles.previewDriverImage}
            />
            <Text style={styles.modalTitle}>{driverName}</Text>
            <Text style={styles.modalSubtext}>Rating {driverRating} • {driverTrips} trips</Text>
            <Text style={styles.modalSubtext}>{driverVehicle}</Text>
            <Text style={styles.modalSubtext}>{driverPhone || 'Phone unavailable'}</Text>
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={handleCallDriver}>
                <Text style={styles.modalSecondaryText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleChatDriver}>
                <Text style={styles.modalPrimaryText}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPaymentModal} transparent animationType="slide" onRequestClose={() => setShowPaymentModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose payment method</Text>
            <Text style={styles.modalSubtext}>Your booking will only continue after you choose how to pay.</Text>
            <View style={styles.paymentList}>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.paymentCard, selectedPaymentMethod === method.id && styles.paymentCardActive]}
                  onPress={() => setSelectedPaymentMethod(method.id)}
                >
                  <Ionicons name={method.icon} size={20} color={selectedPaymentMethod === method.id ? COLORS.primary : COLORS.textSecondary} />
                  <Text style={[styles.paymentLabel, selectedPaymentMethod === method.id && styles.paymentLabelActive]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={confirmBooking} disabled={isLoading}>
              <Text style={styles.modalPrimaryText}>{isLoading ? 'Booking...' : 'Book this trip'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: '#FAFAFA',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: Fonts.bold, color: COLORS.text },
  content: { padding: SPACING.l, paddingBottom: 100 },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  originText: { fontSize: 18, fontFamily: Fonts.semibold, color: COLORS.text },
  destText: { fontSize: 18, fontFamily: Fonts.semibold, color: COLORS.primary },
  dateText: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: Fonts.rounded,
    marginBottom: SPACING.l,
  },
  priceCard: {
    backgroundColor: '#17321C',
    borderRadius: 18,
    padding: SPACING.l,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  priceLabel: { color: '#B7D7BD', fontSize: 12, fontFamily: Fonts.rounded },
  priceValue: { color: 'white', fontSize: 28, fontFamily: Fonts.bold },
  seatsContainer: { alignItems: 'center' },
  seatsValue: { color: 'white', fontSize: 24, fontFamily: Fonts.bold },
  seatsLabel: { color: '#B7D7BD', fontSize: 12, fontFamily: Fonts.rounded },
  section: { marginBottom: SPACING.l },
  sectionTitle: { fontSize: 16, color: COLORS.text, fontFamily: Fonts.semibold, marginBottom: 10 },
  driverCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverImage: { width: 54, height: 54, borderRadius: 27, marginRight: 12 },
  driverInfo: { flex: 1 },
  driverNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  driverName: { fontSize: 16, color: COLORS.text, fontFamily: Fonts.semibold },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: Fonts.rounded },
  driverMetaText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: Fonts.rounded, marginTop: 4 },
  contactActions: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF6F0',
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleName: { fontSize: 15, color: COLORS.text, fontFamily: Fonts.semibold },
  vehiclePlate: { fontSize: 12, color: COLORS.textSecondary, fontFamily: Fonts.rounded },
  flowCard: { backgroundColor: '#fff', borderRadius: 16, padding: SPACING.m, gap: 8 },
  flowText: { color: COLORS.text, fontFamily: Fonts.rounded, fontSize: 13 },
  descriptionText: { color: COLORS.textSecondary, fontFamily: Fonts.rounded, lineHeight: 20 },
  footer: {
    padding: SPACING.l,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bookButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: { color: 'white', fontSize: 16, fontFamily: Fonts.semibold },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.l,
    paddingBottom: SPACING.xl,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D0D5DD',
    marginBottom: SPACING.m,
  },
  modalTitle: { fontSize: 20, color: COLORS.text, fontFamily: Fonts.bold, textAlign: 'center', marginBottom: 6 },
  modalSubtext: { fontSize: 13, color: COLORS.textSecondary, fontFamily: Fonts.rounded, textAlign: 'center', marginBottom: 8 },
  previewDriverImage: { width: 72, height: 72, borderRadius: 36, alignSelf: 'center', marginBottom: 12 },
  modalActionRow: { flexDirection: 'row', gap: 10, marginTop: SPACING.m },
  modalSecondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSecondaryText: { color: '#344054', fontSize: 14, fontFamily: Fonts.semibold },
  modalPrimaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    marginTop: SPACING.m,
  },
  modalPrimaryText: { color: 'white', fontSize: 14, fontFamily: Fonts.semibold },
  paymentList: { gap: 10, marginTop: SPACING.m },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 14,
    padding: 14,
  },
  paymentCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF6F0',
  },
  paymentLabel: { color: COLORS.text, fontSize: 14, fontFamily: Fonts.semibold },
  paymentLabelActive: { color: COLORS.primary },
});
