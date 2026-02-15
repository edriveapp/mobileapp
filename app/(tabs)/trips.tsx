import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl, 
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

// Services & Stores
import { useTripStore } from '@/app/stores/tripStore';
import { useAuthStore } from '@/app/stores/authStore'; // Assuming this exists based on snippet 1
import { Trip } from '@/app/types';

// Constants & UI
import { COLORS, SPACING, Fonts } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Ionicons } from '@expo/vector-icons';

// --- MOCK DATA FOR DISCOVERY ---
const SUGGESTED_DESTINATIONS = [
  { id: '1', name: 'Lagos', image: 'https://images.unsplash.com/photo-1719314073622-9399d167725b?q=80&w=200' },
  { id: '2', name: 'Abuja', image: 'https://images.unsplash.com/photo-1721642472312-cd30e9bd7cac?q=80&w=200' },
  { id: '3', name: 'Owerri', image: 'https://images.unsplash.com/photo-1616012623377-50b2847c207e?q=80&w=200' },
  { id: '4', name: 'Uyo', image: 'https://images.unsplash.com/photo-1598556885317-0685933610d4?q=80&w=200' },
];
const DATE_FILTERS = ['All', 'Today', 'Tomorrow', 'Sat', 'Sun'];

export default function TripsScreen() {
  const router = useRouter();
  
  // --- STATE MANAGEMENT ---
  // Main View Mode: 'EXPLORE' (Snippet 2) or 'MY_TRIPS' (Snippet 1)
  const [viewMode, setViewMode] = useState<'EXPLORE' | 'MY_TRIPS'>('EXPLORE');
  
  // Snippet 1 State (My Trips Sub-tabs)
  const [myTripsTab, setMyTripsTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  
  // Snippet 2 State (Filters)
  const [selectedDateFilter, setSelectedDateFilter] = useState('All');

  // --- STORE DATA ---
  const { 
    trips,          // Available public trips
    activeTrips,    // User's booked active trips
    history,        // User's booked past trips
    fetchTrips,     // Fetch public
    fetchMyTrips,   // Fetch user specific
    isLoading 
  } = useTripStore();

  const { user } = useAuthStore();

  // Initial Fetch
  useEffect(() => {
    fetchTrips();
    fetchMyTrips();
  }, []);

  const handleRefresh = () => {
    if (viewMode === 'EXPLORE') fetchTrips();
    else fetchMyTrips();
  };

  // --- RENDERERS: EXPLORE TAB (Snippet 2 Logic) ---
  
  const renderSuggestionItem = ({ item }: { item: typeof SUGGESTED_DESTINATIONS[0] }) => (
    <TouchableOpacity style={styles.suggestionCard} onPress={() => console.log(`Search for ${item.name}`)}>
      <Image source={{ uri: item.image }} style={styles.suggestionImage} />
      <View style={styles.suggestionOverlay}>
        <Text style={styles.suggestionText}>{item.name}</Text>
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

  const renderAvailableTripItem = ({ item }: { item: Trip }) => (
    <TouchableOpacity style={styles.availableCard} onPress={() => router.push(`/trip-details/${item.id}`)}>
      {/* Driver Note Bubble */}
      <View style={styles.tipBubble}>
        <IconSymbol name="bubble.left.and.bubble.right.fill" size={12} color={COLORS.primary} />
        <Text style={styles.tipText} numberOfLines={1}>
           "Leaving strictly by {item.time}. AC is working."
        </Text>
      </View>

      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.routeTextOrigin}>{item.origin}</Text>
           {/* Visual Route Connector */}
           <View style={styles.connectorContainer}>
              <View style={styles.connectorDot} />
              <View style={styles.connectorLine} />
              <View style={[styles.connectorDot, { backgroundColor: COLORS.primary }]} />
           </View>
          <Text style={styles.routeTextDest}>{item.destination}</Text>
        </View>
        <Text style={styles.priceTag}>₦{item.price.toLocaleString()}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardFooterRow}>
        <View style={styles.driverRow}>
          <View style={styles.avatarSmall}>
             <Text style={styles.avatarText}>DK</Text>
          </View>
          <Text style={styles.driverName}>David K.</Text>
        </View>
        <View style={styles.metaRow}>
          <IconSymbol name="calendar" size={14} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{item.date}</Text>
          <View style={{width: 8}} />
          <IconSymbol name="clock" size={14} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{item.time}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // --- RENDERERS: MY TRIPS TAB (Snippet 1 Logic) ---

  const renderMyTripItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.myTripCard} onPress={() => router.push(`/trip-details/${item.id}`)}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
        <Text style={styles.priceTagSmall}>₦{item.fare || item.price}</Text>
      </View>

      <View style={styles.myTripRouteContainer}>
        <Text style={styles.addressText} numberOfLines={1}>{item.origin.address || item.origin}</Text>
        <View style={styles.verticalDots} />
        <Text style={styles.addressText} numberOfLines={1}>{item.destination.address || item.destination}</Text>
      </View>

      <View style={[styles.cardFooterRow, { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 10 }]}>
        <Text style={styles.dateText}>{new Date(item.createdAt || Date.now()).toDateString()}</Text>
        {item.driver && (
           <Text style={styles.driverNameSmall}>Driver: {item.driver.name}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // --- MAIN RENDER ---
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" backgroundColor={COLORS.white} />

      {/* 1. MAIN HEADER & SEGMENTED CONTROL */}
      <View style={styles.headerContainer}>
        <Text style={styles.screenTitle}>Trips</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[styles.segmentBtn, viewMode === 'EXPLORE' && styles.segmentBtnActive]}
            onPress={() => setViewMode('EXPLORE')}
          >
            <Text style={[styles.segmentText, viewMode === 'EXPLORE' && styles.segmentTextActive]}>Book Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segmentBtn, viewMode === 'MY_TRIPS' && styles.segmentBtnActive]}
            onPress={() => setViewMode('MY_TRIPS')}
          >
            <Text style={[styles.segmentText, viewMode === 'MY_TRIPS' && styles.segmentTextActive]}>My Trips</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. CONDITIONAL LIST RENDERING */}
      {viewMode === 'EXPLORE' ? (
        // --- MODE A: BOOK RIDE (Snippet 2) ---
        <FlatList
          data={trips}
          renderItem={renderAvailableTripItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
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

              <Text style={styles.sectionTitle}>When?</Text>
              <FlatList
                data={DATE_FILTERS}
                renderItem={renderDateFilter}
                keyExtractor={(item) => item}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
              <Text style={[styles.sectionTitle, { marginTop: SPACING.m }]}>Available Trips</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
               <Ionicons name="car-sport" size={48} color={COLORS.textSecondary} />
               <Text style={styles.emptyText}>No upcoming trips found.</Text>
            </View>
          }
        />
      ) : (
        // --- MODE B: MY TRIPS (Snippet 1) ---
        <FlatList
          data={myTripsTab === 'ACTIVE' ? activeTrips : history}
          renderItem={renderMyTripItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
          ListHeaderComponent={
            <View style={styles.subTabsContainer}>
              <TouchableOpacity 
                onPress={() => setMyTripsTab('ACTIVE')} 
                style={[styles.subTab, myTripsTab === 'ACTIVE' && styles.subTabActive]}
              >
                <Text style={[styles.subTabText, myTripsTab === 'ACTIVE' && styles.subTabTextActive]}>
                  Active ({activeTrips.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setMyTripsTab('HISTORY')} 
                style={[styles.subTab, myTripsTab === 'HISTORY' && styles.subTabActive]}
              >
                <Text style={[styles.subTabText, myTripsTab === 'HISTORY' && styles.subTabTextActive]}>
                  History
                </Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="car.fill" size={40} color="#ccc" />
              <Text style={styles.emptyText}>No {myTripsTab.toLowerCase()} trips.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  
  // --- HEADER & TABS ---
  headerContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.m,
    paddingBottom: SPACING.m,
    paddingTop: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.m,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontWeight: '400',
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.rounded,
  },
  segmentTextActive: {
    color: COLORS.text,
  },

  // --- SHARED LIST STYLES ---
  listContent: { paddingBottom: SPACING.xl },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: COLORS.text,
    marginLeft: SPACING.m,
    marginBottom: SPACING.s,
    marginTop: SPACING.m,
  },
  horizontalList: { paddingHorizontal: SPACING.m, marginBottom: SPACING.s },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: COLORS.textSecondary, marginTop: 10, fontSize: 16 },

  // --- DISCOVERY COMPONENTS (Snippet 2) ---
  suggestionCard: {
    width: 140, height: 100, borderRadius: 12, marginRight: SPACING.m,
    overflow: 'hidden', backgroundColor: '#ccc',
  },
  suggestionImage: { width: '100%', height: '100%' },
  suggestionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end', padding: 8,
  },
  suggestionText: { color: COLORS.white, fontWeight: '600', fontSize: 16, fontFamily:Fonts.semibold },
  
  chip: {
    paddingVertical: 2, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
    marginRight: SPACING.s,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontWeight: '600', fontFamily:Fonts.mono },
  chipTextSelected: { color: COLORS.white },

  availableCard: {
    backgroundColor: COLORS.white, marginHorizontal: SPACING.m, marginBottom: SPACING.m,
    borderRadius: 16, padding: SPACING.m,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  tipBubble: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF',
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginBottom: SPACING.m,
    alignSelf: 'flex-start',
  },
  tipText: { fontSize: 12, color: '#0284C7', marginLeft: 6, fontStyle: 'italic', maxWidth: 250 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeTextOrigin: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  routeTextDest: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 4 },
  connectorContainer: { flexDirection: 'row', alignItems: 'center', height: 16, width: 20, marginLeft: 2 },
  connectorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ccc' },
  connectorLine: { width: 2, height: 10, backgroundColor: '#ccc', position: 'absolute', left: 2, top: 6 },
  priceTag: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: SPACING.m },
  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  avatarSmall: { 
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#E0E7FF', 
    justifyContent: 'center', alignItems: 'center', marginRight: 8 
  },
  avatarText: { fontSize: 12, fontWeight: 'bold', color: '#4338CA' },
  driverName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: COLORS.textSecondary },

  // --- MY TRIPS COMPONENTS (Snippet 1) ---
  subTabsContainer: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginBottom: 10, marginTop: SPACING.s },
  subTab: { marginRight: 20, paddingBottom: 5 },
  subTabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  subTabText: { fontSize: 16, color: COLORS.textSecondary },
  subTabTextActive: { color: COLORS.primary, fontWeight: 'bold' },

  myTripCard: {
    backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, 
    marginHorizontal: SPACING.m, elevation: 2,
  },
  statusBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
  priceTagSmall: { fontWeight: 'bold', fontSize: 16 },
  myTripRouteContainer: { marginLeft: 0, paddingVertical: 10 },
  addressText: { fontSize: 14, fontWeight: '500', marginBottom: 10 },
  verticalDots: { 
    position: 'absolute', left: -10, top: 5, bottom: 5, width: 2, backgroundColor: '#eee' 
    // Simplified visual for snippet 1 style
  },
  dateText: { color: '#888', fontSize: 12 },
  driverNameSmall: { color: COLORS.text, fontSize: 12, fontWeight: '500' },
});