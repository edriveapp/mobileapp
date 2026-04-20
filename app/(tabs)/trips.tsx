import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Svg, { Rect, Circle, Path, Ellipse, Polygon, G, Defs, LinearGradient, Stop, ClipPath } from 'react-native-svg';

// Services & Stores
import { useTripStore } from '@/app/stores/tripStore';

// Constants & UI
import { COLORS, SPACING, Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getAddressText = (value: any): string =>
  typeof value === 'string' ? value : value?.address || '';

const getInitials = (name: string = '') =>
  name
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

const getDriverDisplayName = (item: any): string => {
  // Handle various shapes the API might return driver info in
  if (item.driver) {
    const d = item.driver;
    const full = [d.firstName, d.lastName].filter(Boolean).join(' ').trim();
    return full || d.name || d.email?.split('@')[0] || 'Driver';
  }
  return item.driverName || 'Driver';
};

// ---------------------------------------------------------------------------
// City SVG Illustrations
// ---------------------------------------------------------------------------

const LagosIllustration = () => (
  <Svg width="140" height="100" viewBox="0 0 140 100">
    <Defs>
      <LinearGradient id="lagSky" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FF8C00" stopOpacity="1" />
        <Stop offset="1" stopColor="#FFD580" stopOpacity="1" />
      </LinearGradient>
      <LinearGradient id="lagWater" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#1565C0" stopOpacity="0.8" />
        <Stop offset="1" stopColor="#0D47A1" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    {/* Sky */}
    <Rect width="140" height="100" fill="url(#lagSky)" />
    {/* Water */}
    <Rect x="0" y="72" width="140" height="28" fill="url(#lagWater)" />
    {/* Sun */}
    <Circle cx="110" cy="22" r="12" fill="#FFF176" opacity="0.9" />
    {/* Skyline buildings */}
    <Rect x="8" y="42" width="16" height="32" rx="2" fill="#1A2A3A" />
    <Rect x="10" y="38" width="12" height="8" rx="1" fill="#1A2A3A" />
    <Rect x="28" y="30" width="20" height="44" rx="2" fill="#1F3A5A" />
    <Rect x="31" y="26" width="14" height="6" rx="1" fill="#1F3A5A" />
    <Rect x="52" y="20" width="14" height="54" rx="2" fill="#24395A" />
    <Rect x="54" y="16" width="10" height="6" fill="#24395A" />
    <Rect x="70" y="35" width="18" height="37" rx="2" fill="#1A2A3A" />
    <Rect x="73" y="30" width="12" height="7" rx="1" fill="#1A2A3A" />
    <Rect x="92" y="48" width="14" height="26" rx="2" fill="#1F3A5A" />
    <Rect x="110" y="55" width="22" height="17" rx="2" fill="#1A2A3A" />
    {/* Windows */}
    <Rect x="31" y="34" width="3" height="3" rx="0.5" fill="#FFD54F" />
    <Rect x="37" y="34" width="3" height="3" rx="0.5" fill="#FFD54F" />
    <Rect x="31" y="40" width="3" height="3" rx="0.5" fill="#FFD54F" opacity="0.5" />
    <Rect x="37" y="40" width="3" height="3" rx="0.5" fill="#FFD54F" />
    <Rect x="55" y="22" width="3" height="3" rx="0.5" fill="#FFD54F" />
    <Rect x="59" y="22" width="3" height="3" rx="0.5" fill="#FFD54F" />
    <Rect x="55" y="28" width="3" height="3" rx="0.5" fill="#FFD54F" opacity="0.6" />
    {/* Bridge */}
    <Rect x="0" y="68" width="140" height="5" rx="2" fill="#2C3E50" />
    <Rect x="20" y="58" width="100" height="12" rx="2" fill="#34495E" />
    <Path d="M20 58 Q70 48 120 58" stroke="#455A64" strokeWidth="2" fill="none" />
    {/* Water reflection */}
    <Rect x="0" y="73" width="140" height="2" rx="1" fill="#1976D2" opacity="0.5" />
    <Rect x="10" y="78" width="80" height="1.5" rx="0.75" fill="#1976D2" opacity="0.3" />
  </Svg>
);

const AbujaIllustration = () => (
  <Svg width="140" height="100" viewBox="0 0 140 100">
    <Defs>
      <LinearGradient id="abjSky" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#1A237E" stopOpacity="1" />
        <Stop offset="1" stopColor="#3F51B5" stopOpacity="1" />
      </LinearGradient>
      <LinearGradient id="abjGnd" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#388E3C" stopOpacity="1" />
        <Stop offset="1" stopColor="#2E7D32" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    {/* Sky */}
    <Rect width="140" height="100" fill="url(#abjSky)" />
    {/* Ground */}
    <Rect x="0" y="75" width="140" height="25" fill="url(#abjGnd)" />
    {/* Stars */}
    <Circle cx="20" cy="10" r="1" fill="white" opacity="0.8" />
    <Circle cx="45" cy="15" r="1.2" fill="white" opacity="0.9" />
    <Circle cx="80" cy="8" r="1" fill="white" opacity="0.7" />
    <Circle cx="115" cy="12" r="1.5" fill="white" opacity="0.8" />
    <Circle cx="130" cy="25" r="1" fill="white" opacity="0.6" />
    {/* Aso Rock (rounded hill) */}
    <Ellipse cx="70" cy="75" rx="50" ry="25" fill="#5D4037" />
    <Ellipse cx="70" cy="72" rx="46" ry="20" fill="#6D4C41" />
    {/* Presidential complex */}
    <Rect x="48" y="58" width="44" height="18" rx="3" fill="#ECEFF1" />
    <Rect x="52" y="54" width="36" height="6" rx="2" fill="#ECEFF1" />
    <Rect x="63" y="50" width="14" height="6" rx="1" fill="#CFD8DC" />
    <Rect x="63" y="46" width="14" height="5" rx="1" fill="#B0BEC5" />
    {/* Dome */}
    <Ellipse cx="70" cy="50" rx="8" ry="5" fill="#78909C" />
    <Ellipse cx="70" cy="49" rx="6" ry="3" fill="#90A4AE" />
    {/* Flag */}
    <Rect x="70" y="40" width="1" height="10" fill="#455A64" />
    <Rect x="71" y="40" width="7" height="4" fill="#4CAF50" />
    <Rect x="71" y="42" width="7" height="2" fill="white" />
    {/* Trees */}
    <Ellipse cx="20" cy="72" rx="10" ry="8" fill="#2E7D32" />
    <Rect x="19" y="72" width="2" height="8" fill="#5D4037" />
    <Ellipse cx="118" cy="72" rx="10" ry="8" fill="#388E3C" />
    <Rect x="117" y="72" width="2" height="8" fill="#5D4037" />
    <Ellipse cx="35" cy="74" rx="8" ry="6" fill="#388E3C" />
    <Ellipse cx="105" cy="74" rx="8" ry="6" fill="#2E7D32" />
    {/* Road */}
    <Rect x="55" y="74" width="30" height="4" fill="#546E7A" />
    <Rect x="68" y="74" width="4" height="4" fill="#78909C" />
  </Svg>
);

const OweriIllustration = () => (
  <Svg width="140" height="100" viewBox="0 0 140 100">
    <Defs>
      <LinearGradient id="owrSky" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#26C6DA" stopOpacity="1" />
        <Stop offset="1" stopColor="#80DEEA" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    {/* Sky */}
    <Rect width="140" height="100" fill="url(#owrSky)" />
    {/* Ground */}
    <Rect x="0" y="72" width="140" height="28" fill="#558B2F" />
    {/* Clouds */}
    <Ellipse cx="30" cy="22" rx="18" ry="10" fill="white" opacity="0.85" />
    <Ellipse cx="20" cy="26" rx="12" ry="8" fill="white" opacity="0.85" />
    <Ellipse cx="42" cy="25" rx="12" ry="8" fill="white" opacity="0.85" />
    <Ellipse cx="100" cy="18" rx="20" ry="10" fill="white" opacity="0.7" />
    <Ellipse cx="90" cy="22" rx="12" ry="8" fill="white" opacity="0.7" />
    {/* Tropical trees */}
    <Rect x="8" y="60" width="4" height="20" rx="1" fill="#8D6E63" />
    <Ellipse cx="10" cy="56" rx="10" ry="12" fill="#1B5E20" />
    <Ellipse cx="10" cy="52" rx="7" ry="8" fill="#2E7D32" />
    <Rect x="22" y="62" width="3" height="18" rx="1" fill="#8D6E63" />
    <Ellipse cx="23" cy="58" rx="8" ry="10" fill="#2E7D32" />
    {/* Market stalls */}
    <Rect x="40" y="60" width="22" height="14" rx="2" fill="#FF8F00" />
    <Path d="M38 60 L62 60 L60 54 L40 54 Z" fill="#F9A825" />
    <Rect x="43" y="60" width="5" height="14" fill="#E65100" />
    <Rect x="52" y="60" width="5" height="14" fill="#BF360C" />
    {/* Church / Landmark */}
    <Rect x="72" y="48" width="26" height="26" rx="2" fill="#FFF9C4" />
    <Polygon points="72,48 85,35 98,48" fill="#FFF176" />
    <Rect x="82" y="28" width="6" height="10" fill="#FFF9C4" />
    <Rect x="84" y="26" width="2" height="4" fill="#FFC107" />
    {/* Cross */}
    <Rect x="84" y="22" width="2" height="8" fill="#FFD600" />
    <Rect x="82" y="24" width="6" height="2" fill="#FFD600" />
    {/* Elephant grass / plants */}
    <Rect x="105" y="68" width="3" height="12" fill="#33691E" />
    <Ellipse cx="107" cy="64" rx="10" ry="8" fill="#558B2F" />
    <Rect x="118" y="65" width="3" height="15" fill="#33691E" />
    <Ellipse cx="120" cy="61" rx="9" ry="8" fill="#689F38" />
    {/* Path */}
    <Path d="M65 74 Q85 72 110 74" stroke="#A1887F" strokeWidth="3" fill="none" strokeDasharray="4 3" />
  </Svg>
);

const UyoIllustration = () => (
  <Svg width="140" height="100" viewBox="0 0 140 100">
    <Defs>
      <LinearGradient id="uyoSky" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#7B1FA2" stopOpacity="1" />
        <Stop offset="1" stopColor="#E91E63" stopOpacity="1" />
      </LinearGradient>
      <LinearGradient id="uyoRiver" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#29B6F6" stopOpacity="0.9" />
        <Stop offset="1" stopColor="#0288D1" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    {/* Sky */}
    <Rect width="140" height="100" fill="url(#uyoSky)" />
    {/* Moon */}
    <Circle cx="115" cy="20" r="14" fill="#FFF9C4" opacity="0.9" />
    <Circle cx="120" cy="16" r="11" fill="#7B1FA2" opacity="0.7" />
    {/* Stars */}
    <Circle cx="18" cy="12" r="1.2" fill="white" opacity="0.9" />
    <Circle cx="35" cy="8" r="0.8" fill="white" opacity="0.8" />
    <Circle cx="60" cy="15" r="1" fill="white" opacity="0.7" />
    <Circle cx="90" cy="10" r="1.5" fill="white" opacity="0.8" />
    <Circle cx="128" cy="35" r="0.8" fill="white" opacity="0.6" />
    {/* River / Qua Iboe */}
    <Ellipse cx="70" cy="80" rx="70" ry="16" fill="url(#uyoRiver)" />
    {/* Mangrove trees */}
    <Rect x="5" y="55" width="3" height="30" rx="1" fill="#4E342E" />
    <Ellipse cx="6" cy="50" rx="9" ry="12" fill="#1B5E20" />
    <Rect x="15" y="58" width="3" height="27" rx="1" fill="#5D4037" />
    <Ellipse cx="16" cy="53" rx="8" ry="10" fill="#2E7D32" />
    <Rect x="118" y="52" width="3" height="30" rx="1" fill="#4E342E" />
    <Ellipse cx="120" cy="47" rx="10" ry="13" fill="#1B5E20" />
    <Rect x="130" y="57" width="3" height="25" rx="1" fill="#5D4037" />
    <Ellipse cx="131" cy="52" rx="8" ry="10" fill="#2E7D32" />
    {/* Government Buildings */}
    <Rect x="40" y="50" width="20" height="28" rx="3" fill="#CE93D8" />
    <Rect x="44" y="44" width="12" height="8" rx="2" fill="#BA68C8" />
    <Rect x="48" y="40" width="4" height="6" fill="#AB47BC" />
    <Rect x="65" y="54" width="30" height="24" rx="2" fill="#D1C4E9" />
    <Rect x="69" y="50" width="22" height="6" rx="2" fill="#B39DDB" />
    {/* Arch (Ibom icon) */}
    <Path d="M72 54 Q80 44 88 54" stroke="#9C27B0" strokeWidth="3" fill="none" />
    {/* Windows */}
    <Rect x="43" y="52" width="4" height="4" rx="1" fill="#F3E5F5" />
    <Rect x="51" y="52" width="4" height="4" rx="1" fill="#F3E5F5" />
    <Rect x="43" y="60" width="4" height="4" rx="1" fill="#F3E5F5" opacity="0.6" />
    <Rect x="69" y="56" width="5" height="5" rx="1" fill="#EDE7F6" />
    <Rect x="80" y="56" width="5" height="5" rx="1" fill="#EDE7F6" />
    {/* Water ripples */}
    <Ellipse cx="50" cy="80" rx="20" ry="3" fill="#4FC3F7" opacity="0.4" />
    <Ellipse cx="95" cy="84" rx="25" ry="3" fill="#29B6F6" opacity="0.3" />
  </Svg>
);

const PORT_HARCOURT_SVG = () => (
  <Svg width="140" height="100" viewBox="0 0 140 100">
    <Defs>
      <LinearGradient id="phSky" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#00695C" stopOpacity="1" />
        <Stop offset="1" stopColor="#26A69A" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Rect width="140" height="100" fill="url(#phSky)" />
    <Rect x="0" y="70" width="140" height="30" fill="#1A3C2A" />
    {/* Oil rig silhouette */}
    <Rect x="55" y="38" width="30" height="34" rx="2" fill="#1A2A2A" />
    <Rect x="58" y="32" width="24" height="8" rx="1" fill="#1A2A2A" />
    <Rect x="64" y="26" width="12" height="8" rx="1" fill="#1A2A2A" />
    <Rect x="69" y="20" width="2" height="8" fill="#2C3E50" />
    {/* Flame on top */}
    <Path d="M69 20 Q71 14 73 20 Q72 17 70 20 Z" fill="#FF6F00" />
    <Circle cx="71" cy="18" r="2" fill="#FFB300" opacity="0.8" />
    {/* Windows/lights */}
    <Rect x="60" y="40" width="4" height="4" rx="1" fill="#FFF176" />
    <Rect x="67" y="40" width="4" height="4" rx="1" fill="#FFF176" />
    <Rect x="74" y="40" width="4" height="4" rx="1" fill="#FFF176" opacity="0.6" />
    <Rect x="60" y="48" width="4" height="4" rx="1" fill="#FFF176" opacity="0.8" />
    <Rect x="74" y="48" width="4" height="4" rx="1" fill="#FFF176" />
    {/* Pipelines */}
    <Path d="M0 75 Q40 72 55 70" stroke="#546E7A" strokeWidth="4" fill="none" />
    <Path d="M85 70 Q100 72 140 75" stroke="#546E7A" strokeWidth="4" fill="none" />
    {/* Trees */}
    <Ellipse cx="20" cy="66" rx="12" ry="10" fill="#2E7D32" />
    <Rect x="19" y="66" width="2" height="10" fill="#4E342E" />
    <Ellipse cx="120" cy="66" rx="12" ry="10" fill="#388E3C" />
    <Rect x="119" y="66" width="2" height="10" fill="#4E342E" />
  </Svg>
);

type CityItem = { id: string; name: string; component: () => React.ReactElement };

const SUGGESTED_DESTINATIONS: CityItem[] = [
  { id: '1', name: 'Lagos', component: LagosIllustration },
  { id: '2', name: 'Abuja', component: AbujaIllustration },
  { id: '3', name: 'Owerri', component: OweriIllustration },
  { id: '4', name: 'Uyo', component: UyoIllustration },
  { id: '5', name: 'Port Harcourt', component: PORT_HARCOURT_SVG },
];

const DATE_FILTERS = ['All', 'Today', 'Tomorrow', 'Sat', 'Sun'];

// ---------------------------------------------------------------------------
// Avatar colour palette (consistent per driver initial)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Available-trip seat badge
// ---------------------------------------------------------------------------
const SeatsBadge = ({ count }: { count: number }) => (
  <View style={styles.seatsBadge}>
    <Ionicons name="people-outline" size={12} color={COLORS.primary} />
    <Text style={styles.seatsText}>{count} seat{count !== 1 ? 's' : ''}</Text>
  </View>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function TripsScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'EXPLORE' | 'MY_TRIPS'>('EXPLORE');
  const [myTripsTab, setMyTripsTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [selectedDateFilter, setSelectedDateFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { trips, activeTrips, history, fetchTrips, fetchMyTrips, isLoading } = useTripStore();

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

  // -------------------------------------------------------------------------
  // RENDERERS — EXPLORE
  // -------------------------------------------------------------------------
  const renderSuggestionItem = ({ item }: { item: CityItem }) => {
    const CityArt = item.component;
    return (
      <TouchableOpacity
        style={styles.suggestionCard}
        activeOpacity={0.85}
        onPress={() => console.log(`Search for ${item.name}`)}
      >
        <View style={styles.suggestionArt}>
          <CityArt />
        </View>
        <View style={styles.suggestionLabelRow}>
          <Ionicons name="location-sharp" size={12} color={COLORS.primary} />
          <Text style={styles.suggestionText}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

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
        {/* Trip notes bubble */}
        {(item.notes || item.description) && (
          <View style={styles.tipBubble}>
            <Ionicons name="chatbubble-ellipses-outline" size={12} color="#0284C7" />
            <Text style={styles.tipText} numberOfLines={1}>
              {item.notes || item.description}
            </Text>
          </View>
        )}

        <View style={styles.cardHeaderRow}>
          {/* Route */}
          <View style={styles.routeBlock}>
            <View style={styles.stopRow}>
              <View style={styles.stopDotFrom} />
              <Text style={styles.routeTextOrigin} numberOfLines={1}>
                {getAddressText(item.origin)}
              </Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.stopRow}>
              <View style={styles.stopDotTo} />
              <Text style={styles.routeTextDest} numberOfLines={1}>
                {getAddressText(item.destination)}
              </Text>
            </View>
          </View>

          {/* Price + tier */}
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
          {/* Driver */}
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

          {/* Meta */}
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
  // RENDERERS — MY TRIPS
  // -------------------------------------------------------------------------
  const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
    active: { bg: '#E8F5E9', fg: '#2E7D32' },
    in_progress: { bg: '#E3F2FD', fg: '#1565C0' },
    completed: { bg: '#F3E5F5', fg: '#6A1B9A' },
    cancelled: { bg: '#FDECEA', fg: '#B71C1C' },
    accepted: { bg: '#FFF8E1', fg: '#F57F17' },
    scheduled: { bg: '#E0F2F1', fg: '#00695C' },
  };

  const statusStyle = (status: string) => {
    const key = (status || '').toLowerCase();
    return STATUS_COLORS[key] || { bg: '#F5F5F5', fg: '#555' };
  };

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

        {/* Route Visual */}
        <View style={styles.myTripRouteContainer}>
          <View style={styles.myRouteLineCol}>
            <View style={styles.myRouteDotFrom} />
            <View style={styles.myRouteLineSegment} />
            <View style={styles.myRouteDotTo} />
          </View>
          <View style={styles.myRouteTextCol}>
            <Text style={styles.myRouteText} numberOfLines={1}>
              {getAddressText(item.origin)}
            </Text>
            <View style={{ height: 12 }} />
            <Text style={styles.myRouteText} numberOfLines={1}>
              {getAddressText(item.destination)}
            </Text>
          </View>
        </View>

        {/* Footer */}
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
  // MAIN RENDER
  // -------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.screenTitle}>Trips</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'EXPLORE' && styles.segmentBtnActive]}
            onPress={() => setViewMode('EXPLORE')}
          >
            <Ionicons
              name="compass-outline"
              size={15}
              color={viewMode === 'EXPLORE' ? COLORS.primary : COLORS.textSecondary}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.segmentText, viewMode === 'EXPLORE' && styles.segmentTextActive]}>
              Book Ride
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'MY_TRIPS' && styles.segmentBtnActive]}
            onPress={() => setViewMode('MY_TRIPS')}
          >
            <Ionicons
              name="receipt-outline"
              size={15}
              color={viewMode === 'MY_TRIPS' ? COLORS.primary : COLORS.textSecondary}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.segmentText, viewMode === 'MY_TRIPS' && styles.segmentTextActive]}>
              My Trips
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conditional List */}
      {viewMode === 'EXPLORE' ? (
        <FlatList
          data={trips}
          renderItem={renderAvailableTripItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <View>
              <Text style={styles.sectionTitle}>Where to next?</Text>
              <FlatList
                data={SUGGESTED_DESTINATIONS}
                renderItem={renderSuggestionItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />

              <Text style={[styles.sectionTitle, { marginTop: SPACING.m }]}>When?</Text>
              <FlatList
                data={DATE_FILTERS}
                renderItem={renderDateFilter}
                keyExtractor={(item) => item}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />

              <View style={styles.availHeaderRow}>
                <Text style={styles.sectionTitle}>Available Trips</Text>
                {trips.length > 0 && (
                  <Text style={styles.tripCountBadge}>{trips.length} found</Text>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="car-sport-outline" size={56} color="#C8D5CC" />
              <Text style={styles.emptyTitle}>No trips found</Text>
              <Text style={styles.emptySubtitle}>Try a different date or check back later</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={myTripsTab === 'ACTIVE' ? activeTrips : history}
          renderItem={renderMyTripItem}
          keyExtractor={(item) => item.id}
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
              <Ionicons name="map-outline" size={56} color="#C8D5CC" />
              <Text style={styles.emptyTitle}>
                No {myTripsTab === 'ACTIVE' ? 'active' : 'past'} trips
              </Text>
              <Text style={styles.emptySubtitle}>
                {myTripsTab === 'ACTIVE'
                  ? 'Book a ride and it will appear here'
                  : 'Your completed trips will show up here'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },

  // Header
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
    fontSize: 22,
    fontFamily: Fonts?.semibold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.s,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F0F2EF',
    borderRadius: 14,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontFamily: Fonts?.rounded,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  segmentTextActive: {
    color: COLORS.primary,
    fontFamily: Fonts?.semibold,
  },

  // Lists
  listContent: { paddingBottom: SPACING.xl + 20 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: Fonts?.bold,
    color: COLORS.text,
    marginLeft: SPACING.m,
    marginBottom: SPACING.s,
    marginTop: SPACING.m,
  },
  horizontalList: { paddingHorizontal: SPACING.m, paddingBottom: 4 },

  availHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: SPACING.m,
  },
  tripCountBadge: {
    fontSize: 12,
    fontFamily: Fonts?.semibold,
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },

  // Suggestions (City cards)
  suggestionCard: {
    width: 136,
    marginRight: SPACING.m,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F0F2EF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  suggestionArt: {
    width: 136,
    height: 95,
    overflow: 'hidden',
  },
  suggestionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
    backgroundColor: COLORS.white,
  },
  suggestionText: {
    fontFamily: Fonts?.semibold,
    color: COLORS.text,
    fontSize: 13,
  },

  // Date filter chips
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: SPACING.s,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontFamily: Fonts?.semibold, fontSize: 13 },
  chipTextSelected: { color: COLORS.white },

  // Available Trip Cards
  availableCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.m,
    borderRadius: 18,
    padding: SPACING.m,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  tipBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  tipText: {
    fontSize: 12,
    color: '#0369A1',
    marginLeft: 6,
    fontStyle: 'italic',
    maxWidth: 240,
    fontFamily: Fonts?.rounded,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
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
  avatarSmall: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 12, fontFamily: Fonts?.bold },
  driverName: { fontSize: 13, fontFamily: Fonts?.semibold, color: COLORS.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  ratingText: { fontSize: 11, color: '#F59E0B', fontFamily: Fonts?.semibold },

  metaBlock: { alignItems: 'flex-end', gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: Fonts?.rounded },

  seatsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  seatsText: { fontSize: 11, color: COLORS.primary, fontFamily: Fonts?.semibold },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 70, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontFamily: Fonts?.bold, color: COLORS.text, marginTop: 14 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 18 },

  // My Trips Tab
  subTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.m,
    marginBottom: 8,
    marginTop: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subTab: { marginRight: 24, paddingBottom: 10, paddingTop: 4 },
  subTabActive: { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  subTabText: { fontSize: 15, color: COLORS.textSecondary, fontFamily: Fonts?.semibold },
  subTabTextActive: { color: COLORS.primary },

  myTripCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.m,
    borderRadius: 16,
    marginBottom: 12,
    marginHorizontal: SPACING.m,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  myTripHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: Fonts?.semibold },
  priceTagSmall: { fontSize: 16, fontFamily: Fonts?.bold, color: COLORS.text },

  myTripRouteContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    marginBottom: 8,
    gap: 12,
  },
  myRouteLineCol: { alignItems: 'center', width: 14 },
  myRouteDotFrom: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, borderColor: '#94A3B8', backgroundColor: COLORS.white,
  },
  myRouteLineSegment: { width: 2, flex: 1, backgroundColor: '#E2E8F0', minHeight: 16 },
  myRouteDotTo: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  myRouteTextCol: { flex: 1, justifyContent: 'space-between' },
  myRouteText: { fontSize: 14, fontFamily: Fonts?.semibold, color: COLORS.text },

  myTripFooterRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F0F4F0', paddingTop: 10,
  },
  dateText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: Fonts?.rounded },
  avatarTiny: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarTinyText: { fontSize: 9, fontFamily: Fonts?.bold },
  driverNameSmall: { fontSize: 12, fontFamily: Fonts?.semibold, color: COLORS.text },
});
