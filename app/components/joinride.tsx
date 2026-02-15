import { Trip } from '@/app/types';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationService } from '@/app/services/locationService';
import { useSettingsStore } from '@/app/stores/settingsStore';
import { useTripStore } from '@/app/stores/tripStore';

interface PlaceResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

export default function JoinRideView({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { trendingTrips } = useTripStore();

  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');
  const [isLoadingLoc, setIsLoadingLoc] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [activeField, setActiveField] = useState<'origin' | 'dest' | null>(null);

  const searchTimeout = useRef<any>(null);

  const { savedPlaces, fetchSavedPlaces } = useSettingsStore();

  useEffect(() => {
    fetchSavedPlaces();
  }, []);

  const handleSearchLogic = useCallback((text: string, type: 'origin' | 'dest') => {
    if (type === 'origin') setOriginText(text);
    else setDestText(text);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const API_KEY = 'pk.b2973113f0eed13c609ab7a517220e92';
        const url = `https://us1.locationiq.com/v1/search.php?key=${API_KEY}&q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5&countrycodes=ng`;
        const response = await fetch(url);
        const data = await response.json();
        if (Array.isArray(data)) setSearchResults(data);
        else setSearchResults([]);
      } catch (error) {
        console.error("Search Error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 800);
  }, []);

  const handleSelectPlace = (place: PlaceResult) => {
    const shortName = place.display_name.split(',')[0];
    if (activeField === 'origin') setOriginText(shortName);
    else setDestText(shortName);
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const handleGetCurrentLocation = async () => {
    setIsLoadingLoc(true);
    try {
      const address = await LocationService.getCurrentState();
      if (address) setOriginText(address);
    } catch (error) {
      console.error("Location Error:", error);
    } finally {
      setIsLoadingLoc(false);
    }
  };

  const renderSearchResult = ({ item }: { item: PlaceResult }) => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectPlace(item)}>
      <View style={[styles.iconContainer, { backgroundColor: '#F0F4F8' }]}>
        <Ionicons name="location" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.suggestionTextContainer}>
        <Text style={styles.suggestionTitle}>{item.display_name.split(',')[0]}</Text>
        <Text style={styles.suggestionSubtext} numberOfLines={1}>{item.display_name}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderTrendingItem = ({ item }: { item: Trip }) => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => router.push(`/trip-details/${item.id}`)}>
      <View style={styles.iconContainer}>
        <Ionicons name="location-sharp" size={20} color={COLORS.success} />
      </View>
      <View style={styles.suggestionTextContainer}>
        <Text style={styles.suggestionTitle}>{item.destination}</Text>
        <Text style={styles.suggestionSubtext}>{item.date} • {item.origin}</Text>
      </View>
      <View style={styles.arrowContainer}>
        <MaterialCommunityIcons name="navigation-variant" size={20} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      <View style={styles.container}>

        {/* --- FIXED HEADER & INPUTS --- */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Join a Ride</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.inputsWrapper}>
          <View style={styles.inputRow}>
            <View style={styles.greenPinIcon}>
              <Ionicons name="location" size={16} color={COLORS.success} />
            </View>
            <TextInput
              style={styles.inputField}
              placeholder="Enter Current Location"
              value={originText}
              onFocus={() => setActiveField('origin')}
              onChangeText={(t) => handleSearchLogic(t, 'origin')}
            />
            <TouchableOpacity onPress={handleGetCurrentLocation}>
              {isLoadingLoc ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.inputRow}>
            <View style={styles.greenCircleIcon}>
              <Feather name="navigation" size={16} color={COLORS.success} />
            </View>
            <TextInput
              style={styles.inputField}
              placeholder="Where to?"
              value={destText}
              onFocus={() => setActiveField('dest')}
              onChangeText={(t) => handleSearchLogic(t, 'dest')}
              autoFocus={true}
            />
            {isSearching && activeField === 'dest' && <ActivityIndicator size="small" color={COLORS.primary} />}
          </View>
        </View>

        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionHeader}>
            {searchResults.length > 0 ? 'Search Results' : 'Trending Trips'}
          </Text>
        </View>

        {/* SAVED PLACES CHIPS */}
        {savedPlaces.length > 0 && searchResults.length === 0 && (
          <View style={styles.savedChipsRow}>
            {savedPlaces.map((place) => (
              <TouchableOpacity
                key={place.id}
                style={styles.savedChip}
                onPress={() => {
                  setDestText(place.address);
                  setActiveField('dest');
                  Keyboard.dismiss();
                }}
              >
                <Ionicons name={place.icon as any} size={14} color={COLORS.primary} />
                <Text style={styles.savedChipText}>{place.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* --- KEYBOARD AVOIDING VIEW --- */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          // FIX: Use 'undefined' for Android to prevent flickering
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <FlatList
            data={searchResults.length > 0 ? searchResults : trendingTrips}
            renderItem={searchResults.length > 0 ? (renderSearchResult as any) : renderTrendingItem}
            keyExtractor={(item: any) => item.place_id || item.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
            style={{ flex: 1 }}
          />

          <View style={styles.footerButtonContainer}>
            <TouchableOpacity style={styles.findButton}>
              <Text style={styles.findButtonText}>Find Rides</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.xs },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.l, marginTop: 0 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600', fontFamily: Fonts.semibold },

  inputsWrapper: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, marginBottom: SPACING.l, backgroundColor: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.m, height: 50 },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginLeft: 50 },
  inputField: { flex: 1, fontSize: 16, fontFamily: Fonts.rounded, color: '#000', marginLeft: SPACING.s },
  greenCircleIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  greenPinIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },

  sectionHeader: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.s, fontFamily: Fonts.rounded, marginTop: SPACING.s },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.m, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  iconContainer: { width: 36, height: 36, backgroundColor: '#E8F5E9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
  suggestionTextContainer: { flex: 1 },
  suggestionTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  suggestionSubtext: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  arrowContainer: { backgroundColor: '#E8F5E9', padding: 6, borderRadius: 8 },

  savedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.m,
    paddingHorizontal: 2,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  savedChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
    fontFamily: Fonts.rounded,
  },

  footerButtonContainer: {
    backgroundColor: 'white',
    paddingHorizontal: SPACING.m,
    paddingTop: 10,
    paddingBottom: 10,
  },
  findButton: { backgroundColor: COLORS.primary, height: 53, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  findButtonText: { color: 'white', fontSize: 18, fontWeight: '500', fontFamily: Fonts.rounded },
});