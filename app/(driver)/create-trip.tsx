import { useAuthStore } from '@/app/stores/authStore';
import { useDriverStore } from '@/app/stores/driverStore';
import { useTripStore } from '@/app/stores/tripStore';
import { NavigatrService } from '@/app/services/navigatrService';
import { getDriverSeatFloor, roundFare } from '@/app/utils/pricing';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// Route suggestions for quick selection
const POPULAR_ROUTES = [
  { origin: 'Lagos (Jibowu)', destination: 'Abuja (Utako)' },
  { origin: 'Port Harcourt (Aba Road)', destination: 'Lagos (Yaba)' },
  { origin: 'Abuja (Utako)', destination: 'Kaduna (Mando)' },
];
// Removed DRIVER_VERIFICATION_ON_HOLD bypass

const COST_PER_KM = 165;
const TRIP_SETUP_COST = 1500;
const EMPTY_RETURN_BUFFER_PER_KM = 45;
const PROFIT_MARGIN = 0.35;

type RouteLookupStatus = 'idle' | 'loading' | 'ready' | 'error';

let DateTimePickerNative: any = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePickerNative = require('@react-native-community/datetimepicker').default;
  } catch {
    DateTimePickerNative = null;
  }
}

const fetchRouteMetrics = async (originQuery: string, destinationQuery: string) => {
  const [originPlace, destinationPlace] = await Promise.all([
    NavigatrService.geocode(originQuery),
    NavigatrService.geocode(destinationQuery),
  ]);

  const result = await NavigatrService.route(
    { lat: originPlace.lat, lng: originPlace.lng },
    { lat: destinationPlace.lat, lng: destinationPlace.lng },
    { maneuvers: true }
  );

  const distanceKm = Math.round(result.distanceMeters / 1000);
  if (!distanceKm) {
    throw new Error('Route distance is unavailable right now.');
  }

  return {
    distanceKm,
    originCoords: { lat: originPlace.lat, lon: originPlace.lng, address: originQuery.trim() },
    destinationCoords: { lat: destinationPlace.lat, lon: destinationPlace.lng, address: destinationQuery.trim() },
  };
};

const buildPriceModel = (distanceKm: number, seatsCount: number) => {
  if (!distanceKm || !seatsCount) {
    return {
      travelCost: 0,
      setupCost: 0,
      returnCover: 0,
      totalTripFare: 0,
      seatFare: 0,
      suggestions: [0],
    };
  }

  const travelCost = distanceKm * COST_PER_KM;
  const setupCost = TRIP_SETUP_COST;
  const returnCover = distanceKm * EMPTY_RETURN_BUFFER_PER_KM;
  const baseTripCost = travelCost + setupCost + returnCover;
  const totalTripFare = roundFare(baseTripCost * (1 + PROFIT_MARGIN));
  const seatFare = roundFare(totalTripFare / Math.max(seatsCount, 1));
  const suggestions = Array.from(
    new Set([
      roundFare(seatFare * 0.98),
      seatFare,
      roundFare(seatFare * 1.02),
    ])
  );

  return {
    travelCost,
    setupCost,
    returnCover,
    totalTripFare,
    seatFare,
    suggestions,
  };
};

export default function CreateTripScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuthStore();
  const driverStatus = useDriverStore((state) => state.status);
  const activeTrips = useTripStore((state) => state.activeTrips);
  const fetchMyTrips = useTripStore((state) => state.fetchMyTrips);
  const postTrip = useTripStore((state) => state.postTrip);
  const updateTrip = useTripStore((state) => state.updateTrip);
  const isSubmitting = useTripStore((state) => state.isLoading);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [tripNotes, setTripNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState('4');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [didHydrateTrip, setDidHydrateTrip] = useState(false);
  const [hasManualPrice, setHasManualPrice] = useState(false);
  const [routeLookupStatus, setRouteLookupStatus] = useState<RouteLookupStatus>('idle');
  const [routeError, setRouteError] = useState('');
  const [routeDistanceKm, setRouteDistanceKm] = useState(0);
  const [originCoords, setOriginCoords] = useState({ lat: 0, lon: 0, address: '' });
  const [destinationCoords, setDestinationCoords] = useState({ lat: 0, lon: 0, address: '' });
  const [errors, setErrors] = useState({
    origin: false,
    destination: false,
    price: false,
    seats: false,
  });

  const isEditMode = !!tripId;
  const existingTrip = useMemo(
    () => activeTrips.find((trip: any) => trip.id === tripId),
    [activeTrips, tripId]
  );
  const seatsCount = Math.max(parseInt(seats || '1', 10) || 1, 1);
  const priceModel = useMemo(() => buildPriceModel(routeDistanceKm, seatsCount), [routeDistanceKm, seatsCount]);
  const seatPriceFloor = useMemo(
    () => getDriverSeatFloor(priceModel.totalTripFare, seatsCount),
    [priceModel.totalTripFare, seatsCount]
  );

  useEffect(() => {
    if (tripId && activeTrips.length === 0) {
      fetchMyTrips();
    }
  }, [tripId, activeTrips.length, fetchMyTrips]);

  useEffect(() => {
    if (!existingTrip || didHydrateTrip) return;

    const departure = existingTrip.departureTime ? new Date(existingTrip.departureTime) : new Date();
    setOrigin(existingTrip.origin?.address || existingTrip.origin || '');
    setDestination(existingTrip.destination?.address || existingTrip.destination || '');
    setTripNotes(existingTrip.notes || existingTrip.description || '');
    setSelectedDate(departure);
    setPrice(String(existingTrip.fare || existingTrip.price || ''));
    setSeats(String(existingTrip.seats || existingTrip.availableSeats || '4'));
    setHasManualPrice(true);
    setDidHydrateTrip(true);
  }, [didHydrateTrip, existingTrip]);

  useEffect(() => {
    const cleanOrigin = origin.trim();
    const cleanDestination = destination.trim();

    if (cleanOrigin.length < 3 || cleanDestination.length < 3) {
      setRouteLookupStatus('idle');
      setRouteDistanceKm(0);
      setRouteError('');
      if (!hasManualPrice) setPrice('');
      return;
    }

    const timeout = setTimeout(async () => {
      setRouteLookupStatus('loading');
      setRouteError('');

      try {
        const routeMetrics = await fetchRouteMetrics(cleanOrigin, cleanDestination);
        setRouteDistanceKm(routeMetrics.distanceKm);
        setOriginCoords(routeMetrics.originCoords);
        setDestinationCoords(routeMetrics.destinationCoords);
        setRouteLookupStatus('ready');

        if (!hasManualPrice) {
          const nextPriceModel = buildPriceModel(routeMetrics.distanceKm, seatsCount);
          setPrice(nextPriceModel.seatFare ? String(nextPriceModel.seatFare) : '');
        }
      } catch (error: any) {
        setRouteLookupStatus('error');
        setRouteDistanceKm(0);
        setRouteError(error?.message || 'Could not calculate this route yet.');
        if (!hasManualPrice) setPrice('');
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [origin, destination, seatsCount, hasManualPrice]);

  const setQuickDate = (offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    setSelectedDate(date);
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const onDateChange = (event: any, date?: Date) => {
    Keyboard.dismiss();
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (date) {
      setSelectedDate((prev) => {
        const nextDate = new Date(date);
        nextDate.setHours(prev.getHours(), prev.getMinutes());
        return nextDate;
      });
    }
  };

  const onTimeChange = (event: any, date?: Date) => {
    Keyboard.dismiss();
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'dismissed') return;
    if (date) {
      setSelectedDate((prev) => {
        const nextDate = new Date(prev);
        nextDate.setHours(date.getHours(), date.getMinutes());
        return nextDate;
      });
    }
  };

  const applySuggestion = (route: { origin: string; destination: string }) => {
    setOrigin(route.origin);
    setDestination(route.destination);
    setShowSuggestions(false);
    setErrors((prev) => ({ ...prev, origin: false, destination: false }));
  };

  const validateTripForm = () => {
    const newErrors = {
      origin: !origin.trim(),
      destination: !destination.trim(),
      price: !price.trim(),
      seats: !seats.trim(),
    };
    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) {
      Alert.alert('Missing details', 'Fill in your route, seats, and seat price first.');
      return false;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return false;
    }

    if (routeLookupStatus === 'loading') {
      Alert.alert('Checking route', 'Hold on while we calculate the route distance.');
      return false;
    }

    if (routeLookupStatus !== 'ready' || routeDistanceKm <= 0) {
      Alert.alert('Route not ready', 'We need a valid route distance before this trip can go live.');
      return false;
    }

    const numericSeatPrice = Number(price);
    if (!numericSeatPrice || numericSeatPrice < seatPriceFloor) {
      Alert.alert(
        'Price too low',
        `Minimum seat price for this route is ₦${seatPriceFloor.toLocaleString()} to protect trip costs.`
      );
      return false;
    }

    if (user?.verificationStatus !== 'approved') {
      Alert.alert('Verification Pending', 'You cannot create a trip until your documents have been verified by an admin.');
      return false;
    }

    return true;
  };

  const buildTripPayload = () => {
    const seatCount = parseInt(seats, 10);
    const seatFare = parseInt(price, 10);
    const existingAvailableSeats = existingTrip?.availableSeats ?? existingTrip?.seats ?? seatCount;
    const alreadyBookedSeats = Math.max((existingTrip?.seats ?? seatCount) - existingAvailableSeats, 0);

    return {
      driverId: user?.id,
      origin: {
        lat: originCoords.lat || existingTrip?.origin?.lat || 0,
        lon: originCoords.lon || existingTrip?.origin?.lon || 0,
        address: origin.trim(),
      },
      destination: {
        lat: destinationCoords.lat || existingTrip?.destination?.lat || 0,
        lon: destinationCoords.lon || existingTrip?.destination?.lon || 0,
        address: destination.trim(),
      },
      departureTime: selectedDate.toISOString(),
      fare: seatFare,
      tripFare: priceModel.totalTripFare,
      distanceKm: routeDistanceKm,
      tier: user?.carModel || user?.vehicleType || 'Standard',
      seats: seatCount,
      availableSeats: Math.max(seatCount - alreadyBookedSeats, 0),
      notes: tripNotes,
      preferences: { ac: true, luggage: true, smoking: false },
      autoAccept: false,
      pricingScenario: 'simple_market',
      pricingBreakdown: {
        baseCost: priceModel.travelCost,
        subtotal: priceModel.travelCost + priceModel.setupCost,
        operationsBuffer: priceModel.returnCover,
        marginAmount: Math.max(
          priceModel.totalTripFare - (priceModel.travelCost + priceModel.setupCost + priceModel.returnCover),
          0
        ),
        finalTripFare: priceModel.totalTripFare,
        seatFare,
      },
    };
  };

  const openPreview = () => {
    Keyboard.dismiss();
    if (!validateTripForm()) return;
    setShowPreview(true);
  };

  const submitTrip = async () => {
    try {
      const payload = buildTripPayload();
      if (isEditMode && tripId) {
        await updateTrip(String(tripId), payload);
      } else {
        await postTrip(payload);
      }
      setShowPreview(false);
      Alert.alert('Success', isEditMode ? 'Trip updated successfully!' : 'Trip published successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert(
        isEditMode ? 'Update failed' : 'Publish failed',
        error?.message || 'Could not save this trip. Please try again.'
      );
    }
  };

  const routeStatusText =
    routeLookupStatus === 'idle'
      ? 'Distance starts from 0 until both route points are known.'
      : routeLookupStatus === 'loading'
        ? 'Calculating driving distance...'
        : routeLookupStatus === 'ready'
          ? `${routeDistanceKm} km route confirmed.`
          : routeError || 'Could not calculate this route yet.';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" backgroundColor="#F7F8F5" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color="#101828" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit trip' : 'Create trip'}</Text>
        <View style={styles.iconButtonGhost} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Post your route fast</Text>
            <Text style={styles.heroText}>
              Enter the route, confirm the distance, choose seats, then go live.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Route</Text>
            <TextInput
              style={[styles.input, errors.origin && styles.inputError]}
              placeholder="Leaving from"
              placeholderTextColor={COLORS.textSecondary}
              value={origin}
              onChangeText={(text) => {
                setOrigin(text);
                if (text) setErrors((prev) => ({ ...prev, origin: false }));
              }}
              onFocus={() => setShowSuggestions(true)}
            />
            <TextInput
              style={[styles.input, errors.destination && styles.inputError]}
              placeholder="Going to"
              placeholderTextColor={COLORS.textSecondary}
              value={destination}
              onChangeText={(text) => {
                setDestination(text);
                if (text) setErrors((prev) => ({ ...prev, destination: false }));
              }}
              onFocus={() => setShowSuggestions(true)}
            />

            {showSuggestions && (
              <View style={styles.routeSuggestionWrap}>
                {POPULAR_ROUTES.map((route, index) => (
                  <TouchableOpacity
                    key={`popular-route-${index}`}
                    style={styles.routeSuggestionItem}
                    onPress={() => applySuggestion(route)}
                  >
                    <Ionicons name="sparkles-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.routeSuggestionText}>{route.origin} to {route.destination}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.routeStatusCard}>
              <View>
                <Text style={styles.metricLabel}>Distance</Text>
                <Text style={styles.metricValue}>{routeDistanceKm} km</Text>
              </View>
              <Text style={styles.routeStatusText}>{routeStatusText}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>When are you leaving?</Text>
            <View style={styles.quickDateRow}>
              <TouchableOpacity style={styles.quickDateChip} onPress={() => setQuickDate(0)}>
                <Text style={styles.quickDateChipText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickDateChip} onPress={() => setQuickDate(1)}>
                <Text style={styles.quickDateChipText}>Tomorrow</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.scheduleRow}>
              <TouchableOpacity
                style={styles.scheduleButton}
                onPress={() => {
                  if (!DateTimePickerNative) {
                    Alert.alert('Unavailable', 'Date/Time picker is not available in this runtime. Use a development build.');
                    return;
                  }
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.scheduleLabel}>Date</Text>
                <Text style={styles.scheduleValue}>{formatDate(selectedDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scheduleButton}
                onPress={() => {
                  if (!DateTimePickerNative) {
                    Alert.alert('Unavailable', 'Date/Time picker is not available in this runtime. Use a development build.');
                    return;
                  }
                  setShowTimePicker(true);
                }}
              >
                <Text style={styles.scheduleLabel}>Time</Text>
                <Text style={styles.scheduleValue}>{formatTime(selectedDate)}</Text>
              </TouchableOpacity>
            </View>
            {showDatePicker && DateTimePickerNative && (
              <DateTimePickerNative
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
                themeVariant="light"
              />
            )}
            {showTimePicker && DateTimePickerNative && (
              <DateTimePickerNative
                value={selectedDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
                themeVariant="light"
              />
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Number of seats</Text>

            <TextInput
              style={[styles.input, errors.seats && styles.inputError]}
              placeholder="Available seats"
              placeholderTextColor={COLORS.textSecondary}
              value={seats}
              onChangeText={(text) => {
                setSeats(text);
                if (text) setErrors((prev) => ({ ...prev, seats: false }));
              }}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, errors.price && styles.inputError]}
              placeholder="Seat price"
              placeholderTextColor={COLORS.textSecondary}
              value={price}
              onChangeText={(text) => {
                setHasManualPrice(true);
                setPrice(text);
                if (text) setErrors((prev) => ({ ...prev, price: false }));
              }}
              keyboardType="numeric"
            />

            <Text style={styles.helpText}>
              Simple pricing: trip running cost + small return cover + 10% margin, then divided by seats.
            </Text>
            <Text style={styles.floorText}>
              Minimum allowed seat fare: ₦{seatPriceFloor.toLocaleString()}
            </Text>

            <View style={styles.suggestionRow}>
              {priceModel.suggestions.map((suggestedPrice, index) => (
                <TouchableOpacity
                  key={`seat-price-${index}-${suggestedPrice}`}
                  style={[styles.suggestionChip, Number(price) === suggestedPrice && styles.suggestionChipActive]}
                  disabled={!suggestedPrice}
                  onPress={() => {
                    setHasManualPrice(false);
                    setPrice(String(suggestedPrice));
                  }}
                >
                  <Text
                    style={[
                      styles.suggestionChipText,
                      Number(price) === suggestedPrice && styles.suggestionChipTextActive,
                    ]}
                  >
                    ₦{suggestedPrice.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.pricingSummaryCard}>
              <View style={styles.pricingSummaryRow}>
                <Text style={styles.pricingSummaryLabel}>Trip total</Text>
                <Text style={styles.pricingSummaryValue}>₦{priceModel.totalTripFare.toLocaleString()}</Text>
              </View>
              <View style={styles.pricingSummaryRow}>
                <Text style={styles.pricingSummaryLabel}>Recommended seat price</Text>
                <Text style={styles.pricingSummaryValue}>₦{priceModel.seatFare.toLocaleString()}</Text>
              </View>
              <Text style={styles.pricingSummaryHint}>
                Fixed cost here means a small trip setup cost for loading, timing, and route prep.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Note for riders</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="Optional note for riders"
              placeholderTextColor={COLORS.textSecondary}
              value={tripNotes}
              onChangeText={setTripNotes}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { bottom: tabBarHeight, paddingBottom: Math.max(insets.bottom, 11) }]}>
          <View>
            <Text style={styles.footerLabel}>Seat price</Text>
            <Text style={styles.footerValue}>₦{Number(price || 0).toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.footerButton} onPress={openPreview}>
            <Text style={styles.footerButtonText}>{isEditMode ? 'Preview update' : 'Preview trip'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showPreview} transparent animationType="slide" onRequestClose={() => setShowPreview(false)}>
        <View style={styles.previewBackdrop}>
          <View style={styles.previewSheet}>
            <View style={styles.previewHandle} />
            <Text style={styles.previewTitle}>{isEditMode ? 'Confirm update' : 'Confirm trip'}</Text>
            <Text style={styles.previewSubtitle}>Review everything before your route goes live.</Text>

            <View style={styles.previewCard}>
              <View style={styles.previewRouteRow}>
                <View style={styles.previewRouteDot} />
                <View style={styles.previewRouteTextWrap}>
                  <Text style={styles.previewLabel}>From</Text>
                  <Text style={styles.previewValue}>{origin || 'Origin'}</Text>
                </View>
              </View>
              <View style={styles.previewRouteDivider} />
              <View style={styles.previewRouteRow}>
                <View style={[styles.previewRouteDot, styles.previewRouteDotAlt]} />
                <View style={styles.previewRouteTextWrap}>
                  <Text style={styles.previewLabel}>To</Text>
                  <Text style={styles.previewValue}>{destination || 'Destination'}</Text>
                </View>
              </View>

              <View style={styles.previewGrid}>
                <View style={styles.previewChip}>
                  <Text style={styles.previewChipLabel}>Distance</Text>
                  <Text style={styles.previewChipValue}>{routeDistanceKm} km</Text>
                </View>
                <View style={styles.previewChip}>
                  <Text style={styles.previewChipLabel}>Departure</Text>
                  <Text style={styles.previewChipValue}>{formatDate(selectedDate)} • {formatTime(selectedDate)}</Text>
                </View>
                <View style={styles.previewChip}>
                  <Text style={styles.previewChipLabel}>Vehicle</Text>
                  <Text style={styles.previewChipValue}>{user?.carModel || 'Registered Vehicle'}</Text>
                </View>
                <View style={styles.previewChip}>
                  <Text style={styles.previewChipLabel}>Seats</Text>
                  <Text style={styles.previewChipValue}>{seatsCount} seat{seatsCount > 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.previewChip}>
                  <Text style={styles.previewChipLabel}>Price / seat</Text>
                  <Text style={styles.previewChipValue}>₦{Number(price || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.previewChip}>
                  <Text style={styles.previewChipLabel}>Trip total</Text>
                  <Text style={styles.previewChipValue}>₦{priceModel.totalTripFare.toLocaleString()}</Text>
                </View>
              </View>

              {!!tripNotes.trim() && (
                <View style={styles.previewNotesBlock}>
                  <Text style={styles.previewLabel}>Driver note</Text>
                  <Text style={styles.previewNotesText}>{tripNotes.trim()}</Text>
                </View>
              )}
            </View>

            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.previewSecondaryButton} onPress={() => setShowPreview(false)}>
                <Text style={styles.previewSecondaryText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewPrimaryButton, isSubmitting && styles.previewPrimaryButtonDisabled]}
                onPress={submitTrip}
                disabled={isSubmitting}
              >
                <Text style={styles.previewPrimaryText}>{isSubmitting ? 'Saving...' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: '#F7F8F5',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonGhost: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    color: '#101828',
    fontSize: 20,
    fontFamily: Fonts.semibold,
  },
  content: {
    padding: SPACING.l,
    paddingBottom: 140,
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#17321C',
    borderRadius: 24,
    padding: SPACING.l,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: Fonts.bold,
    marginBottom: 6,
  },
  heroText: {
    color: '#D8F3DC',
    fontSize: 14,
    fontFamily: Fonts.rounded,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: SPACING.l,
    borderWidth: 1,
    borderColor: '#ECEEF0',
  },
  cardTitle: {
    color: '#101828',
    fontSize: 17,
    fontFamily: Fonts.semibold,
    marginBottom: 12,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    color: '#101828',
    fontFamily: Fonts.rounded,
    fontSize: 15,
    marginBottom: 10,
  },
  inputError: {
    borderColor: '#D92D20',
  },
  routeSuggestionWrap: {
    marginTop: 4,
    gap: 8,
    marginBottom: 6,
  },
  routeSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#F4FBF6',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  routeSuggestionText: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: Fonts.rounded,
  },
  routeStatusCard: {
    marginTop: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    gap: 4,
  },
  metricLabel: {
    color: '#667085',
    fontSize: 12,
    fontFamily: Fonts.rounded,
  },
  metricValue: {
    color: '#101828',
    fontSize: 24,
    fontFamily: Fonts.bold,
  },
  routeStatusText: {
    color: '#667085',
    fontSize: 13,
    fontFamily: Fonts.rounded,
    lineHeight: 18,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickDateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EEF6F0',
  },
  quickDateChipText: {
    color: COLORS.primary,
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    padding: 14,
  },
  scheduleLabel: {
    color: '#344054',
    fontSize: 12,
    fontFamily: Fonts.rounded,
    marginBottom: 4,
  },
  scheduleValue: {
    color: '#101828',
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  vehicleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  vehicleChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#F2F4F7',
  },
  vehicleChipActive: {
    backgroundColor: '#17321C',
  },
  vehicleChipText: {
    color: '#344054',
    fontSize: 12,
    fontFamily: Fonts.semibold,
  },
  vehicleChipTextActive: {
    color: '#FFFFFF',
  },
  helpText: {
    color: '#667085',
    fontSize: 12,
    fontFamily: Fonts.rounded,
    lineHeight: 18,
    marginBottom: 6,
  },
  floorText: {
    color: '#B54708',
    fontSize: 12,
    fontFamily: Fonts.semibold,
    marginBottom: 10,
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F2F4F7',
  },
  suggestionChipActive: {
    backgroundColor: COLORS.primary,
  },
  suggestionChipText: {
    color: '#344054',
    fontSize: 12,
    fontFamily: Fonts.semibold,
  },
  suggestionChipTextActive: {
    color: '#FFFFFF',
  },
  pricingSummaryCard: {
    borderRadius: 16,
    backgroundColor: '#FFFCF5',
    borderWidth: 1,
    borderColor: '#F3E3AE',
    padding: 14,
    gap: 8,
  },
  pricingSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  pricingSummaryLabel: {
    color: '#7A5200',
    fontSize: 12,
    fontFamily: Fonts.rounded,
  },
  pricingSummaryValue: {
    color: '#7A5200',
    fontSize: 13,
    fontFamily: Fonts.semibold,
  },
  pricingSummaryHint: {
    color: '#9A6700',
    fontSize: 11,
    fontFamily: Fonts.rounded,
    lineHeight: 16,
  },
  noteInput: {
    height: 120,
    minHeight: 120,
    width: '100%',
    paddingTop: 14,
    paddingBottom: 14,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECEEF0',
    paddingHorizontal: SPACING.l,
    paddingTop: 12,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerLabel: {
    color: '#667085',
    fontSize: 12,
    fontFamily: Fonts.rounded,
  },
  footerValue: {
    color: '#101828',
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  footerButton: {
    flex: 0.7,
    height: 52,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  previewSheet: {
    backgroundColor: '#FFFDF8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.l,
    paddingBottom: SPACING.xl,
  },
  previewHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D0D5DD',
    marginBottom: SPACING.m,
  },
  previewTitle: {
    fontSize: 22,
    color: '#142013',
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: Fonts.rounded,
    marginBottom: SPACING.l,
  },
  previewCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: SPACING.l,
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  previewRouteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  previewRouteDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  previewRouteDotAlt: {
    backgroundColor: '#F97316',
  },
  previewRouteTextWrap: {
    flex: 1,
  },
  previewRouteDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#D0D5DD',
    marginLeft: 5,
    marginVertical: 8,
  },
  previewLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: Fonts.rounded,
    marginBottom: 2,
  },
  previewValue: {
    fontSize: 16,
    color: '#101828',
    fontFamily: Fonts.semibold,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: SPACING.l,
  },
  previewChip: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
  },
  previewChipLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: Fonts.rounded,
    marginBottom: 4,
  },
  previewChipValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: Fonts.semibold,
  },
  previewNotesBlock: {
    marginTop: SPACING.m,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFF7E8',
  },
  previewNotesText: {
    color: '#7A5200',
    fontSize: 13,
    fontFamily: Fonts.rounded,
    lineHeight: 18,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.l,
  },
  previewSecondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  previewSecondaryText: {
    color: '#344054',
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  previewPrimaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  previewPrimaryButtonDisabled: {
    opacity: 0.7,
  },
  previewPrimaryText: {
    color: '#FFFFFF',
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
});
