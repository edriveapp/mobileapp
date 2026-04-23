import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardEvent,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationService } from '@/app/services/locationService';
import { NavigatrService } from '@/app/services/navigatrService';
import RequestDetailsSheet, { RequestDetails } from '@/app/components/RequestDetailsSheet';
import { useSettingsStore } from '@/app/stores/settingsStore';
import { useTripStore } from '@/app/stores/tripStore';
import { getRiderOfferFloor, estimatePrivateTripFare } from '@/app/utils/pricing';

interface PlaceResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

type BookingStage = 'search' | 'matches' | 'requested' | 'confirmed';

type DriverSignalState = 'idle' | 'requested' | 'accepted';

interface DriverMatch {
  id: string;
  driverName: string;
  rating: number;
  etaMinutes: number;
  seatsLeft: number;
  directionScore: number;
  fare: number;
  baseFare: number;
  tripId: string;
  routeSummary: string;
  signalState: DriverSignalState;
}

interface RouteSuggestion {
  id: string;
  origin: string;
  destination: string;
}

const normalizeTokens = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);

const overlapScore = (a: string, b: string) => {
  const aTokens = normalizeTokens(a);
  const bTokens = normalizeTokens(b);
  if (!aTokens.length || !bTokens.length) return 0;

  const bSet = new Set(bTokens);
  const common = aTokens.filter((token) => bSet.has(token)).length;
  return common / Math.max(aTokens.length, bTokens.length);
};

const getDistanceKm = (from: { lat: number; lon: number }, to: { lat: number; lon: number }) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getAddressText = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.address || '';
};

const getDirectionScore = (origin: string, dest: string, trip: any) => {
  const tripDestination = getAddressText(trip.destination);
  const tripOrigin = getAddressText(trip.origin);
  const destinationWeight = overlapScore(dest, tripDestination) * 0.7;
  const originWeight = overlapScore(origin, tripOrigin) * 0.3;
  return Math.round((destinationWeight + originWeight) * 100);
};

const estimateFare = (baseFare: number, directionScore: number, stopsCount: number) => {
  const detourPenalty = stopsCount * 850;
  const routeDiscount = Math.round(((100 - directionScore) / 100) * 700);
  return Math.max(baseFare + detourPenalty + routeDiscount, 1500);
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


export default function JoinRideView({
  onClose,
  initialDestination = '',
}: {
  onClose: () => void;
  initialDestination?: string;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trendingTrips, fetchAvailableTrips, requestRide, isLoading } = useTripStore();

  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');
  const [originCoords, setOriginCoords] = useState<{lat: number; lon: number} | null>(null);
  const [destCoords, setDestCoords] = useState<{lat: number; lon: number} | null>(null);
  const [liveDistanceKm, setLiveDistanceKm] = useState(0);
  const [stopText, setStopText] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [isLoadingLoc, setIsLoadingLoc] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [activeField, setActiveField] = useState<'origin' | 'dest' | null>(null);
  const [bookingStage, setBookingStage] = useState<BookingStage>('search');
  const [driverMatches, setDriverMatches] = useState<DriverMatch[]>([]);
  const [routeSuggestions, setRouteSuggestions] = useState<RouteSuggestion[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isCreatingLiveRequest, setIsCreatingLiveRequest] = useState(false);
  const [showRequestDetails, setShowRequestDetails] = useState(false);

  const searchTimeout = useRef<any>(null);
  const requestTimeout = useRef<any>(null);

  const { savedPlaces, fetchSavedPlaces } = useSettingsStore();

  useEffect(() => {
    fetchSavedPlaces();
    // Fetch driver-published routes for riders to book
    fetchAvailableTrips({ role: 'rider', mode: 'driver_routes' });
  }, [fetchAvailableTrips, fetchSavedPlaces]);

  useEffect(() => {
    const onKeyboardShow = (event: KeyboardEvent) => {
      setKeyboardHeight(Math.max(event.endCoordinates.height - insets.bottom, 0));
    };

    const onKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener('keyboardWillShow', onKeyboardShow);
    const hideSub = Keyboard.addListener('keyboardWillHide', onKeyboardHide);
    const showSubAndroid = Keyboard.addListener('keyboardDidShow', onKeyboardShow);
    const hideSubAndroid = Keyboard.addListener('keyboardDidHide', onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
      showSubAndroid.remove();
      hideSubAndroid.remove();
    };
  }, [insets.bottom]);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (requestTimeout.current) clearTimeout(requestTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!initialDestination) return;
    setDestText(initialDestination);
    setDestCoords(null);
    setActiveField('dest');
    setBookingStage('search');
    setSelectedDriverId(null);
  }, [initialDestination]);

  const handleSearchLogic = useCallback((text: string, type: 'origin' | 'dest') => {
    if (type === 'origin') {
       setOriginText(text);
       setOriginCoords(null);
    } else {
       setDestText(text);
       setDestCoords(null);
    }
    setBookingStage('search');
    setSelectedDriverId(null);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await NavigatrService.autocomplete(text, 5);
        setSearchResults(results.map((r, i) => ({
          place_id: String(i),
          display_name: r.displayName || r.name,
          lat: String(r.lat),
          lon: String(r.lng),
        })));
      } catch (error) {
        console.error("Search Error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 800);
  }, []);

  const handleSelectPlace = (place: PlaceResult) => {
    const shortName = place.display_name.split(',')[0];
    if (activeField === 'origin') {
      setOriginText(shortName);
      setOriginCoords({ lat: Number(place.lat), lon: Number(place.lon) });
    } else {
      setDestText(shortName);
      setDestCoords({ lat: Number(place.lat), lon: Number(place.lon) });
    }
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const handleGetCurrentLocation = async () => {
    setIsLoadingLoc(true);
    try {
      const address = await LocationService.getCurrentState();
      const coords = await LocationService.getCurrentCoordinates();
      if (address) {
        setOriginText(address);
        if (coords) setOriginCoords({ lat: coords.latitude, lon: coords.longitude });
      }
    } catch (error) {
      console.error("Location Error:", error);
    } finally {
      setIsLoadingLoc(false);
    }
  };

  const buildDriverMatches = () => {
    const sourceTrips = trendingTrips.filter((trip: any) => {
      // For rider side, we only want trips posted by drivers that are searching.
      const hasDriver = !!trip.driverId || !!trip.driver;
      const availableSeats = typeof trip.availableSeats === 'number'
        ? trip.availableSeats
        : typeof trip.seats === 'number'
          ? trip.seats
          : 0;
      const tripStatus = String(trip.status || '').toLowerCase();
      return hasDriver && availableSeats > 0 && ['searching', 'scheduled'].includes(tripStatus);
    });

    const matches = sourceTrips
      .map((trip, index) => {
        const directionScore = getDirectionScore(originText, destText, trip);
        
        // Show even lower match scores since these are real driver posts
        if (directionScore < 10) return null;

        const driverName = trip.driver?.name || 
                           [trip.driver?.firstName, trip.driver?.lastName].filter(Boolean).join(' ').trim() || 
                           'Driver';

        const tripFare = Number(trip.seatFare ?? trip.fare ?? trip.price ?? 0);
        const availableSeats = Number(trip.availableSeats ?? trip.seats ?? 1);

        // Deterministic estimate from route fit so it is stable (no random mock values).
        const etaMinutes = Math.max(4, Math.round((110 - directionScore) / 6));

        return {
          id: `match-${trip.id}`,
          driverName,
          rating: Number(trip.driver?.rating || 4.8),
          etaMinutes,
          seatsLeft: availableSeats,
          directionScore,
          baseFare: tripFare,
          fare: tripFare, // Real fare from driver post
          tripId: trip.id,
          routeSummary: `${getAddressText(trip.origin)} to ${getAddressText(trip.destination)}`,
          signalState: 'idle' as DriverSignalState,
        };
      })
      .filter(Boolean) as DriverMatch[];

    matches.sort((a, b) => {
      if (b.directionScore !== a.directionScore) return b.directionScore - a.directionScore;
      return a.etaMinutes - b.etaMinutes;
    });

    return matches.slice(0, 6);
  };

  const buildRouteSuggestions = () => {
    const seen = new Set<string>();
    const suggestions: RouteSuggestion[] = [];

    for (const trip of trendingTrips as any[]) {
      const origin = getAddressText(trip.origin);
      const destination = getAddressText(trip.destination);
      if (!origin || !destination) continue;

      const key = `${origin}::${destination}`;
      if (seen.has(key)) continue;
      seen.add(key);

      suggestions.push({
        id: `route-${trip.id}`,
        origin,
        destination,
      });

      if (suggestions.length >= 5) break;
    }

    return suggestions;
  };

  const handleFindRides = async () => {
    if (!originText.trim() || !destText.trim()) {
      Alert.alert('Missing route', 'Enter your pickup and destination to find a matching driver.');
      return;
    }
    Keyboard.dismiss();

    let finalOriginCoords = originCoords;
    let finalDestCoords = destCoords;
    
    // Geocode if missing
    try {
      if (!finalOriginCoords) {
         const res = await NavigatrService.geocode(originText);
         finalOriginCoords = { lat: res.lat, lon: res.lng };
         setOriginCoords(finalOriginCoords);
      }
      if (!finalDestCoords) {
         const res = await NavigatrService.geocode(destText);
         finalDestCoords = { lat: res.lat, lon: res.lng };
         setDestCoords(finalDestCoords);
      }
    } catch (e) {
      // Ignore geocode errors and fallback to static routing
    }

    if (finalOriginCoords && finalDestCoords) {
      setLiveDistanceKm(getDistanceKm(finalOriginCoords, finalDestCoords));
    } else {
      setLiveDistanceKm(detectRouteDistanceKm(originText, destText));
    }

    const matches = buildDriverMatches();
    if (!matches.length) {
      const suggestions = buildRouteSuggestions();
      setRouteSuggestions(suggestions);
      Alert.alert('No route matches yet', 'Create a live request so nearby drivers can see your route now?', [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Send request',
          onPress: () => setShowRequestDetails(true),
        },
      ]);
      return;
    }

    setRouteSuggestions([]);
    setDriverMatches(matches);
    setBookingStage('matches');
  };

  const handleSignalDriver = (driver: DriverMatch) => {
    if (requestTimeout.current) clearTimeout(requestTimeout.current);

    setSelectedDriverId(driver.id);
    setBookingStage('requested');
    setDriverMatches((prev) =>
      prev.map((d) =>
        d.id === driver.id ? { ...d, signalState: 'requested' } : { ...d, signalState: 'idle' }
      )
    );

    requestTimeout.current = setTimeout(() => {
      const accepted = driver.directionScore >= 45;

      if (!accepted) {
        setBookingStage('matches');
        setSelectedDriverId(null);
        setDriverMatches((prev) => prev.map((d) => ({ ...d, signalState: 'idle' })));
        Alert.alert('Driver unavailable', 'That driver cannot take this detour now. Pick another match.');
        return;
      }

      setBookingStage('confirmed');
      setDriverMatches((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, signalState: 'accepted' } : d))
      );
    }, 1300);
  };

  const handleCancelRequest = () => {
    if (requestTimeout.current) clearTimeout(requestTimeout.current);
    setSelectedDriverId(null);
    setBookingStage('matches');
    setDriverMatches((prev) => prev.map((d) => ({ ...d, signalState: 'idle' })));
  };

  const handleAddStop = () => {
    const cleanStop = stopText.trim();
    if (!cleanStop) return;

    if (stops.length >= 2) {
      Alert.alert('Stop limit reached', 'You can add up to 2 stops per booking.');
      return;
    }

    const nextStops = [...stops, cleanStop];
    setStops(nextStops);
    setStopText('');
    setDriverMatches((prev) =>
      prev.map((match) => ({
        ...match,
        fare: estimateFare(match.baseFare, match.directionScore, nextStops.length),
      }))
    );
  };

  const handleRemoveStop = (index: number) => {
    const nextStops = stops.filter((_, idx) => idx !== index);
    setStops(nextStops);
    setDriverMatches((prev) =>
      prev.map((match) => ({
        ...match,
        fare: estimateFare(match.baseFare, match.directionScore, nextStops.length),
      }))
    );
  };

  const handleBookRide = async () => {
    const selected = driverMatches.find((driver) => driver.id === selectedDriverId);
    if (!selected) {
      Alert.alert('No driver selected', 'Pick a driver before confirming your booking.');
      return;
    }

    try {
      setIsCreatingLiveRequest(true);
      const bPayload = {
        pickupLocation: originText.trim(),
        paymentMethod: 'cash', // Can prompt for this later
        stops,
      };
      const { bookTrip } = useTripStore.getState();
      await bookTrip(selected.tripId, bPayload);
      
      Alert.alert(
        'Ride booked!',
        `${selected.driverName} has been booked for your route.`,
        [
          {
            text: 'Open trip details',
            onPress: () => {
              setBookingStage('search');
              router.push(`/trip-details/${selected.tripId}`);
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Booking failed', e?.message || 'Could not book this trip.');
      setBookingStage('matches');
    } finally {
      setIsCreatingLiveRequest(false);
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

  const renderTrendingItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => {
      // Pre-fill the search with this trending trip's origin/dest to find matches
      setOriginText(getAddressText(item.origin));
      setDestText(getAddressText(item.destination));
      handleFindRides();
    }}>
      <View style={styles.iconContainer}>
        <Ionicons name="car-sport" size={20} color={COLORS.success} />
      </View>
      <View style={styles.suggestionTextContainer}>
        <Text style={styles.suggestionTitle}>{getAddressText(item.destination)}</Text>
        <Text style={styles.suggestionSubtext}>
          {item.date || 'Now'} • {getAddressText(item.origin)}
        </Text>
      </View>
      <View style={styles.arrowContainer}>
        <MaterialCommunityIcons name="navigation-variant" size={20} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );

  const renderRouteSuggestion = ({ item }: { item: RouteSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => {
        setOriginText(item.origin);
        setDestText(item.destination);
        setRouteSuggestions([]);
      }}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="routes" size={18} color={COLORS.primary} />
      </View>
      <View style={styles.suggestionTextContainer}>
        <Text style={styles.suggestionTitle}>{item.destination}</Text>
        <Text style={styles.suggestionSubtext}>{item.origin}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderDriverMatch = ({ item }: { item: DriverMatch }) => {
    const isSelected = selectedDriverId === item.id;

    return (
      <View style={[styles.matchCard, isSelected && styles.matchCardActive]}>
        <View style={styles.matchTopRow}>
          <View style={styles.avatarBubble}>
            <Text style={styles.avatarText}>
              {item.driverName
                .split(' ')
                .map((word) => word[0])
                .join('')
                .slice(0, 2)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.matchDriverName}>{item.driverName}</Text>
            <Text style={styles.matchSubtext}>
              ETA {item.etaMinutes} min • {item.seatsLeft} seat{item.seatsLeft > 1 ? 's' : ''} left
            </Text>
          </View>
          <Text style={styles.fareText}>₦{item.fare.toLocaleString()}</Text>
        </View>

        <View style={styles.matchMetaRow}>
          <View style={styles.pill}>
            <Ionicons name="star" size={12} color="#E8AA00" />
            <Text style={styles.pillText}>{item.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.pill}>
            <Ionicons name="navigate-circle-outline" size={12} color={COLORS.primary} style={{ marginRight: 2 }} />
            <Text style={styles.pillText}>Route fit {item.directionScore}%</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Signal: {item.signalState}</Text>
          </View>
        </View>

        <Text style={styles.routeText} numberOfLines={1}>
          {item.routeSummary}
        </Text>

        <TouchableOpacity
          style={[styles.signalButton, isSelected && styles.signalButtonSelected]}
          onPress={() => handleSignalDriver(item)}
          disabled={bookingStage === 'requested' || bookingStage === 'confirmed'}
        >
          <Text style={styles.signalButtonText}>
            {isSelected ? 'Signal sent' : 'Signal driver'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const dataSource =
    bookingStage === 'search'
      ? searchResults.length > 0
        ? searchResults
        : trendingTrips
      : routeSuggestions.length > 0 && driverMatches.length === 0
        ? routeSuggestions
        : driverMatches;

  const listTitle =
    bookingStage === 'search'
      ? searchResults.length > 0
        ? 'Search Results'
        : 'Trending Trips'
      : bookingStage === 'requested'
        ? 'Notifying Driver'
        : bookingStage === 'confirmed'
          ? 'Driver Accepted'
          : routeSuggestions.length > 0 && driverMatches.length === 0
            ? 'Live Driver Routes'
            : 'Driver Matches';

  const selectedDriver = driverMatches.find((driver) => driver.id === selectedDriverId);
  const footerBottom = insets.bottom + 8;
  const estimatedRouteDistance = liveDistanceKm > 0 ? liveDistanceKm : detectRouteDistanceKm(originText, destText);
  const estimatedPrivateRequestPrice = estimatePrivateTripFare(estimatedRouteDistance);

  const handleSubmitLiveRequest = async (details: RequestDetails) => {
    try {
      setIsCreatingLiveRequest(true);
      const currentState = await LocationService.getCurrentState();
      
      const floorPrice = getRiderOfferFloor(
        estimatedPrivateRequestPrice,
        details.rideMode === 'shared' ? 'shared' : 'solo'
      );

      if (details.offerPrice < floorPrice) {
        Alert.alert(
          'Offer too low',
          `Minimum for ${details.rideMode === 'shared' ? 'shared' : 'private'} request is ₦${floorPrice.toLocaleString()}.`
        );
        return;
      }

      await requestRide({
        origin: {
          lat: originCoords?.lat ?? 0,
          lon: originCoords?.lon ?? 0,
          address: originText.trim() || currentState || 'Current location',
        },
        destination: {
          lat: destCoords?.lat ?? 0,
          lon: destCoords?.lon ?? 0,
          address: destText.trim(),
        },
        tier: 'Lite',
        price: details.offerPrice,
        tripFare: estimatedPrivateRequestPrice,
        distanceKm: estimatedRouteDistance,
        notes: details.note,
        preferences: {
          shared: details.rideMode === 'shared',
        },
      });

      setShowRequestDetails(false);
      setBookingStage('requested');
      Alert.alert(
        'Request sent',
        routeSuggestions.length
          ? 'Nearby drivers can now see your route request. You can also pick from live routes below.'
          : 'Nearby drivers can now see your route request.'
      );
    } catch (error: any) {
      Alert.alert('Request failed', error?.message || 'Unable to send live request right now.');
    } finally {
      setIsCreatingLiveRequest(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      <View style={styles.container}>

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
              placeholderTextColor="#9CA3AF"
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
              placeholderTextColor="#9CA3AF"
              value={destText}
              onFocus={() => setActiveField('dest')}
              onChangeText={(t) => handleSearchLogic(t, 'dest')}
              autoFocus={false}
            />
            {isSearching && activeField === 'dest' && <ActivityIndicator size="small" color={COLORS.primary} />}
          </View>
        </View>

        <View style={styles.stopRow}>
          <View style={styles.stopInputWrap}>
            <Feather name="map-pin" size={14} color={COLORS.primary} />
            <TextInput
              style={styles.stopInput}
              placeholder="Add stop (optional)"
              placeholderTextColor="#9CA3AF"
              value={stopText}
              onChangeText={setStopText}
              onSubmitEditing={handleAddStop}
              returnKeyType="done"
            />
          </View>
          <TouchableOpacity style={styles.addStopBtn} onPress={handleAddStop}>
            <Text style={styles.addStopText}>Add stop</Text>
          </TouchableOpacity>
        </View>

        {stops.length > 0 && (
          <View style={styles.stopsWrap}>
            {stops.map((stop, index) => (
              <TouchableOpacity key={`${stop}-${index}`} style={styles.stopChip} onPress={() => handleRemoveStop(index)}>
                <Text style={styles.stopChipText}>{stop}</Text>
                <Ionicons name="close" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionHeader}>{listTitle}</Text>
          {bookingStage !== 'search' && (
            <TouchableOpacity onPress={() => setBookingStage('search')}>
              <Text style={styles.resetLink}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

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

        <FlatList
          data={dataSource as any[]}
          renderItem={
            bookingStage === 'search'
              ? searchResults.length > 0
                ? (renderSearchResult as any)
                : (renderTrendingItem as any)
              : routeSuggestions.length > 0 && driverMatches.length === 0
                ? (renderRouteSuggestion as any)
                : (renderDriverMatch as any)
          }
          keyExtractor={(item: any) => item.place_id || item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyWrap}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.emptyText}>Looking for rides nearby...</Text>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No trips available right now.</Text>
              </View>
            )
          }
          contentContainerStyle={{ paddingBottom: 180 }}
          style={{ flex: 1 }}
        />

        <View style={[styles.footerButtonContainer, { bottom: footerBottom }]}>
          {bookingStage === 'search' && (
            <TouchableOpacity style={styles.findButton} onPress={handleFindRides} disabled={isCreatingLiveRequest}>
              <Text style={styles.findButtonText}>
                {isCreatingLiveRequest ? 'Sending Request...' : 'Find Rides'}
              </Text>
            </TouchableOpacity>
          )}

          {bookingStage === 'matches' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>
                {routeSuggestions.length > 0 && driverMatches.length === 0
                  ? 'Choose a nearby route'
                  : 'Pick a driver to signal'}
              </Text>
              <Text style={styles.infoSubtext}>
                {routeSuggestions.length > 0 && driverMatches.length === 0
                  ? 'Tap a live route to auto-fill pickup and destination, then search again.'
                  : 'Drivers already heading in your direction appear first.'}
              </Text>
            </View>
          )}

          {bookingStage === 'requested' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Sending your request...</Text>
              <Text style={styles.infoSubtext}>Waiting for {selectedDriver?.driverName || 'driver'} to respond.</Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancelRequest}>
                <Text style={styles.secondaryBtnText}>Cancel request</Text>
              </TouchableOpacity>
            </View>
          )}

          {bookingStage === 'confirmed' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Driver accepted your route</Text>
              <Text style={styles.infoSubtext}>
                {selectedDriver?.driverName} can take your route{stops.length ? ' with stops' : ''}.
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity style={styles.secondaryBtnHalf} onPress={handleCancelRequest}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtnHalf} onPress={handleBookRide}>
                  <Text style={styles.primaryBtnText}>Book Ride</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
      <RequestDetailsSheet
        visible={showRequestDetails}
        title="Send live route request"
        subtitle="Set how much you want to send, whether you want a solo or shared ride, and anything the driver should know."
        confirmText="Send live request"
        loading={isCreatingLiveRequest}
        estimatedPrivatePrice={estimatedPrivateRequestPrice}
        onClose={() => setShowRequestDetails(false)}
        onSubmit={handleSubmitLiveRequest}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.xs, position: 'relative' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.l, marginTop: 0 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600', fontFamily: Fonts.semibold },

  inputsWrapper: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, marginBottom: SPACING.l, backgroundColor: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.m, height: 50 },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginLeft: 50 },
  inputField: { flex: 1, fontSize: 16, fontFamily: Fonts.rounded, color: '#000', marginLeft: SPACING.s },
  greenCircleIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  greenPinIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },

  stopRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.s },
  stopInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  stopInput: { flex: 1, height: 42, marginLeft: 6, fontFamily: Fonts.rounded, fontSize: 14 },
  addStopBtn: {
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addStopText: { color: COLORS.primary, fontFamily: Fonts.semibold, fontSize: 13 },
  stopsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.s },
  stopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#EFF7F0',
    gap: 4,
  },
  stopChipText: { fontSize: 12, color: COLORS.primary, fontFamily: Fonts.rounded, maxWidth: 150 },

  sectionHeader: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.s, fontFamily: Fonts.rounded, marginTop: SPACING.s },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resetLink: { color: COLORS.primary, fontSize: 13, fontFamily: Fonts.semibold },

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

  matchCard: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  matchCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#F7FBF7',
  },
  matchTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: { color: 'white', fontFamily: Fonts.semibold, fontSize: 12 },
  matchDriverName: { fontFamily: Fonts.semibold, fontSize: 15, color: '#101828' },
  matchSubtext: { fontFamily: Fonts.rounded, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  fareText: { fontFamily: Fonts.semibold, fontSize: 16, color: COLORS.primary },
  matchMetaRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F2F4F7',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillText: { fontSize: 11, color: '#344054', fontFamily: Fonts.rounded },
  routeText: { fontSize: 12, color: '#667085', fontFamily: Fonts.rounded, marginBottom: 10 },
  signalButton: {
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EBF7EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signalButtonSelected: { backgroundColor: '#D7F2DF' },
  signalButtonText: { color: COLORS.primary, fontFamily: Fonts.semibold, fontSize: 14 },

  emptyWrap: { paddingVertical: 36, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, fontFamily: Fonts.rounded },

  footerButtonContainer: {
    position: 'absolute',
    left: SPACING.m,
    right: SPACING.m,
  },
  findButton: {
    backgroundColor: COLORS.primary,
    height: 53,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  findButtonText: { color: 'white', fontSize: 18, fontWeight: '500', fontFamily: Fonts.rounded },
  infoCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  infoTitle: { fontFamily: Fonts.semibold, fontSize: 15, color: '#111827', marginBottom: 4 },
  infoSubtext: { fontFamily: Fonts.rounded, fontSize: 12, color: '#6B7280', marginBottom: 10 },
  secondaryBtn: {
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D5DD',
  },
  secondaryBtnText: { fontFamily: Fonts.semibold, color: '#344054', fontSize: 14 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  secondaryBtnHalf: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D5DD',
  },
  primaryBtnHalf: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  primaryBtnText: { fontFamily: Fonts.semibold, color: 'white', fontSize: 14 },
});
