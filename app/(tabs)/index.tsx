import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Keyboard, Pressable,
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
import { Trip } from '@/app/types';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

// Components
import ActiveTripSheet from '../components/ActiveTripSheet';
import FindingDriverView from '../components/FindingDriverView';
import JoinRideView from '../components/joinride';
import RatingModal from '../components/RatingModal';
import RideEstimationSheet from '../components/RideEstimationSheet';
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

const MOCK_NEARBY_DRIVERS = [
  { id: 'd1', coords: { latitude: 4.8156, longitude: 7.0498 }, heading: 45 },
  { id: 'd2', coords: { latitude: 4.8120, longitude: 7.0550 }, heading: 180 },
  { id: 'd3', coords: { latitude: 4.8190, longitude: 7.0400 }, heading: 90 },
];

export default function HomeScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();

  // --- STORE & LOGIC HOOKS ---
  const {
    trips,
    fetchTrips,
    requestRide,
    cancelRide, // Import cancel action
    currentRide,
    rideStatus,
    activeDrivers,
    submitRating,
    updateRideStatus
  } = useTripStore();

  const { user } = useAuthStore();

  // --- ANIMATION STATE ---
  const sheetHeight = useRef(new Animated.Value(SHEET_COLLAPSED_HEIGHT)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // --- APP STATE ---
  const [menuVisible, setMenuVisible] = useState(false);
  const [locationState, setLocationState] = useState('Detecting...');
  const [emergencyContacts, setEmergencyContacts] = useState<{ police: string; ambulance: string; fire: string } | null>(null);

  // --- FLOW STATE ---
  const [step, setStep] = useState<'IDLE' | 'ESTIMATING' | 'SEARCHING' | 'ON_TRIP'>('IDLE');
  const [destination, setDestination] = useState<any>(null);
  const [currentRegion, setCurrentRegion] = useState({ latitude: 4.8156, longitude: 7.0498, latitudeDelta: 0.015, longitudeDelta: 0.015 });

  // 1. INITIAL LOAD
  useEffect(() => {
    const init = async () => {
      await loadLocationData();
      await fetchTrips();
    };
    init();
  }, []);

  // 2. LISTEN TO RIDE STATUS
  useEffect(() => {
    if (rideStatus === 'ACCEPTED' || rideStatus === 'ARRIVING' || rideStatus === 'IN_PROGRESS') {
      setStep('ON_TRIP');
      collapseSheet(true);
    } else if (rideStatus === 'COMPLETED') {
      setStep('IDLE');
      setShowRatingModal(true);
    } else if (rideStatus === 'IDLE') {
      // Reset if cancelled externally
      setStep('IDLE');
      collapseSheet();
    }
  }, [rideStatus]);

  const loadLocationData = async () => {
    const coords = await LocationService.getCurrentCoordinates();
    if (coords) {
      const newRegion = {
        ...coords,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
      setCurrentRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    }

    const stateName = await LocationService.getCurrentState();
    setLocationState(stateName || "Unknown");
    setEmergencyContacts(LocationService.getEmergencyNumbers(stateName));
  };

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

  const collapseSheet = (fully = false) => {
    Keyboard.dismiss();
    Animated.timing(sheetHeight, {
      toValue: fully ? height * 0.35 : SHEET_COLLAPSED_HEIGHT,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start(() => setIsExpanded(false));
  };

  // --- LOGIC HANDLERS ---
  const handleDestinationSelected = (dest: any) => {
    setDestination(dest);
    setStep('ESTIMATING');
    expandSheet();

    if (currentRegion && dest.coords) {
      mapRef.current?.fitToCoordinates([
        { latitude: currentRegion.latitude, longitude: currentRegion.longitude },
        dest.coords
      ], {
        edgePadding: { top: 100, right: 50, bottom: SHEET_EXPANDED_HEIGHT / 2, left: 50 }
      });
    }
  };

  const handleConfirmRide = async (tier: string, scheduledTime?: string) => {
    try {
      if (!currentRegion || !destination) return;

      await requestRide({
        origin: {
          lat: currentRegion.latitude,
          lon: currentRegion.longitude,
          address: locationState
        },
        destination: {
          lat: destination.coords.latitude,
          lon: destination.coords.longitude,
          address: destination.name
        },
        tier: tier as any,
        price: 2500,
        departureTime: scheduledTime
      });
      setStep('SEARCHING');
      collapseSheet();
    } catch (e) {
      Alert.alert("Error", "Failed to book ride");
    }
  };

  const handleCancelSearch = async () => {
    await cancelRide();
    setStep('IDLE');
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
    } catch (error) {
      Alert.alert("Error", "Failed to submit rating");
    }
  };

  const renderSimpleSuggestion = ({ item }: { item: Trip }) => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => router.push(`/trip-details/${item.id}`)}>
      <View style={styles.iconContainer}>
        <Ionicons name="location-sharp" size={20} color={COLORS.white} />
      </View>
      <View style={styles.suggestionTextContainer}>
        <View style={styles.suggestionHeader}>
          <Text style={styles.suggestionTitle}>{item.origin || locationState}</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} />
          <Text style={styles.suggestionTitle}>{item.destination}</Text>
        </View>
        <Text style={styles.suggestionSubtext}>{item.date} • ₦{item.price.toLocaleString()}</Text>
      </View>
      <View style={styles.arrowContainer}>
        <MaterialCommunityIcons name="navigation-variant" size={20} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );

  const driversToDisplay = activeDrivers && activeDrivers.length > 0 ? activeDrivers : MOCK_NEARBY_DRIVERS;

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
            <View style={styles.carMarker}><TopDownCar /></View>
          </Marker>
        ))}
        {destination && <Marker coordinate={destination.coords} />}
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
          </View>
          <TouchableOpacity style={styles.fab} onPress={loadLocationData}>
            <Ionicons name="locate" size={24} color="black" />
          </TouchableOpacity>
        </>
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
                <TouchableOpacity style={styles.emergencyItem}>
                  <View style={styles.emergencyIcon}><Text>👮</Text></View>
                  <View><Text style={styles.emergencyLabel}>Police</Text><Text style={styles.emergencyValue}>{emergencyContacts.police}</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.emergencyItem}>
                  <View style={styles.emergencyIcon}><Text>🚑</Text></View>
                  <View><Text style={styles.emergencyLabel}>Ambulance</Text><Text style={styles.emergencyValue}>{emergencyContacts.ambulance}</Text></View>
                </TouchableOpacity>
              </View>
            ) : (
              <ActivityIndicator size="small" color={COLORS.primary} />
            )}
            <View style={styles.divider} />
            <TouchableOpacity style={styles.supportButton}>
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

        {/* CASE B: ESTIMATING */}
        {step === 'ESTIMATING' && (
          <RideEstimationSheet
            visible={true}
            destination={destination?.name}
            onClose={() => { setStep('IDLE'); collapseSheet(); }}
            onConfirm={handleConfirmRide}
          />
        )}

        {/* CASE C: SEARCHING */}
        {step === 'SEARCHING' && (
          <FindingDriverView
            onCancel={handleCancelSearch}
          />
        )}

        {/* CASE D: ACTIVE TRIP (FIXED) */}
        {step === 'ON_TRIP' && currentRide && (
          <ActiveTripSheet
            status={currentRide.status}
            // FIX: Pass the full driver object structure expected by ActiveTripSheet
            driver={{
              name: currentRide.driver.name,
              rating: currentRide.driver.rating || 4.8,
              vehicle: currentRide.driver.vehicle?.model || 'Vehicle',
              plate: currentRide.driver.vehicle?.plate || 'PLATE-NO',
              image: currentRide.driver.image || 'https://via.placeholder.com/150',
              phone: currentRide.driver.phone || '0000000000'
            }}
            eta="5 min"
            destAddress={destination?.name}
            onCall={() => Alert.alert("Call", "Calling driver...")}
            onChat={() => {
              router.push({
                pathname: '/chat',
                params: {
                  tripId: currentRide.id,
                  recipientName: currentRide.driver.name,
                  recipientImage: currentRide.driver.image
                }
              });
            }}
            onCancel={() => cancelRide(currentRide.id)}
          />
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
  bottomSheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.l, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10, fontFamily: Fonts.rounded },
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
});