import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, 
  Dimensions, Animated, Easing, Keyboard, Platform, Pressable 
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';

// 1. IMPORT USE SAFE AREA INSETS
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import JoinRideView from '../components/joinride'; 
import { LocationService } from '@/app/services/locationService';
import { useTripStore } from '@/app/stores/tripStore';
import { COLORS, SPACING, Fonts } from '@/constants/theme';
import { Trip } from '@/app/types';

const { height } = Dimensions.get('window');
const SHEET_COLLAPSED_HEIGHT = height * 0.45;
const SHEET_EXPANDED_HEIGHT = height * 0.92;

// --- COMPONENTS ---
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

const NEARBY_DRIVERS = [
  { id: 'd1', coords: { latitude: 4.8156, longitude: 7.0498 }, heading: 45 },
  { id: 'd2', coords: { latitude: 4.8120, longitude: 7.0550 }, heading: 180 },
  { id: 'd3', coords: { latitude: 4.8190, longitude: 7.0400 }, heading: 90 },
];

export default function HomeScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { trips, fetchTrips } = useTripStore();
  
  // 2. GET SAFE AREA INSETS
  const insets = useSafeAreaInsets();

  // Animation State
  const sheetHeight = useRef(new Animated.Value(SHEET_COLLAPSED_HEIGHT)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentRegion, setCurrentRegion] = useState({ latitude: 4.8156, longitude: 7.0498, latitudeDelta: 0.015, longitudeDelta: 0.015 });

  // Menu & Location State
  const [menuVisible, setMenuVisible] = useState(false);
  const [locationState, setLocationState] = useState('Detecting...');
  const [emergencyContacts, setEmergencyContacts] = useState<{ police: string; ambulance: string; fire: string } | null>(null);

  useEffect(() => { 
    fetchTrips(); 
    loadLocationData();
  }, []);

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
    setLocationState(stateName);
    setEmergencyContacts(LocationService.getEmergencyNumbers(stateName));
  };

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

  const collapseSheet = () => {
    Keyboard.dismiss();
    Animated.timing(sheetHeight, {
      toValue: SHEET_COLLAPSED_HEIGHT,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start(() => setIsExpanded(false));
  };

  const renderSimpleSuggestion = ({ item }: { item: Trip }) => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => router.push(`/trip-details/${item.id}`)}>
      <View style={styles.iconContainer}>
        <Ionicons name="location-sharp" size={20} color={COLORS.white} />
      </View>
      <View style={styles.suggestionTextContainer}>
         <View style={styles.suggestionHeader}>
            <Text style={styles.suggestionTitle}>Port Harcourt</Text>
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
        {NEARBY_DRIVERS.map((driver) => (
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
      </MapView>

      {/* 2. TOP OVERLAY */}
      {!isExpanded && (
        <>
          {/* 3. APPLY INSETS TO TOP OVERLAY: Replaced SafeAreaView with View + dynamic style */}
          <View style={[styles.topOverlay, { top: insets.top + 10 }]}>
            <View style={styles.topRow}>
              {/* Menu Button */}
              <TouchableOpacity style={styles.roundButton} onPress={() => setMenuVisible(true)}>
                 <Ionicons name="menu" size={24} color="black" />
              </TouchableOpacity>
              
              {/* Location Pill */}
              <TouchableOpacity style={styles.locationPill} onPress={loadLocationData}>
                <Ionicons name="location-sharp" size={16} color="black" />
                <Text style={styles.locationPillText}>{locationState}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FAB */}
          <TouchableOpacity style={styles.fab} onPress={loadLocationData}>
            <Ionicons name="locate" size={24} color="black" />
          </TouchableOpacity>
        </>
      )}

      {/* 3. SIDE MENU MODAL */}
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
                  <View>
                    <Text style={styles.emergencyLabel}>Police</Text>
                    <Text style={styles.emergencyValue}>{emergencyContacts.police}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.emergencyItem}>
                  <View style={styles.emergencyIcon}><Text>🚑</Text></View>
                  <View>
                    <Text style={styles.emergencyLabel}>Ambulance</Text>
                    <Text style={styles.emergencyValue}>{emergencyContacts.ambulance}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{color: 'gray'}}>Loading numbers...</Text>
            )}

            <View style={styles.divider} />

            <TouchableOpacity style={styles.supportButton}>
              <Ionicons name="headset" size={20} color="black" style={{marginRight: 10}} />
              <Text style={styles.supportText}>Customer Support</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )} 

      {/* 4. ANIMATED BOTTOM SHEET */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        {isExpanded ? (
          <JoinRideView onClose={collapseSheet} trips={trips} />
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingTitle}>Where are you travelling to?</Text>
            <TouchableOpacity style={styles.searchContainer} activeOpacity={0.9} onPress={expandSheet}>
              <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
              <Text style={styles.placeholderText}>Where to?</Text>
            </TouchableOpacity>
            <Text style={styles.sectionHeader}>Suggestions</Text>
            <FlatList
              data={trips.slice(0, 3)}
              renderItem={renderSimpleSuggestion}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.list}
            />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { ...StyleSheet.absoluteFillObject, height: height * 0.6 },
  
  // --- UPDATED OVERLAY STYLE ---
  // Note: 'top' is now handled dynamically in the component
  topOverlay: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    zIndex: 10 
  },
  topRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: SPACING.m, 
  },
  roundButton: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: 'white', 
    justifyContent: 'center', alignItems: 'center', 
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 
  },
  locationPill: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: 'white', 
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, 
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 4 
  },
  locationPillText: { 
    fontWeight: '600', marginLeft: 8, fontSize: 14, 
    fontFamily: Fonts.rounded 
  },
  fab: { 
    position: 'absolute', right: 20, bottom: '48%', 
    backgroundColor: 'white', width: 45, height: 45, borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center', 
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 5, elevation: 5, zIndex: 9 
  },

  // Side Menu Styles
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 30,
    justifyContent: 'flex-start', 
    // Padding top handled inline with insets
  },
  sideMenuContainer: {
    width: '75%',
    height: '100%',
    backgroundColor: 'white',
    padding: SPACING.l,
    paddingTop: 20, // Reduced slightly as backdrop handles safe area
    shadowColor: '#000', shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
  },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  menuTitle: { fontSize: 22, fontWeight: '700', fontFamily: Fonts.bold },
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

  // Bottom Sheet
  bottomSheet: { 
    position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white', 
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.l, 
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, 
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 10, fontFamily: Fonts.rounded,
  },
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
  suggestionTitle: { fontSize: 16, fontWeight: '500', color: '#000', fontFamily: Fonts.rounded },
  suggestionSubtext: { fontSize: 13, color: COLORS.textSecondary, fontFamily: Fonts.rounded },
  arrowContainer: { backgroundColor: '#E8F5E9', padding: 6, borderRadius: 8 },
  carMarker: { width: 30, height: 60, justifyContent: 'center', alignItems: 'center' },
});

const mapStyle = [
  { "featureType": "poi", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] }
];