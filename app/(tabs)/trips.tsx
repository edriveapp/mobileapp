import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NoRideIllustration from '@/assets/empty-states/no-ride.svg';

import { useTripStore } from '@/app/stores/tripStore';
import { COLORS, SPACING, Fonts } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type CityItem = { id: string; name: string; state: string; image: string; accent: string };

// ---------------------------------------------------------------------------
// City data — swap image URLs for official city photos when available
// ---------------------------------------------------------------------------
const CITY_DATA: CityItem[] = [
  { id: '1', name: 'Lagos',         state: 'Lagos',       image: 'https://images.unsplash.com/photo-1618828665011-0abd973f7bb8',    accent: '#E65100' },
  { id: '2', name: 'Abuja',         state: 'FCT',         image: 'https://images.unsplash.com/photo-1734184451099-03942250b57d',    accent: '#1A237E' },
  { id: '3', name: 'Port Harcourt', state: 'Rivers',      image: 'https://picsum.photos/seed/portharcourt/400/220',accent: '#00695C' },
  { id: '4', name: 'Owerri',        state: 'Imo',         image: 'https://picsum.photos/seed/owerri-ng/400/220',   accent: '#0277BD' },
  { id: '5', name: 'Uyo',           state: 'Akwa Ibom',   image: 'https://picsum.photos/seed/uyo-akwa/400/220',    accent: '#6A1B9A' },
  { id: '6', name: 'Enugu',         state: 'Enugu',       image: 'https://picsum.photos/seed/enugu-ng/400/220',    accent: '#2E7D32' },
  { id: '7', name: 'Kano',          state: 'Kano',        image: 'https://picsum.photos/seed/kano-ancient/400/220',accent: '#BF360C' },
  { id: '8', name: 'Ibadan',        state: 'Oyo',         image: 'https://picsum.photos/seed/ibadan-oyo/400/220',  accent: '#880E4F' },
];

// ---------------------------------------------------------------------------
// Promo slides
// ---------------------------------------------------------------------------
const PROMOS = [
  { id: 'p1', headline: 'Let edrive take you further', sub: 'Discover Nigeria  one ride at a time', icon: '' as const, color: '#005124' },
  { id: 'p2', headline: 'Explore new places with edrive', sub: 'Every city is a new adventure', icon: 'map-outline' as const, color: '#1A237E' },
  { id: 'p3', headline: 'Your city, your ride, your price', sub: 'Set your offer  drivers come to you', icon: 'car-sport-outline' as const, color: '#181818' },
];

// Events discovery is handled via platform deep-links below (Tix Africa, Nairabox, etc.)
// Eventbrite's public search endpoint is unavailable on the free tier.


// ---------------------------------------------------------------------------
// Helpers (trips)
// ---------------------------------------------------------------------------
const getAddressText = (value: any): string =>
  typeof value === 'string' ? value : value?.address || '';

const getInitials = (name: string = '') =>
  name.trim().split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');

const getDriverDisplayName = (item: any): string => {
  if (item.driver) {
    const d = item.driver;
    const full = [d.firstName, d.lastName].filter(Boolean).join(' ').trim();
    return full || d.name || d.email?.split('@')[0] || 'Driver';
  }
  return item.driverName || 'Driver';
};

const AVATAR_PALETTE = [
  { bg: '#E8F0FE', text: '#1A73E8' },
  { bg: '#FCE8E6', text: '#C5221F' },
  { bg: '#E6F4EA', text: '#137333' },
  { bg: '#F3E8FD', text: '#7B1EA2' },
  { bg: '#FEF7E0', text: '#F29900' },
];

const avatarColors = (letter: string) => {
  const idx = (letter.charCodeAt(0) - 65) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[Math.max(0, idx)];
};

const SeatsBadge = ({ count }: { count: number }) => (
  <View style={styles.seatsBadge}>
    <Ionicons name="people-outline" size={12} color={COLORS.primary} />
    <Text style={styles.seatsText}>{count} seat{count !== 1 ? 's' : ''}</Text>
  </View>
);

// ---------------------------------------------------------------------------
// Promo Banner
// ---------------------------------------------------------------------------
const PromoBanner = () => {
  const [active, setActive] = useState(0);
  const listRef = useRef<FlatList>(null);
  const slideW = SCREEN_W - SPACING.m * 2;

  useEffect(() => {
    const t = setInterval(() => {
      setActive(prev => {
        const next = (prev + 1) % PROMOS.length;
        listRef.current?.scrollToOffset({ offset: next * slideW, animated: true });
        return next;
      });
    }, 3800);
    return () => clearInterval(t);
  }, [slideW]);

  return (
    <View style={promoStyles.wrap}>
      <FlatList
        ref={listRef}
        data={PROMOS}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={i => i.id}
        getItemLayout={(_, index) => ({ length: slideW, offset: slideW * index, index })}
        renderItem={({ item }) => (
          <View style={[promoStyles.slide, { width: slideW, backgroundColor: item.color }]}>
            <View style={promoStyles.slideContent}>
              <View style={{ flex: 1 }}>
                <Text style={promoStyles.headline}>{item.headline}</Text>
                <Text style={promoStyles.sub}>{item.sub}</Text>
              </View>
              <Ionicons name={item.icon} size={44} color="rgba(255,255,255,0.18)" />
            </View>
          </View>
        )}
      />
      <View style={promoStyles.dots}>
        {PROMOS.map((_, i) => (
          <View key={i} style={[promoStyles.dot, active === i && promoStyles.dotActive]} />
        ))}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// City Sheet (Modal)
// ---------------------------------------------------------------------------
const CityEventSheet = ({
  city,
  onClose,
  onFindRides,
  onRequestRide,
}: {
  city: CityItem;
  onClose: () => void;
  onFindRides: () => void;
  onRequestRide: () => void;
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={sheetStyles.overlay}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose} />
      <View style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Hero image */}
        <View style={sheetStyles.heroWrap}>
          <Image source={{ uri: city.image }} style={sheetStyles.hero} />
          <View style={[sheetStyles.heroOverlay, { backgroundColor: city.accent + 'AA' }]} />
          <View style={sheetStyles.heroText}>
            <Text style={sheetStyles.cityName}>{city.name}</Text>
            <Text style={sheetStyles.cityState}>{city.state} State</Text>
          </View>
          <TouchableOpacity style={sheetStyles.closeBtn} onPress={onClose}>
            <Ionicons name="close-circle" size={30} color="white" />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={sheetStyles.actions}>
          <TouchableOpacity style={[sheetStyles.primaryBtn, { backgroundColor: city.accent }]} onPress={onFindRides}>
            <Ionicons name="search-outline" size={18} color="white" />
            <Text style={sheetStyles.primaryBtnText}>Find rides to {city.name}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={sheetStyles.secondaryBtn} onPress={onRequestRide}>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
            <Text style={sheetStyles.secondaryBtnText}>Request a ride to {city.name}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function TripsScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'EXPLORE' | 'MY_TRIPS'>('EXPLORE');
  const [myTripsTab, setMyTripsTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [selectedDateFilter, setSelectedDateFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // City sheet state
  const [selectedCity, setSelectedCity] = useState<CityItem | null>(null);
  const [destinationFilter, setDestinationFilter] = useState<string | null>(null);

  const { trips, activeTrips, history, fetchTrips, fetchMyTrips } = useTripStore();

  useEffect(() => {
    fetchTrips({ role: 'rider' });
    fetchMyTrips();
  }, [fetchMyTrips, fetchTrips]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (viewMode === 'EXPLORE') await fetchTrips({ role: 'rider' });
    else await fetchMyTrips();
    setIsRefreshing(false);
  };

  const handleCityPress = useCallback((city: CityItem) => {
    setSelectedCity(city);
  }, []);

  const handleFindRides = useCallback(() => {
    if (!selectedCity) return;
    setDestinationFilter(selectedCity.name);
    setSelectedCity(null);
    setViewMode('EXPLORE');
  }, [selectedCity]);

  const handleRequestRide = useCallback(() => {
    if (!selectedCity) return;
    setSelectedCity(null);
    router.push({
      pathname: '/(tabs)',
      params: { openJoinRide: '1', presetDestination: selectedCity.name },
    } as any);
  }, [router, selectedCity]);

  const filteredTrips = destinationFilter
    ? trips.filter(t =>
        getAddressText(t.destination).toLowerCase().includes(destinationFilter.toLowerCase())
      )
    : trips;

  const DATE_FILTERS = ['All', 'Today', 'Tomorrow', 'Sat', 'Sun'];

  // -------------------------------------------------------------------------
  // Renderers — Explore
  // -------------------------------------------------------------------------
  const renderCityCard = ({ item }: { item: CityItem }) => (
    <TouchableOpacity
      style={styles.cityCard}
      activeOpacity={0.85}
      onPress={() => handleCityPress(item)}
    >
      <Image source={{ uri: item.image }} style={styles.cityImage} />
      <View style={[styles.cityOverlay, { backgroundColor: item.accent + '99' }]} />
      <View style={styles.cityLabel}>
        <Ionicons name="location-sharp" size={12} color="white" />
        <Text style={styles.cityName}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderDateFilter = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.chip, selectedDateFilter === item && styles.chipSelected]}
      onPress={() => setSelectedDateFilter(item)}
    >
      <Text style={[styles.chipText, selectedDateFilter === item && styles.chipTextSelected]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderAvailableTripItem = ({ item }: { item: any }) => {
    const driverName = getDriverDisplayName(item);
    const initials = getInitials(driverName);
    const { bg: avatarBg, text: avatarText } = avatarColors(initials[0] || 'D');
    const seatsLeft = item.availableSeats ?? item.seats ?? 1;
    const tierColor = item.tier === 'Comfort' ? '#E91E63' : item.tier === 'Van' ? '#FF6D00' : COLORS.primary;

    return (
      <TouchableOpacity
        style={styles.availableCard}
        activeOpacity={0.88}
        onPress={() => router.push(`/trip-details/${item.id}`)}
      >
        {(item.notes || item.description) && (
          <View style={styles.tipBubble}>
            <Ionicons name="chatbubble-ellipses-outline" size={12} color="#0284C7" />
            <Text style={styles.tipText} numberOfLines={1}>{item.notes || item.description}</Text>
          </View>
        )}
        <View style={styles.cardHeaderRow}>
          <View style={styles.routeBlock}>
            <View style={styles.stopRow}>
              <View style={styles.stopDotFrom} />
              <Text style={styles.routeTextOrigin} numberOfLines={1}>{getAddressText(item.origin)}</Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.stopRow}>
              <View style={styles.stopDotTo} />
              <Text style={styles.routeTextDest} numberOfLines={1}>{getAddressText(item.destination)}</Text>
            </View>
          </View>
          <View style={styles.pricePillBlock}>
            <Text style={[styles.priceTag, { color: tierColor }]}>
              ₦{Number(item.price || item.fare || 0).toLocaleString()}
            </Text>
            {item.tier && (
              <View style={[styles.tierBadge, { borderColor: tierColor }]}>
                <Text style={[styles.tierText, { color: tierColor }]}>{item.tier}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.cardFooterRow}>
          <View style={styles.driverRow}>
            <View style={[styles.avatarSmall, { backgroundColor: avatarBg }]}>
              <Text style={[styles.avatarText, { color: avatarText }]}>{initials || '?'}</Text>
            </View>
            <View>
              <Text style={styles.driverName}>{driverName}</Text>
              {item.driver?.rating && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={10} color="#F59E0B" />
                  <Text style={styles.ratingText}>{Number(item.driver.rating).toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.metaBlock}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{item.date || 'Today'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{item.time || 'Soon'}</Text>
            </View>
            <SeatsBadge count={seatsLeft} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // -------------------------------------------------------------------------
  // Renderers — My Trips
  // -------------------------------------------------------------------------
  const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
    active:      { bg: '#E8F5E9', fg: '#2E7D32' },
    in_progress: { bg: '#E3F2FD', fg: '#1565C0' },
    completed:   { bg: '#F3E5F5', fg: '#6A1B9A' },
    cancelled:   { bg: '#FDECEA', fg: '#B71C1C' },
    accepted:    { bg: '#FFF8E1', fg: '#F57F17' },
    scheduled:   { bg: '#E0F2F1', fg: '#00695C' },
  };

  const statusStyle = (status: string) =>
    STATUS_COLORS[(status || '').toLowerCase()] || { bg: '#F5F5F5', fg: '#555' };

  const renderMyTripItem = ({ item }: { item: any }) => {
    const st = statusStyle(item.status);
    const driverName = getDriverDisplayName(item);
    const initials = getInitials(driverName);
    const { bg: avatarBg, text: avatarText } = avatarColors(initials[0] || 'D');

    return (
      <TouchableOpacity
        style={styles.myTripCard}
        activeOpacity={0.88}
        onPress={() => router.push(`/trip-details/${item.id}`)}
      >
        <View style={styles.myTripHeaderRow}>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: st.fg }]} />
            <Text style={[styles.statusText, { color: st.fg }]}>
              {(item.status || 'N/A').charAt(0).toUpperCase() + (item.status || '').slice(1).toLowerCase()}
            </Text>
          </View>
          <Text style={styles.priceTagSmall}>₦{Number(item.fare || item.price || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.myTripRouteContainer}>
          <View style={styles.myRouteLineCol}>
            <View style={styles.myRouteDotFrom} />
            <View style={styles.myRouteLineSegment} />
            <View style={styles.myRouteDotTo} />
          </View>
          <View style={styles.myRouteTextCol}>
            <Text style={styles.myRouteText} numberOfLines={1}>{getAddressText(item.origin)}</Text>
            <View style={{ height: 12 }} />
            <Text style={styles.myRouteText} numberOfLines={1}>{getAddressText(item.destination)}</Text>
          </View>
        </View>
        <View style={styles.myTripFooterRow}>
          <Text style={styles.dateText}>
            {item.date || new Date(item.createdAt || Date.now()).toDateString()}
          </Text>
          {driverName !== 'Driver' && (
            <View style={styles.driverRow}>
              <View style={[styles.avatarTiny, { backgroundColor: avatarBg }]}>
                <Text style={[styles.avatarTinyText, { color: avatarText }]}>{initials}</Text>
              </View>
              <Text style={styles.driverNameSmall}>{driverName}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" backgroundColor={COLORS.white} />

      {/* City Events Sheet */}
      {selectedCity && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedCity(null)}>
          <CityEventSheet
            city={selectedCity}
            onClose={() => setSelectedCity(null)}
            onFindRides={handleFindRides}
            onRequestRide={handleRequestRide}
          />
        </Modal>
      )}

      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.screenTitle}>Trips</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'EXPLORE' && styles.segmentBtnActive]}
            onPress={() => setViewMode('EXPLORE')}
          >
            <Ionicons name="compass-outline" size={15} color={viewMode === 'EXPLORE' ? COLORS.primary : COLORS.textSecondary} style={{ marginRight: 5 }} />
            <Text style={[styles.segmentText, viewMode === 'EXPLORE' && styles.segmentTextActive]}>Book Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'MY_TRIPS' && styles.segmentBtnActive]}
            onPress={() => setViewMode('MY_TRIPS')}
          >
            <Ionicons name="receipt-outline" size={15} color={viewMode === 'MY_TRIPS' ? COLORS.primary : COLORS.textSecondary} style={{ marginRight: 5 }} />
            <Text style={[styles.segmentText, viewMode === 'MY_TRIPS' && styles.segmentTextActive]}>My Trips</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Explore */}
      {viewMode === 'EXPLORE' && (
        <FlatList
          data={filteredTrips}
          renderItem={renderAvailableTripItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <View>
              {/* Promo Banner */}
              <View style={{ paddingHorizontal: SPACING.m, paddingTop: SPACING.m }}>
                <PromoBanner />
              </View>

              {/* City cards */}
              <Text style={styles.sectionTitle}>Where to next?</Text>
              <FlatList
                data={CITY_DATA}
                renderItem={renderCityCard}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />

              {/* Date filters */}
              <Text style={[styles.sectionTitle, { marginTop: SPACING.m }]}>When?</Text>
              <FlatList
                data={DATE_FILTERS}
                renderItem={renderDateFilter}
                keyExtractor={item => item}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />

              {/* Trips header */}
              <View style={styles.availHeaderRow}>
                <Text style={styles.sectionTitle}>
                  {destinationFilter ? `Rides to ${destinationFilter}` : 'Available Trips'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {destinationFilter && (
                    <TouchableOpacity
                      onPress={() => setDestinationFilter(null)}
                      style={styles.clearFilterBtn}
                    >
                      <Ionicons name="close-circle" size={14} color={COLORS.primary} />
                      <Text style={styles.clearFilterText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                  {filteredTrips.length > 0 && (
                    <Text style={styles.tripCountBadge}>{filteredTrips.length} found</Text>
                  )}
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <NoRideIllustration width={150} height={150} style={styles.emptyIllustration} />
              <Text style={styles.emptyTitle}>No trips found</Text>
              <Text style={styles.emptySubtitle}>
                {destinationFilter
                  ? `No rides heading to ${destinationFilter} right now`
                  : 'Try a different date or check back later'}
              </Text>
            </View>
          }
        />
      )}

      {/* My Trips */}
      {viewMode === 'MY_TRIPS' && (
        <FlatList
          data={myTripsTab === 'ACTIVE' ? activeTrips : history}
          renderItem={renderMyTripItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <View style={styles.subTabsContainer}>
              <TouchableOpacity
                onPress={() => setMyTripsTab('ACTIVE')}
                style={[styles.subTab, myTripsTab === 'ACTIVE' && styles.subTabActive]}
              >
                <Text style={[styles.subTabText, myTripsTab === 'ACTIVE' && styles.subTabTextActive]}>
                  Active {activeTrips.length > 0 ? `(${activeTrips.length})` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMyTripsTab('HISTORY')}
                style={[styles.subTab, myTripsTab === 'HISTORY' && styles.subTabActive]}
              >
                <Text style={[styles.subTabText, myTripsTab === 'HISTORY' && styles.subTabTextActive]}>
                  History {history.length > 0 ? `(${history.length})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <NoRideIllustration width={150} height={150} style={styles.emptyIllustration} />
              <Text style={styles.emptyTitle}>No {myTripsTab === 'ACTIVE' ? 'active' : 'past'} trips</Text>
              <Text style={styles.emptySubtitle}>
                {myTripsTab === 'ACTIVE' ? 'Book a ride and it will appear here' : 'Your completed trips will show up here'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Promo styles
// ---------------------------------------------------------------------------
const promoStyles = StyleSheet.create({
  wrap: { marginBottom: SPACING.m },
  slide: {
    borderRadius: 18,
    padding: SPACING.l,
    paddingVertical: 20,
    overflow: 'hidden',
  },
  slideContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headline: { fontSize: 17, fontFamily: Fonts?.bold, color: 'white', marginBottom: 4 },
  sub: { fontSize: 13, fontFamily: Fonts?.rounded, color: 'rgba(255,255,255,0.82)' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.15)' },
  dotActive: { backgroundColor: COLORS.primary, width: 16 },
});

// ---------------------------------------------------------------------------
// Event card styles
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// City sheet styles
// ---------------------------------------------------------------------------
const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  heroWrap: { position: 'relative', height: 200 },
  hero: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroText: { position: 'absolute', bottom: 20, left: 20 },
  cityName: { fontSize: 26, fontFamily: Fonts?.bold, color: 'white' },
  cityState: { fontSize: 14, fontFamily: Fonts?.rounded, color: 'rgba(255,255,255,0.85)' },
  closeBtn: { position: 'absolute', top: 16, right: 16 },
  actions: { paddingHorizontal: SPACING.m, paddingTop: SPACING.m, gap: 10 },
  primaryBtn: {
    height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  primaryBtnText: { color: 'white', fontSize: 15, fontFamily: Fonts?.semibold },
  secondaryBtn: {
    height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: COLORS.primary,
  },
  secondaryBtnText: { color: COLORS.primary, fontSize: 15, fontFamily: Fonts?.semibold },
});

// ---------------------------------------------------------------------------
// Main styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },

  headerContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.m,
    paddingBottom: SPACING.m,
    paddingTop: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  screenTitle: {
    fontSize: 22, fontFamily: Fonts?.semibold, color: COLORS.text,
    textAlign: 'center', marginBottom: SPACING.s,
  },
  segmentedControl: {
    flexDirection: 'row', backgroundColor: '#F0F2EF', borderRadius: 14, padding: 4,
  },
  segmentBtn: {
    flex: 1, paddingVertical: 9, alignItems: 'center',
    borderRadius: 10, flexDirection: 'row', justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.primary, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  segmentText: { fontFamily: Fonts?.rounded, color: COLORS.textSecondary, fontSize: 13 },
  segmentTextActive: { color: COLORS.primary, fontFamily: Fonts?.semibold },

  listContent: { paddingBottom: SPACING.xl + 20 },
  sectionTitle: {
    fontSize: 17, fontFamily: Fonts?.bold, color: COLORS.text,
    marginLeft: SPACING.m, marginBottom: SPACING.s, marginTop: SPACING.m,
  },
  horizontalList: { paddingHorizontal: SPACING.m, paddingBottom: 4 },

  availHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingRight: SPACING.m,
  },
  tripCountBadge: {
    fontSize: 12, fontFamily: Fonts?.semibold, color: COLORS.primary,
    backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  clearFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  clearFilterText: { fontSize: 12, color: COLORS.primary, fontFamily: Fonts?.semibold },

  // City cards
  cityCard: {
    width: 130, height: 90, borderRadius: 16,
    overflow: 'hidden', marginRight: SPACING.m,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  cityImage: { width: '100%', height: '100%' },
  cityOverlay: { ...StyleSheet.absoluteFillObject },
  cityLabel: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  cityName: { color: 'white', fontSize: 13, fontFamily: Fonts?.bold },

  chip: {
    paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, marginRight: SPACING.s,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontFamily: Fonts?.semibold, fontSize: 13 },
  chipTextSelected: { color: COLORS.white },

  availableCard: {
    backgroundColor: COLORS.white, marginHorizontal: SPACING.m, marginBottom: SPACING.m,
    borderRadius: 18, padding: SPACING.m,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  tipBubble: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF',
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginBottom: 12,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: '#BAE6FD',
  },
  tipText: { fontSize: 12, color: '#0369A1', marginLeft: 6, fontStyle: 'italic', maxWidth: 240, fontFamily: Fonts?.rounded },

  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeBlock: { flex: 1, marginRight: 12 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stopDotFrom: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#94A3B8', backgroundColor: COLORS.white },
  stopDotTo: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  routeLine: { width: 2, height: 16, backgroundColor: '#E2E8F0', marginLeft: 4, marginVertical: 3 },
  routeTextOrigin: { fontSize: 14, fontFamily: Fonts?.semibold, color: COLORS.text, flex: 1 },
  routeTextDest: { fontSize: 14, fontFamily: Fonts?.semibold, color: COLORS.text, flex: 1 },

  pricePillBlock: { alignItems: 'flex-end', gap: 4 },
  priceTag: { fontSize: 19, fontFamily: Fonts?.bold, color: COLORS.primary },
  tierBadge: { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tierText: { fontSize: 11, fontFamily: Fonts?.semibold },

  divider: { height: 1, backgroundColor: '#F0F4F0', marginVertical: SPACING.s },

  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarSmall: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 12, fontFamily: Fonts?.bold },
  driverName: { fontSize: 13, fontFamily: Fonts?.semibold, color: COLORS.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  ratingText: { fontSize: 11, color: '#F59E0B', fontFamily: Fonts?.semibold },

  metaBlock: { alignItems: 'flex-end', gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: Fonts?.rounded },

  seatsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  seatsText: { fontSize: 11, color: COLORS.primary, fontFamily: Fonts?.semibold },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 70, paddingHorizontal: 40 },
  emptyIllustration: { marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontFamily: Fonts?.bold, color: COLORS.text, marginTop: 14 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 18 },

  subTabsContainer: {
    flexDirection: 'row', paddingHorizontal: SPACING.m, marginBottom: 8,
    marginTop: SPACING.s, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  subTab: { marginRight: 24, paddingBottom: 10, paddingTop: 4 },
  subTabActive: { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  subTabText: { fontSize: 15, color: COLORS.textSecondary, fontFamily: Fonts?.semibold },
  subTabTextActive: { color: COLORS.primary },

  myTripCard: {
    backgroundColor: COLORS.white, padding: SPACING.m, borderRadius: 16,
    marginBottom: 12, marginHorizontal: SPACING.m,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  myTripHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.s },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: Fonts?.semibold },
  priceTagSmall: { fontSize: 16, fontFamily: Fonts?.bold, color: COLORS.text },

  myTripRouteContainer: { flexDirection: 'row', paddingVertical: 8, marginBottom: 8, gap: 12 },
  myRouteLineCol: { alignItems: 'center', width: 14 },
  myRouteDotFrom: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#94A3B8', backgroundColor: COLORS.white },
  myRouteLineSegment: { width: 2, flex: 1, backgroundColor: '#E2E8F0', minHeight: 16 },
  myRouteDotTo: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  myRouteTextCol: { flex: 1, justifyContent: 'space-between' },
  myRouteText: { fontSize: 14, fontFamily: Fonts?.semibold, color: COLORS.text },

  myTripFooterRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F0F4F0', paddingTop: 10,
  },
  dateText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: Fonts?.rounded },
  avatarTiny: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  avatarTinyText: { fontSize: 9, fontFamily: Fonts?.bold },
  driverNameSmall: { fontSize: 12, fontFamily: Fonts?.semibold, color: COLORS.text },
});
