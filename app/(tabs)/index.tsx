import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Keyboard, Pressable,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// --- IMPORTS FROM YOUR LOGIC SNIPPET ---
import { LocationService } from '@/app/services/locationService';
import { useTripStore } from '@/app/stores/tripStore';
import { useRideRealtimeStore } from '@/app/stores/rideRealtimeStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

// Components
import ActiveTripSheet from '../components/ActiveTripSheet';
import JoinRideView from '../components/joinride';
import RequestDetailsSheet, { RequestDetails } from '../components/RequestDetailsSheet';
import RatingModal from '../components/RatingModal';

import { useAuthStore } from '../stores/authStore';

const { height } = Dimensions.get('window');
const SHEET_COLLAPSED_HEIGHT = height * 0.45;
const SHEET_EXPANDED_HEIGHT = height * 0.92;

// --- UI COMPONENTS ---
const TopDownCar = () => (
  <Svg width="100%" height="100%" viewBox="0 0 24 48">
    <Path fill="#000" fillOpacity={0.2} d="M4 4h16v40H4z" transform="translate(2, 2)" />
    <Path fill="#005124" d="M4 8 C4 4, 20 4, 20 8 L20 40 C20 44, 4 44, 4 40 Z" />
    <Path fill="#003819" d="M5 12 h14 v6 h-14 z" />
    <Path fill="#003819" d="M5 34 h14 v5 h-14 z" />
    <Path fill="#00632C" d="M5 19 h14 v14 h-14 z" />
    <Path fill="#FFD700" d="M4 4 h3 v3 h-3 z M17 4 h3 v3 h-3 z" />
  </Svg>
);

const getAddressText = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.address || '';
};

const getDriverName = (driver: any) => {
  const fullName = [driver?.firstName, driver?.lastName].filter(Boolean).join(' ').trim();
  return fullName || driver?.name || driver?.email || 'Driver';
};

const getDriverVehicle = (driver: any) =>
  driver?.vehicle?.model || driver?.vehicleType || driver?.vehicle || 'Vehicle';

const getDriverPlate = (driver: any) =>
  driver?.vehicle?.plate || driver?.plateNumber || 'PLATE-NO';

const mapRideStatusForSheet = (status?: string): 'driver_en_route' | 'driver_arrived' | 'in_progress' => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'arrived') return 'driver_arrived';
  if (normalized === 'in_progress') return 'in_progress';
  return 'driver_en_route';
};

const getDistanceKm = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const CITY_DISTANCE_KM: Record<string, number> = {
  'port harcourt|abuja': 580,
  'abuja|port harcourt': 580,
  'port harcourt|lagos': 610,
  'lagos|port harcourt': 610,
  'lagos|abuja': 760,
  'abuja|lagos': 760,
  'abuja|kaduna': 190,
  'kaduna|abuja': 190,
  'port harcourt|aba': 65,
  'aba|port harcourt': 65,
  'enugu|abuja': 430,
  'abuja|enugu': 430,
  'owerri|abuja': 470,
  'abuja|owerri': 470,
};

const normalizeRouteKey = (origin: string, destination: string) =>
  `${origin.toLowerCase().trim()}|${destination.toLowerCase().trim()}`;

const detectRouteDistanceKm = (origin: string, destination: string) => {
  const routeKey = normalizeRouteKey(origin, destination);
  const direct = CITY_DISTANCE_KM[routeKey];
  if (direct) return direct;

  const originLower = origin.toLowerCase();
  const destinationLower = destination.toLowerCase();
  const match = Object.entries(CITY_DISTANCE_KM).find(([key]) => {
    const [from, to] = key.split('|');
    return originLower.includes(from) && destinationLower.includes(to);
  });

  return match?.[1] || 0;
};

const estimatePrivateTripFare = (distanceKm: number) => {
  if (!distanceKm) return 0;
  const runningCost = distanceKm * 285;
  const setupCost = 12000;
  const returnCover = distanceKm * 28;
  const driverPay = distanceKm * 22;
  const subtotal = runningCost + setupCost + returnCover + driverPay;
  return Math.round((subtotal * 1.16) / 50) * 50;
};

export default function HomeScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // --- STORE & LOGIC HOOKS ---
const {
    trips,
    fetchTrips,
    fetchMyTrips,
    fetchNearbyDrivers,
    cancelRide, // Import cancel action
    updateRideRequest,
    currentRide,
    rideStatus,
    activeDrivers,
    submitRating,
    updateRideStatus
  } = useTripStore();

  const { user } = useAuthStore();
  const driverEta = useRideRealtimeStore((state) => state.driverEta);

  // --- ANIMATION STATE ---
  const sheetHeight = useRef(new Animated.Value(SHEET_COLLAPSED_HEIGHT)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [requestIslandExpanded, setRequestIslandExpanded] = useState(false);
  const [showRequestEditor, setShowRequestEditor] = useState(false);
  const [showActiveTripSheet, setShowActiveTripSheet] = useState(true);

  // --- APP STATE ---
  const [menuVisible, setMenuVisible] = useState(false);
  const [locationState, setLocationState] = useState('Detecting...');
  const [emergencyContacts, setEmergencyContacts] = useState<{ police: string; ambulance: string; fire: string } | null>(null);

  // --- FLOW STATE ---
  const [step, setStep] = useState<'IDLE' | 'ON_TRIP'>('IDLE');
  const [currentRegion, setCurrentRegion] = useState({ latitude: 4.8156, longitude: 7.0498, latitudeDelta: 0.015, longitudeDelta: 0.015 });

  // 1. INITIAL LOAD
  const collapseSheet = useCallback((fully = false) => {
    Keyboard.dismiss();
    Animated.timing(sheetHeight, {
      toValue: fully ? height * 0.35 : SHEET_COLLAPSED_HEIGHT,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start(() => setIsExpanded(false));
  }, [sheetHeight]);

  const loadLocationData = useCallback(async () => {
    const coords = await LocationService.getCurrentCoordinates();
    if (coords) {
      const newRegion = {
        ...coords,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
      setCurrentRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      await fetchNearbyDrivers(coords.latitude, coords.longitude);
    }

    const details = await LocationService.getCurrentLocationDetails();
    setLocationState(details.area || "Unknown");
    setEmergencyContacts(LocationService.getEmergencyNumbersFromParts(details.city, details.state));
  }, [fetchNearbyDrivers]);

  const callEmergencyLine = useCallback(async (number: string) => {
    const firstLine = number.split(',')[0]?.trim();
    if (!firstLine) return;
    await Linking.openURL(`tel:${firstLine.replace(/\s+/g, '')}`);
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadLocationData();
      await fetchTrips();
      await fetchMyTrips();
    };
    init();
  }, [fetchMyTrips, fetchTrips, loadLocationData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.role === 'passenger') {
        fetchMyTrips();
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchMyTrips, user?.role]);

  // 2. LISTEN TO RIDE STATUS
  useEffect(() => {
    if (rideStatus === 'ACCEPTED' || rideStatus === 'ARRIVING' || rideStatus === 'IN_PROGRESS') {
      setStep('ON_TRIP');
      setShowActiveTripSheet(true);
      setRequestIslandExpanded(false);
      setShowRequestEditor(false);
      collapseSheet(true);
    } else if (rideStatus === 'SEARCHING') {
      setStep('IDLE');
      collapseSheet();
    } else if (rideStatus === 'COMPLETED') {
      setStep('IDLE');
      setShowRatingModal(true);
    } else if (rideStatus === 'IDLE') {
      // Reset if cancelled externally
      setStep('IDLE');
      collapseSheet();
    }
  }, [collapseSheet, rideStatus]);

  // --- ANIMATION HANDLERS ---
  const expandSheet = () => {
    setIsExpanded(true);
    setMenuVisible(false);
    Animated.timing(sheetHeight, {
      toValue: SHEET_EXPANDED_HEIGHT,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  // --- LOGIC HANDLERS ---


  const handleCancelSearch = async () => {
    await cancelRide();
    setStep('IDLE');
    setRequestIslandExpanded(false);
    setShowRequestEditor(false);
  };

  const handleEditRequest = async (details: RequestDetails) => {
    if (!currentRide?.id) return;

    try {
      await updateRideRequest(currentRide.id, {
        price: details.offerPrice,
        notes: details.note,
        preferences: {
          ...(currentRide.preferences || {}),
          shared: details.rideMode === 'shared',
        },
      });
      setRequestIslandExpanded(false);
      setShowRequestEditor(false);
      Alert.alert('Request updated', 'Drivers can now see your latest request details.');
    } catch (error: any) {
      Alert.alert('Update failed', error?.message || 'Could not update your request.');
    }
  };

  const handleRateDriver = async (rating: number, comment: string) => {
    if (!currentRide || !user) return;

    try {
      await submitRating(
        currentRide.id,
        user.id, // Rater (me)
        currentRide.driver.id, // Ratee (driver)
        rating,
        comment
      );
      Alert.alert("Thank you", "Your rating has been submitted.");
      setShowRatingModal(false);
      updateRideStatus('IDLE', null); // Reset store
    } catch {
      Alert.alert("Error", "Failed to submit rating");
    }
  };

  const renderSimpleSuggestion = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => router.push(`/trip-details/${item.id}`)}>
      <View style={styles.iconContainer}>
        <Ionicons name="location-sharp" size={20} color={COLORS.white} />
      </View>
      <View style={styles.suggestionTextContainer}>
        <View style={styles.suggestionHeader}>
          <Text style={styles.suggestionTitle}>{getAddressText(item.origin) || locationState}</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} />
          <Text style={styles.suggestionTitle}>{getAddressText(item.destination)}</Text>
        </View>
        <Text style={styles.suggestionSubtext}>
          {item.date || 'Today'} • ₦{Number(item.price || item.fare || 0).toLocaleString()}
        </Text>
      </View>
      <View style={styles.arrowContainer}>
        <MaterialCommunityIcons name="navigation-variant" size={20} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );

  const driversToDisplay = useMemo(() => activeDrivers || [], [activeDrivers]);

  const activeTripDriver = useMemo(() => {
    if (!currentRide?.driver?.id) return null;
    return (
      driversToDisplay.find((driver: any) => driver.userId === currentRide.driver.id || driver.id === currentRide.driver.id) || null
    );
  }, [currentRide?.driver?.id, driversToDisplay]);

  const activeTripEta = useMemo(() => {
    // Prefer real-time ETA from Navigatr (updated via socket as driver moves)
    if (driverEta) return driverEta;

    // Fallback: Haversine estimate until first real-time update arrives
    if (!activeTripDriver?.coords) return '5 min away';
    const pickupTarget = currentRide?.pickupLocation || currentRide?.origin;
    if (!pickupTarget?.lat || !pickupTarget?.lon) return '5 min away';
    const distanceKm = getDistanceKm(activeTripDriver.coords, {
      latitude: Number(pickupTarget.lat),
      longitude: Number(pickupTarget.lon),
    });
    const etaMinutes = Math.max(3, Math.round(distanceKm / 0.55));
    return `${etaMinutes} min away`;
  }, [driverEta, activeTripDriver?.coords, currentRide?.origin, currentRide?.pickupLocation]);

  const estimatedRequestPrivatePrice = useMemo(() => {
    const routeEstimate = estimatePrivateTripFare(
      detectRouteDistanceKm(getAddressText(currentRide?.origin), getAddressText(currentRide?.destination))
    );
    const liveFare = Number(currentRide?.fare || currentRide?.price || 0);

    if (!liveFare) return routeEstimate;
    if (currentRide?.preferences?.shared) {
      return Math.max(routeEstimate, Math.round((liveFare * 3.2) / 50) * 50);
    }
    return Math.max(routeEstimate, liveFare);
  }, [currentRide?.destination, currentRide?.fare, currentRide?.origin, currentRide?.preferences?.shared, currentRide?.price]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* 1. MAP */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={currentRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {driversToDisplay.map((driver: any) => (
          <Marker
            key={driver.id}
            coordinate={driver.coords}
            flat={true}
            rotation={driver.heading}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={[styles.carMarker, currentRide?.driver?.id === driver.userId && styles.activeCarMarker]}><TopDownCar /></View>
          </Marker>
        ))}

      </MapView>

      {/* 2. TOP OVERLAY */}
      {!isExpanded && step === 'IDLE' && (
        <>
          <View style={[styles.topOverlay, { top: insets.top + 10 }]}>
            <View style={styles.topRow}>
              <TouchableOpacity style={styles.roundButton} onPress={() => setMenuVisible(true)}>
                <Ionicons name="menu" size={24} color="black" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.locationPill} onPress={loadLocationData}>
                <Ionicons name="location-sharp" size={16} color="black" />
                <Text style={styles.locationPillText}>{locationState}</Text>
              </TouchableOpacity>
            </View>

            {rideStatus === 'SEARCHING' && currentRide && (
              <View style={styles.requestIslandWrap}>
                <TouchableOpacity
                  style={styles.requestIsland}
                  activeOpacity={0.92}
                  onPress={() => setRequestIslandExpanded((value) => !value)}
                >
                  <View style={styles.requestIslandDot} />
                  <Text style={styles.requestIslandTitle}>Request live</Text>
                  <Text style={styles.requestIslandMeta} numberOfLines={1}>
                    ₦{Number(currentRide.fare || currentRide.price || 0).toLocaleString()} • {currentRide?.preferences?.shared ? 'Shared' : 'Only me'}
                  </Text>
                  <Ionicons
                    name={requestIslandExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={COLORS.white}
                  />
                </TouchableOpacity>

                {requestIslandExpanded && (
                  <View style={styles.requestIslandPanel}>
                    <Text style={styles.requestIslandRoute}>
                      {getAddressText(currentRide.origin)} to {getAddressText(currentRide.destination)}
                    </Text>
                    {!!currentRide.notes && (
                      <Text style={styles.requestIslandNote} numberOfLines={2}>
                        {currentRide.notes}
                      </Text>
                    )}
                    <View style={styles.requestIslandActions}>
                      <TouchableOpacity style={styles.requestIslandSecondary} onPress={() => setRequestIslandExpanded(false)}>
                        <Text style={styles.requestIslandSecondaryText}>Hide</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.requestIslandSecondary} onPress={() => setShowRequestEditor(true)}>
                        <Text style={styles.requestIslandSecondaryText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.requestIslandPrimary} onPress={handleCancelSearch}>
                        <Text style={styles.requestIslandPrimaryText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.fab} onPress={loadLocationData}>
            <Ionicons name="locate" size={24} color="black" />
          </TouchableOpacity>
        </>
      )}
      {!isExpanded && step === 'IDLE' && requestIslandExpanded && rideStatus === 'SEARCHING' && (
        <Pressable style={styles.requestIslandBackdrop} onPress={() => setRequestIslandExpanded(false)} />
      )}

      {/* 3. SIDE MENU */}
      {menuVisible && (
        <Pressable style={[styles.menuBackdrop, { paddingTop: insets.top }]} onPress={() => setMenuVisible(false)}>
          <View style={styles.sideMenuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Safety & Support</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.locationBadge}>
              <Ionicons name="location" size={16} color={COLORS.primary} />
              <Text style={styles.locationText}>{locationState}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Emergency Numbers</Text>
            {emergencyContacts ? (
              <View style={styles.numbersContainer}>
                <TouchableOpacity style={styles.emergencyItem} onPress={() => callEmergencyLine(emergencyContacts.police)}>
                  <View style={styles.emergencyIcon}><Text>👮</Text></View>
                  <View><Text style={styles.emergencyLabel}>Police</Text><Text style={styles.emergencyValue}>{emergencyContacts.police}</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.emergencyItem} onPress={() => callEmergencyLine(emergencyContacts.ambulance)}>
                  <View style={styles.emergencyIcon}><Text>🚑</Text></View>
                  <View><Text style={styles.emergencyLabel}>Ambulance</Text><Text style={styles.emergencyValue}>{emergencyContacts.ambulance}</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.emergencyItem} onPress={() => callEmergencyLine(emergencyContacts.fire)}>
                  <View style={styles.emergencyIcon}><Text>🔥</Text></View>
                  <View><Text style={styles.emergencyLabel}>Fire</Text><Text style={styles.emergencyValue}>{emergencyContacts.fire}</Text></View>
                </TouchableOpacity>
              </View>
            ) : (
              <ActivityIndicator size="small" color={COLORS.primary} />
            )}
            <View style={styles.divider} />
            <TouchableOpacity style={styles.supportButton} onPress={() => router.push('/support')}>
              <Ionicons name="headset" size={20} color="black" style={{ marginRight: 10 }} />
              <Text style={styles.supportText}>Customer Support</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}

      {/* 4. ANIMATED BOTTOM SHEET */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>

        {/* CASE A: IDLE */}
        {step === 'IDLE' && (
          isExpanded ? (
            <JoinRideView onClose={collapseSheet} />
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingTitle}>Where are you travelling to?</Text>
              <TouchableOpacity style={styles.searchContainer} activeOpacity={0.9} onPress={expandSheet}>
                <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                <Text style={styles.placeholderText}>Where to?</Text>
              </TouchableOpacity>
              <Text style={styles.sectionHeader}>Suggestions</Text>
              {trips && trips.length > 0 ? (
                <FlatList
                  data={trips.slice(0, 3)}
                  renderItem={renderSimpleSuggestion}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  style={styles.list}
                />
              ) : (
                <Text style={{ color: COLORS.textSecondary, marginTop: 10, fontFamily: Fonts.rounded, fontWeight: '400', fontSize: 12 }}>No upcoming trips nearby.</Text>
              )}
            </View>
          )
        )}



        {/* CASE D: ACTIVE TRIP (FIXED) */}
        {step === 'ON_TRIP' && currentRide && (
          showActiveTripSheet ? (
            <ActiveTripSheet
              status={mapRideStatusForSheet(currentRide.status)}
              driver={{
                name: getDriverName(currentRide.driver),
                rating: currentRide.driver.rating || 4.8,
                vehicle: getDriverVehicle(currentRide.driver),
                plate: getDriverPlate(currentRide.driver),
                image: currentRide.driver.image || currentRide.driver.avatarUrl || '',
                phone: currentRide.driver.phone || currentRide.driver.phoneNumber || '0000000000'
              }}
              eta={activeTripEta}
              pickupAddress={getAddressText(currentRide.pickupLocation || currentRide.origin)}
              destAddress={getAddressText(currentRide.destination)}
              bottomInset={insets.bottom + tabBarHeight + 8}
              onClose={() => setShowActiveTripSheet(false)}
              onCall={() => Alert.alert("Call", "Calling driver...")}
              onChat={() => {
                router.push({
                  pathname: '/chat/[id]',
                  params: {
                    id: currentRide.id,
                    recipientName: getDriverName(currentRide.driver),
                    recipientImage: currentRide.driver.image || currentRide.driver.avatarUrl || ''
                  }
                });
              }}
              onCancel={() => cancelRide(currentRide.id)}
            />
          ) : (
            <TouchableOpacity
              style={[styles.reopenTripCard, { marginBottom: Math.max(insets.bottom + tabBarHeight, 8) }]}
              onPress={() => setShowActiveTripSheet(true)}
            >
              <View style={styles.reopenTripDot} />
              <Text style={styles.reopenTripText}>{activeTripEta || 'Trip active'} • tap to expand</Text>
              <Ionicons name="chevron-up" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )
        )}

        {/* 5. RATING MODAL */}
        <RatingModal
          visible={showRatingModal}
          driverName={currentRide?.driver?.name || "Driver"}
          onSubmit={handleRateDriver}
          onClose={() => {
            setShowRatingModal(false);
            updateRideStatus('IDLE', null);
          }}
        />

        <RequestDetailsSheet
          visible={showRequestEditor && rideStatus === 'SEARCHING' && !!currentRide}
          title="Edit live request"
          subtitle="Update your offer, ride type, or note. Drivers will see the changes right away."
          confirmText="Save changes"
          estimatedPrivatePrice={estimatedRequestPrivatePrice}
          initialOfferPrice={Number(currentRide?.fare || currentRide?.price || 0)}
          initialRideMode={currentRide?.preferences?.shared ? 'shared' : 'solo'}
          initialNote={currentRide?.notes || ''}
          onClose={() => setShowRequestEditor(false)}
          onSubmit={handleEditRequest}
        />

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { ...StyleSheet.absoluteFillObject, height: height * 0.7 },
  topOverlay: { position: 'absolute', left: 0, right: 0, zIndex: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.m },
  roundButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  locationPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 4 },
  locationPillText: { fontWeight: '400', marginLeft: 8, fontSize: 14, fontFamily: Fonts.rounded },
  fab: { position: 'absolute', right: 20, bottom: '48%', backgroundColor: 'white', width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 5, elevation: 5, zIndex: 9 },
  menuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 30, justifyContent: 'flex-start' },
  sideMenuContainer: { width: '75%', height: '100%', backgroundColor: 'white', padding: SPACING.l, paddingTop: 20, shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  menuTitle: { fontSize: 22, fontFamily: Fonts.bold },
  locationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9F4', padding: 8, borderRadius: 8, alignSelf: 'flex-start', marginBottom: SPACING.l },
  locationText: { marginLeft: 8, fontWeight: '600', color: COLORS.primary },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: SPACING.m },
  sectionLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.s, textTransform: 'uppercase', letterSpacing: 1 },
  numbersContainer: { gap: 12 },
  emergencyItem: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  emergencyIcon: { width: 40, height: 40, backgroundColor: '#FFF0F0', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  emergencyLabel: { fontSize: 12, color: COLORS.textSecondary },
  emergencyValue: { fontSize: 16, fontWeight: 'bold' },
  supportButton: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#F5F5F5', borderRadius: 12, marginTop: SPACING.s },
  supportText: { fontSize: 16, fontWeight: '500' },
  bottomSheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.l, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 16, zIndex: 50, fontFamily: Fonts.rounded },
  greetingTitle: { fontSize: 20, fontWeight: '600', marginBottom: SPACING.m, color: '#000', fontFamily: Fonts.semibold },
  placeholderText: { fontSize: 16, color: COLORS.textSecondary, fontFamily: Fonts.rounded, fontWeight: '500' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: SPACING.m, height: 50, marginBottom: SPACING.l, borderWidth: 1, borderColor: '#E0E0E0' },
  searchIcon: { marginRight: SPACING.s },
  sectionHeader: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.s, fontFamily: Fonts.rounded },
  list: { flex: 1, fontFamily: Fonts.rounded },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.m, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0', fontFamily: Fonts.rounded },
  iconContainer: { width: 36, height: 36, backgroundColor: COLORS.success, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
  suggestionTextContainer: { flex: 1 },
  suggestionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  suggestionTitle: { fontSize: 16, fontWeight: '400', color: '#000', fontFamily: Fonts.rounded },
  suggestionSubtext: { fontSize: 13, color: COLORS.textSecondary, fontFamily: Fonts.rounded, fontWeight: '400' },
  arrowContainer: { backgroundColor: '#E8F5E9', padding: 6, borderRadius: 8 },
  carMarker: { width: 30, height: 60, justifyContent: 'center', alignItems: 'center' },
  activeCarMarker: {
    backgroundColor: 'rgba(23, 50, 28, 0.14)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  requestIslandWrap: {
    alignItems: 'center',
    marginTop: 14,
    zIndex: 20,
  },
  requestIsland: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(17, 24, 39, 0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  requestIslandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  requestIslandTitle: {
    color: COLORS.white,
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  requestIslandMeta: {
    maxWidth: 180,
    color: 'rgba(255,255,255,0.78)',
    fontFamily: Fonts.rounded,
    fontSize: 12,
  },
  requestIslandPanel: {
    width: '92%',
    marginTop: 10,
    borderRadius: 20,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  requestIslandRoute: {
    color: COLORS.text,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    marginBottom: 6,
  },
  requestIslandNote: {
    color: COLORS.textSecondary,
    fontFamily: Fonts.rounded,
    fontSize: 12,
    marginBottom: 12,
  },
  requestIslandActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestIslandSecondary: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  requestIslandSecondaryText: {
    color: '#344054',
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  requestIslandPrimary: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
  },
  requestIslandPrimaryText: {
    color: COLORS.white,
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  requestIslandBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9,
  },
  reopenTripCard: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 8,
  },
  reopenTripDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  reopenTripText: {
    color: '#101828',
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
});
