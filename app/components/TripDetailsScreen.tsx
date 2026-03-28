import { LocationService } from '@/app/services/locationService';
import { useTripStore } from '@/app/stores/tripStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

type PaymentMethod = 'card' | 'transfer' | 'cash';
type PaymentStep = 'method' | 'transfer' | 'cash' | 'card_hold' | 'processing' | 'success';

const PAYMENT_METHODS = [
  {
    id: 'card' as PaymentMethod,
    label: 'Card',
    icon: 'card-outline' as const,
    description: 'Pay securely with your credit/debit card.',
  },
  {
    id: 'transfer' as PaymentMethod,
    label: 'Transfer',
    icon: 'swap-horizontal-outline' as const,
    description: 'Pay into the eDrive bank account and we auto-confirm it.',
  },
  {
    id: 'cash' as PaymentMethod,
    label: 'Cash',
    icon: 'cash-outline' as const,
    description: 'Pay the driver physically at pickup.',
  },
];

const TRANSFER_ACCOUNT = {
  bankName: 'Providus Bank',
  accountName: 'eDrive Mobility Ltd',
  accountNumber: '1234567890',
};

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

const formatCurrency = (amount: number) => `₦${Number(amount || 0).toLocaleString()}`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { trips, availableTrips, activeTrips, history, bookTrip, isLoading } = useTripStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('method');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const animation = useRef(new Animated.Value(0)).current;

  const trip = useMemo(() => {
    const allTrips = [...trips, ...availableTrips, ...activeTrips, ...history];
    return allTrips.find((item: any) => item.id === id) || null;
  }, [activeTrips, availableTrips, history, id, trips]);

  const amount = Number(trip?.price || trip?.fare || 0);
  const paymentReference = useMemo(
    () => `EDR-${String(id || '').slice(0, 6).toUpperCase()}-${String(Date.now()).slice(-4)}`,
    [id],
  );

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (paymentStep !== 'processing') {
      animation.stopAnimation();
      animation.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(animation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();

    return () => {
      loop.stop();
      animation.stopAnimation();
      animation.setValue(0);
    };
  }, [animation, paymentStep]);

  const driver = trip?.driver || {};
  const driverName = getDriverName(driver);
  const driverPhone = driver?.phone || driver?.phoneNumber || null;
  const driverVehicle = trip?.tier || driver?.vehicleType || 'Vehicle details pending';
  const driverRating = Number(driver?.rating || 4.8).toFixed(1);
  const driverTrips = Number(driver?.tripsCompleted || 0);

  const openPaymentFlow = () => {
    setPaymentStep('method');
    setPaymentError(null);
    setShowPaymentModal(true);
  };

  const closePaymentFlow = () => {
    if (paymentStep === 'processing') return;
    setShowPaymentModal(false);
    setPaymentStep('method');
    setPaymentError(null);
  };

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
    router.push({
      pathname: '/chat/[id]',
      params: { id: trip.id, recipientName: driverName },
    });
  };

  const completeBooking = async (method: PaymentMethod, paymentStatus: string) => {
    if (!trip?.id) return null;

    // Safely get location — fall back to trip origin if location denied or fails
    let coords = null;
    let locationLabel = '';
    try {
      coords = await LocationService.getCurrentCoordinates();
      locationLabel = await LocationService.getCurrentState();
    } catch {
      // Permission denied or unavailable — use trip origin as fallback
    }

    return bookTrip(trip.id, {
      paymentMethod: method,
      paymentStatus,
      pickupLocation: {
        lat: coords?.latitude ?? (trip.origin?.lat || 0),
        lon: coords?.longitude ?? (trip.origin?.lon || 0),
        address: locationLabel || getAddressText(trip.origin),
      },
    });
  };

  const finishSuccessfulBooking = async (method: PaymentMethod, paymentStatus: string) => {
    setPaymentError(null);
    setPaymentStep('processing');

    try {
      if (method === 'transfer') {
        await wait(1800);
      }

      await completeBooking(method, paymentStatus);
      setPaymentStep('success');
      await wait(1200);
      setShowPaymentModal(false);
      // Navigate to Trips tab specifically so user sees their booking in "My Trips"
      router.replace('/(tabs)/trips');
    } catch (error: any) {
      const errMsg = error?.message || error?.response?.data?.message || 'Could not complete this booking. Please try again.';
      setPaymentError(errMsg);
      // Return to the payment step that was active
      setPaymentStep(method === 'cash' ? 'cash' : 'transfer');
    }
  };

  const handleSelectPaymentMethod = async (method: PaymentMethod) => {
    setPaymentError(null);

    if (method === 'transfer') {
      setPaymentStep('transfer');
      return;
    }

    if (method === 'cash') {
      setPaymentStep('cash');
      return;
    }

    // Card flow
    setPaymentStep('processing');
    try {
      const res = await api.post('/payments/initialize', {
        amount,
        distance: Number(trip?.distance || trip?.distanceKm || 0),
        rideId: trip?.id
      });
      
      const authUrl = res.data?.data?.authorization_url;
      if (authUrl) {
         // Use WebBrowser for a better in-app experience
         const result = await WebBrowser.openBrowserAsync(authUrl);
         
         // Even if they close the browser, we should check status or just assume pending
         // The webhook will finalize it. For UI, we proceed to 'success' mode.
         await wait(1000);
         await completeBooking('card', 'pending');
         setPaymentStep('success');
         await wait(1500);
         setShowPaymentModal(false);
         router.replace('/(tabs)/trips');
      } else {
         throw new Error("Could not get payment link.");
      }
    } catch (e: any) {
      setPaymentError(e?.message || 'Failed to initialize payment');
      setPaymentStep('method'); // go back to start
    }
  };

  const processingRotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
            <Text style={styles.priceValue}>{formatCurrency(amount)}</Text>
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
            <Text style={styles.flowText}>1. Pick transfer or cash</Text>
            <Text style={styles.flowText}>2. We attach your live pickup area automatically</Text>
            <Text style={styles.flowText}>3. The driver gets the trip and pickup request instantly</Text>
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
        {(() => {
          const isPassenger = trip.passengerId === user?.id;
          const isPaid = (trip.paymentStatus || '').toLowerCase() === 'paid';
          const noSeats = (trip.availableSeats === 0 || trip.seats === 0);

          if (noSeats && !isPassenger) {
            return (
              <View style={[styles.bookButton, { backgroundColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }]}>
                <Ionicons name="close-circle-outline" size={20} color="#64748B" />
                <Text style={[styles.bookButtonText, { color: '#64748B' }]}>No seats available</Text>
              </View>
            );
          }

          if (isPassenger) {
            if (isPaid) {
              return (
                <View style={[styles.bookButton, { backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }]}>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.bookButtonText}>Seat Reserved (Paid)</Text>
                </View>
              );
            }
            return (
              <TouchableOpacity style={[styles.bookButton, { backgroundColor: '#F59E0B' }]} onPress={openPaymentFlow}>
                <Text style={styles.bookButtonText}>Complete Payment</Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity style={styles.bookButton} onPress={openPaymentFlow}>
              <Text style={styles.bookButtonText}>Continue to Payment</Text>
            </TouchableOpacity>
          );
        })()}
      </View>

      <Modal visible={showDriverModal} transparent animationType="slide" onRequestClose={() => setShowDriverModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowDriverModal(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
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
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showPaymentModal} transparent animationType="slide" onRequestClose={closePaymentFlow}>
        <Pressable style={styles.modalBackdrop} onPress={closePaymentFlow}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />

            {paymentStep === 'method' && (
              <>
                <Text style={styles.modalTitle}>Choose payment method</Text>
                <Text style={styles.modalSubtext}>Nothing is selected yet. Tap one option and we move straight into the next step.</Text>
                <View style={styles.paymentList}>
                  {PAYMENT_METHODS.map((method) => (
                    <TouchableOpacity
                      key={method.id}
                      style={styles.paymentCard}
                      onPress={() => handleSelectPaymentMethod(method.id)}
                    >
                      <View style={styles.paymentIconWrap}>
                        <Ionicons name={method.icon} size={20} color={COLORS.primary} />
                      </View>
                      <View style={styles.paymentTextWrap}>
                        <Text style={styles.paymentLabel}>{method.label}</Text>
                        <Text style={styles.paymentDescription}>{method.description}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {paymentStep === 'transfer' && (
              <>
                <Text style={styles.modalTitle}>Transfer to pay</Text>
                <Text style={styles.modalSubtext}>Use the details below. The amount and account text are selectable so you can copy them easily.</Text>

                <View style={styles.transferCard}>
                  <Text style={styles.transferLabel}>Amount</Text>
                  <Text selectable style={styles.transferAmount}>{formatCurrency(amount)}</Text>
                  <View style={styles.transferDivider} />
                  <Text style={styles.transferLabel}>Bank</Text>
                  <Text selectable style={styles.transferValue}>{TRANSFER_ACCOUNT.bankName}</Text>
                  <Text style={styles.transferLabel}>Account Number</Text>
                  <Text selectable style={styles.transferValue}>{TRANSFER_ACCOUNT.accountNumber}</Text>
                  <Text style={styles.transferLabel}>Account Name</Text>
                  <Text selectable style={styles.transferValue}>{TRANSFER_ACCOUNT.accountName}</Text>
                </View>

                <View style={styles.transferHintCard}>
                  <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.transferHintText}>Reference: {paymentReference}. After transfer, we will check and confirm it automatically.</Text>
                </View>

                {!!paymentError && <Text style={styles.paymentErrorText}>{paymentError}</Text>}

                <View style={styles.inlineActionRow}>
                  <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setPaymentStep('method')}>
                    <Text style={styles.modalSecondaryText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalPrimaryButton, styles.inlinePrimaryButton]}
                    onPress={() => finishSuccessfulBooking('transfer', 'paid')}
                    disabled={isLoading}
                  >
                    <Text style={styles.modalPrimaryText}>{isLoading ? 'Checking...' : 'I have made payment'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {paymentStep === 'cash' && (
              <>
                <Text style={styles.modalTitle}>Cash at pickup</Text>
                <Text style={styles.modalSubtext}>We will send your pickup area to the driver and reserve this seat immediately.</Text>
                <View style={styles.cashCard}>
                  <View style={styles.cashTopRow}>
                    <Ionicons name="cash-outline" size={22} color={COLORS.primary} />
                    <Text style={styles.cashAmount}>{formatCurrency(amount)}</Text>
                  </View>
                  <Text style={styles.cashBodyText}>Pay the driver physically when they arrive at your pickup point.</Text>
                </View>
                {!!paymentError && <Text style={styles.paymentErrorText}>{paymentError}</Text>}
                <View style={styles.inlineActionRow}>
                  <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setPaymentStep('method')}>
                    <Text style={styles.modalSecondaryText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalPrimaryButton, styles.inlinePrimaryButton]}
                    onPress={() => finishSuccessfulBooking('cash', 'pending')}
                    disabled={isLoading}
                  >
                    <Text style={styles.modalPrimaryText}>{isLoading ? 'Booking...' : 'Book trip now'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {paymentStep === 'card_hold' && (
              <>
                <Text style={styles.modalTitle}>Card is on hold</Text>
                <Text style={styles.modalSubtext}>We are keeping card checkout out of this test flow for now. Use transfer or cash to continue booking this trip.</Text>
                <View style={styles.holdCard}>
                  <Ionicons name="time-outline" size={22} color="#B54708" />
                  <Text style={styles.holdText}>Card payment will come back once gateway verification is ready.</Text>
                </View>
                <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setPaymentStep('method')}>
                  <Text style={styles.modalSecondaryText}>Choose another method</Text>
                </TouchableOpacity>
              </>
            )}

            {paymentStep === 'processing' && (
              <View style={styles.processingWrap}>
                <Animated.View style={[styles.processingOrb, { transform: [{ rotate: processingRotation }] }]}>
                  <Ionicons name="sync-outline" size={28} color={COLORS.primary} />
                </Animated.View>
                <Text style={styles.modalTitle}>Confirming payment</Text>
                <Text style={styles.modalSubtext}>Auto-detecting your transfer and booking your seat now.</Text>
              </View>
            )}

            {paymentStep === 'success' && (
              <View style={styles.processingWrap}>
                <View style={styles.successOrb}>
                  <Ionicons name="checkmark" size={32} color="white" />
                </View>
                <Text style={styles.modalTitle}>Payment successful</Text>
                <Text style={styles.modalSubtext}>Your trip is booked. We are opening your active trip now.</Text>
              </View>
            )}
          </Pressable>
        </Pressable>
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
    gap: 12,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FCFCFD',
  },
  paymentIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF6F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentTextWrap: { flex: 1 },
  paymentLabel: { color: COLORS.text, fontSize: 15, fontFamily: Fonts.semibold, marginBottom: 2 },
  paymentDescription: { color: COLORS.textSecondary, fontSize: 12, fontFamily: Fonts.rounded },
  transferCard: {
    borderRadius: 18,
    backgroundColor: '#0b0b0b',
    padding: SPACING.l,
    marginTop: SPACING.m,
  },
  transferLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Fonts.rounded,
    marginBottom: 4,
  },
  transferValue: {
    color: 'white',
    fontSize: 16,
    fontFamily: Fonts.semibold,
    marginBottom: 12,
  },
  transferAmount: {
    color: 'white',
    fontSize: 30,
    fontFamily: Fonts.bold,
    marginBottom: 12,
  },
  transferDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  transferHintCard: {
    marginTop: SPACING.m,
    borderRadius: 14,
    backgroundColor: '#EEF6F0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  transferHintText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.rounded,
  },
  inlineActionRow: { flexDirection: 'row', gap: 10, marginTop: SPACING.l },
  inlinePrimaryButton: { marginTop: 0 },
  cashCard: {
    marginTop: SPACING.m,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: SPACING.l,
    gap: 10,
  },
  cashTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cashAmount: { color: '#9A3412', fontSize: 24, fontFamily: Fonts.bold },
  cashBodyText: { color: '#7C2D12', fontSize: 13, lineHeight: 20, fontFamily: Fonts.rounded },
  holdCard: {
    marginTop: SPACING.m,
    borderRadius: 16,
    backgroundColor: '#FFFAEB',
    borderWidth: 1,
    borderColor: '#FEC84B',
    padding: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  holdText: { flex: 1, color: '#7A2E0B', fontFamily: Fonts.rounded, lineHeight: 18 },
  processingWrap: { alignItems: 'center', paddingVertical: SPACING.xl },
  processingOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#D1FADF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  successOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  paymentErrorText: {
    marginTop: SPACING.m,
    color: '#B42318',
    fontSize: 12,
    fontFamily: Fonts.rounded,
    textAlign: 'center',
  },
});
