import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    Platform,
    FlatList,
    TextInput,
    Alert,
    Keyboard,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationService } from '@/app/services/locationService';
import { useRideRealtimeStore } from '@/app/stores/rideRealtimeStore';
import { useTripStore } from '@/app/stores/tripStore';
import { useSocketStore } from '@/app/stores/socketStore';
import { useAuthStore } from '@/app/stores/authStore';
import { NavigatrService } from '@/app/services/navigatrService';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

interface PlaceResult {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
}

const getDirections = async (startLoc: { latitude: number; longitude: number }, destLoc: { latitude: number; longitude: number }) => {
    try {
        const result = await NavigatrService.route(
            { lat: startLoc.latitude, lng: startLoc.longitude },
            { lat: destLoc.latitude, lng: destLoc.longitude },
            { maneuvers: true }
        );
        const coordinates = result.polyline.map((p: { lat: number; lng: number }) => ({
            latitude: p.lat,
            longitude: p.lng,
        }));
        return {
            coordinates,
            distance: result.distanceMeters / 1000,
            duration: result.durationSeconds / 60,
            durationText: result.durationText,
            distanceText: result.distanceText,
        };
    } catch {
        return null;
    }
};

export default function DriverMapScreen() {
    const mapRef = useRef<MapView>(null);
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();
    const router = useRouter();
    const { tripId: paramTripId } = useLocalSearchParams<{ tripId?: string }>();
    const {
        availableTrips,
        activeTrips,
        fetchAvailableTrips,
        fetchMyTrips,
        acceptRide,
        updateTripStatus
    } = useTripStore();
    const requestQueue = useRideRealtimeStore((state) => state.requestQueue);
    const dequeueRideRequest = useRideRealtimeStore((state) => state.dequeueRideRequest);

    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [isNavigating, setIsNavigating] = useState(false);
    // Track whether we've already auto-navigated for this tripId param
    const autoNavigatedRef = useRef<string | null>(null);
    
    // Navigation Data
    const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
    const [distance, setDistance] = useState(0);
    const [duration, setDuration] = useState(0);

    // Search State
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeDestination, setActiveDestination] = useState<PlaceResult | null>(null);
    const [selectedRideRequestId, setSelectedRideRequestId] = useState<string | null>(null);
    const [notchMinimized, setNotchMinimized] = useState(false);
    const [panelHeight, setPanelHeight] = useState(140);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    
    const searchTimeout = useRef<any>(null);

    // Initial Location Load
    useEffect(() => {
        let mounted = true;
        (async () => {
            const coords = await LocationService.getCurrentCoordinates();
            if (mounted && coords) {
                setLocation(coords);
                setLoading(false);
                await fetchAvailableTrips({ role: 'driver' });
                await fetchMyTrips();
            }
        })();
        return () => { mounted = false; };
    }, [fetchAvailableTrips, fetchMyTrips]);

    // When opened from dashboard via "Start Trip", auto-navigate to the pickup and expand notch
    useEffect(() => {
        if (!paramTripId || !location || loading) return;
        if (autoNavigatedRef.current === paramTripId) return;

        const ride = activeTrips.find(
            (r: any) =>
                r.id === paramTripId &&
                ['accepted', 'arrived', 'arriving', 'in_progress'].includes(String(r.status).toLowerCase()),
        );
        if (!ride) return;

        const pickup = ride.pickupLocation || ride.origin;
        if (!pickup?.lat || !pickup?.lon) return;

        autoNavigatedRef.current = paramTripId;
        setNotchMinimized(false);

        handleSelectDestination({
            place_id: ride.id,
            display_name: pickup.address || 'Pickup',
            lat: String(pickup.lat),
            lon: String(pickup.lon),
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paramTripId, location, loading, activeTrips.length]);

    // Broadcast driver location to rider every 5 seconds while navigating an active ride
    useEffect(() => {
        if (!isNavigating || !location) return;

        const activePickup = activeTrips.find(
            (ride: any) => ['accepted', 'arrived', 'arriving', 'in_progress'].includes(String(ride.status).toLowerCase())
        );
        if (!activePickup?.passengerId) return;

        const socket = useSocketStore.getState().socket;
        const user = useAuthStore.getState().user;
        if (!socket || !user) return;

        const interval = setInterval(() => {
            socket.emit('update_location', {
                driverId: user.id,
                rideId: activePickup.id,
                passengerId: activePickup.passengerId,
                lat: location.latitude,
                lon: location.longitude,
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [isNavigating, location, activeTrips]);

    const liveRideRequests = (requestQueue.length > 0 ? requestQueue : availableTrips).filter(
        (ride: any) => ride?.origin?.lat && ride?.origin?.lon,
    );

    const activePickupTrips = activeTrips.filter(
        (ride: any) => ['accepted', 'arrived', 'arriving', 'in_progress'].includes(String(ride.status).toLowerCase())
    );

    // Pin the trip that was tapped from the dashboard; fall back to the first active ride
    const currentActiveRide =
        (paramTripId ? activePickupTrips.find((r: any) => r.id === paramTripId) : null) ||
        activePickupTrips[0] ||
        null;

    const selectedRideRequest = liveRideRequests.find((ride: any) => ride.id === selectedRideRequestId) || null;

    const getPassengerName = (ride: any) => {
        const firstName = String(ride?.passenger?.firstName || '').trim();
        return firstName || ride?.passenger?.name || ride?.passenger?.email || ride?.passenger?.phone || 'Passenger';
    };

    const getDispatchText = (ride: any) => {
        const status = String(ride?.status || '').toLowerCase();
        const passengerName = getPassengerName(ride);
        if (status === 'arrived') {
            return `Dispatch: You are at ${passengerName}'s pickup point. Start trip when rider boards.`;
        }
        if (status === 'in_progress') {
            return 'Dispatch: Follow route to rider drop-off location.';
        }
        return `Dispatch: Follow route to ${passengerName}'s pickup location.`;
    };

    // --- OPTIMIZED SEARCH (Fixes Freezing) ---
    const handleSearchInput = useCallback((text: string) => {
        setSearchQuery(text);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (text.length < 3) {
            setSearchResults([]);
            return;
        }

        // Debounce: Wait 800ms before making network request
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

    const handleSelectDestination = async (place: PlaceResult) => {
        if (!location) return;
        
        Keyboard.dismiss();
        setModalVisible(false);
        setActiveDestination(place);
        
        const destCoords = {
            latitude: parseFloat(place.lat),
            longitude: parseFloat(place.lon)
        };

        const routeData = await getDirections(location, destCoords);
        
        if (routeData) {
            setRouteCoordinates(routeData.coordinates);
            setDistance(routeData.distance);
            setDuration(routeData.duration);
            
            setIsNavigating(true);
            
            // Start Navigation Camera Mode
            mapRef.current?.animateCamera({
                center: location,
                pitch: 60, // Higher pitch for better 3D road view
                heading: 0, 
                zoom: 19, // Closer zoom
                altitude: 50 
            }, { duration: 1000 });
        } else {
            Alert.alert("Error", "Could not calculate route.");
        }
    };

    const handleUpdateStatus = async (rideId: string, status: string) => {
        setUpdatingStatus(true);
        try {
            await updateTripStatus(rideId, status);
            // If completed, move camera back
            if (status === 'completed') {
                handleStopNavigation();
            }
        } catch (error: any) {
            const isTimeout = String(error?.message).toLowerCase().includes('timeout') ||
                error?.code === 'ECONNABORTED';
            Alert.alert(
                'Status update failed',
                isTimeout
                    ? 'Request timed out. Check your connection and try again.'
                    : error?.message || 'Could not update ride status.'
            );
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleStopNavigation = () => {
        setActiveDestination(null);
        setIsNavigating(false);
        setRouteCoordinates([]);
        setDistance(0);
        setDuration(0);
        setSearchQuery('');
        
        if (location) {
            // Reset to flat view
            mapRef.current?.animateCamera({ center: location, pitch: 0, heading: 0, zoom: 15 });
        }
    };

    // "Join Direction" Function (Recenter)
    const handleRecenter = () => {
        if (!location || !mapRef.current) return;

        if (isNavigating) {
            // Snap back to 3D Navigation View
            mapRef.current.animateCamera({
                center: location,
                pitch: 60,
                heading: 0,
                zoom: 19,
            });
        } else {
            // Snap back to standard view
            mapRef.current.animateToRegion({
                ...location,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
            });
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={{
                    latitude: location?.latitude || 4.8156,
                    longitude: location?.longitude || 7.0498,
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.015,
                }}
                // Disable default location button to use our custom one
                showsMyLocationButton={false} 
                showsUserLocation={false} // We draw our own custom marker for better control
                showsCompass={false}
            >
                {/* 1. CUSTOM PIN POINT (Current Location) */}
                {location && (
                    <Marker 
                        coordinate={location} 
                        anchor={{ x: 0.5, y: 0.5 }}
                        flat // Makes marker rotate with map
                    >
                        <View style={styles.myLocationMarker}>
                            <View style={styles.myLocationInner} />
                        </View>
                    </Marker>
                )}

                {/* Destination Marker */}
                {activeDestination && (
                    <Marker coordinate={{
                        latitude: parseFloat(activeDestination.lat),
                        longitude: parseFloat(activeDestination.lon)
                    }}>
                        <View style={styles.destMarker}>
                            <Ionicons name="flag" size={16} color="white" />
                        </View>
                    </Marker>
                )}

                {liveRideRequests.map((ride: any) => (
                    <Marker
                        key={ride.id}
                        coordinate={{
                            latitude: Number(ride.origin.lat),
                            longitude: Number(ride.origin.lon),
                        }}
                        onPress={() => setSelectedRideRequestId(ride.id)}
                    >
                        <View style={styles.requestMarker}>
                            <Ionicons name="person" size={14} color="white" />
                        </View>
                    </Marker>
                ))}

                {activePickupTrips.map((ride: any) => (
                    <Marker
                        key={`pickup-${ride.id}`}
                        coordinate={{
                            latitude: Number(ride.origin.lat),
                            longitude: Number(ride.origin.lon),
                        }}
                    >
                        <View style={styles.pickupMarker}>
                            <Ionicons name="person-circle" size={18} color="white" />
                        </View>
                    </Marker>
                ))}

                {/* Route Line */}
                {routeCoordinates.length > 0 && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={COLORS.primary}
                        strokeWidth={6}
                    />
                )}
            </MapView>

            {/* Top Overlay */}
            <View style={[styles.topOverlay, { top: insets.top + SPACING.s }]}>
                {isNavigating && activeDestination ? (
                    <View style={styles.turnCard}>
                        <View style={styles.turnIcon}>
                            <Ionicons name="arrow-up" size={32} color="white" />
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.turnDist}>200m</Text>
                            <Text style={styles.turnAction} numberOfLines={1}>
                                To {activeDestination.display_name.split(',')[0]}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.statusCard}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>You are online</Text>
                    </View>
                )}
            </View>

            {/* 2. RECENTER / JOIN DIRECTION BUTTON */}
            <View style={[styles.fabContainer, { bottom: tabBarHeight + panelHeight + 16 }]}>
                <TouchableOpacity 
                    style={[styles.fab, isNavigating && styles.fabActive]} 
                    onPress={handleRecenter}
                >
                    <Ionicons 
                        name={isNavigating ? "navigate" : "locate"} 
                        size={24} 
                        color={isNavigating ? COLORS.white : COLORS.primary} 
                    />
                </TouchableOpacity>
            </View>

            {/* Bottom Panel — sits directly above the tab bar */}
            <View
                style={[styles.bottomPanel, { bottom: tabBarHeight, paddingBottom: SPACING.m }]}
                onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}
            >
                {activeDestination ? (
                    <View>
                        <View style={styles.tripInfoRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Time</Text>
                                <Text style={styles.statValue}>{Math.round(duration)} min</Text>
                            </View>
                            <View style={styles.dividerVertical} />
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Distance</Text>
                                <Text style={styles.statValue}>{distance.toFixed(1)} km</Text>
                            </View>
                        </View>
                        
                        <TouchableOpacity style={styles.stopButton} onPress={handleStopNavigation}>
                            <Text style={styles.stopButtonText}>Exit Navigation</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        <Text style={styles.panelTitle}>Where to?</Text>
                        <TouchableOpacity style={styles.navButton} onPress={() => setModalVisible(true)}>
                            <Ionicons name="search" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                            <Text style={styles.navButtonText}>Search Destination</Text>
                        </TouchableOpacity>
                        {selectedRideRequest && (
                            <View style={styles.requestPanel}>
                                <Text style={styles.requestPanelName}>{getPassengerName(selectedRideRequest)}</Text>
                                <Text style={styles.requestPanelRoute}>
                                    {selectedRideRequest.origin?.address} to {selectedRideRequest.destination?.address}
                                </Text>
                                <View style={styles.requestPanelActions}>
                                    <TouchableOpacity
                                        style={styles.requestPanelSecondary}
                                        onPress={() => setSelectedRideRequestId(null)}
                                    >
                                        <Text style={styles.requestPanelSecondaryText}>Dismiss</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.requestPanelPrimary}
                                        onPress={async () => {
                                            try {
                                                await acceptRide(selectedRideRequest.id);
                                                dequeueRideRequest(selectedRideRequest.id);
                                                setSelectedRideRequestId(null);
                                                // Automatically start navigation to pickup
                                                const destCoords = {
                                                    latitude: Number(selectedRideRequest.origin.lat),
                                                    longitude: Number(selectedRideRequest.origin.lon)
                                                };
                                                handleSelectDestination({
                                                    place_id: selectedRideRequest.id,
                                                    display_name: selectedRideRequest.origin.address,
                                                    lat: String(destCoords.latitude),
                                                    lon: String(destCoords.longitude)
                                                });
                                            } catch (error: any) {
                                                Alert.alert('Accept failed', error?.message || 'Could not accept this request.');
                                            }
                                        }}
                                    >
                                        <Text style={styles.requestPanelPrimaryText}>Pick up rider</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* Active Ride Notch */}
            {currentActiveRide && (
                <View style={[styles.notchContainer, { bottom: tabBarHeight + panelHeight + 12 }]}>
                    {notchMinimized ? (
                        <TouchableOpacity 
                            style={styles.minimizedNotch} 
                            activeOpacity={0.9}
                            onPress={() => setNotchMinimized(false)}
                        >
                            <View style={styles.notchStatusDot} />
                            <Text style={styles.notchStatusText}>
                                {String(currentActiveRide.status).toUpperCase()} • {getPassengerName(currentActiveRide)}
                            </Text>
                            <Ionicons name="chevron-up" size={18} color={COLORS.white} />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.maximizedNotch}>
                            <View style={styles.notchHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.notchTitleText}>Current Trip</Text>
                                    <Text style={styles.notchPassengerName}>{getPassengerName(currentActiveRide)}</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.minimizeBtn}
                                    onPress={() => setNotchMinimized(true)}
                                >
                                    <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.notchBody}>
                                <View style={styles.routePreview}>
                                    <View style={styles.routeLine} />
                                    <View style={styles.routeItem}>
                                        <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
                                        <Text style={styles.routeText} numberOfLines={1}>
                                            {currentActiveRide.origin?.address}
                                        </Text>
                                    </View>
                                    <View style={styles.routeItem}>
                                        <View style={[styles.dot, { backgroundColor: '#FF5722' }]} />
                                        <Text style={styles.routeText} numberOfLines={1}>
                                            {currentActiveRide.destination?.address}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.dispatchHint}>{getDispatchText(currentActiveRide)}</Text>
                            </View>

                            <View style={styles.notchActions}>
                                {String(currentActiveRide.status).toLowerCase() === 'accepted' && (
                                    <TouchableOpacity 
                                        style={styles.primaryActionBtn}
                                        onPress={() => handleUpdateStatus(currentActiveRide.id, 'arrived')}
                                        disabled={updatingStatus}
                                    >
                                        <Text style={styles.actionBtnText}>Mark Arrived</Text>
                                    </TouchableOpacity>
                                )}
                                {String(currentActiveRide.status).toLowerCase() === 'arrived' && (
                                    <TouchableOpacity 
                                        style={styles.primaryActionBtn}
                                        onPress={() => handleUpdateStatus(currentActiveRide.id, 'in_progress')}
                                        disabled={updatingStatus}
                                    >
                                        <Text style={styles.actionBtnText}>Start Trip</Text>
                                    </TouchableOpacity>
                                )}
                                {String(currentActiveRide.status).toLowerCase() === 'in_progress' && (
                                    <TouchableOpacity 
                                        style={[styles.primaryActionBtn, { backgroundColor: '#D32F2F' }]}
                                        onPress={() => handleUpdateStatus(currentActiveRide.id, 'completed')}
                                        disabled={updatingStatus}
                                    >
                                        <Text style={styles.actionBtnText}>Complete Trip</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity 
                                    style={styles.secondaryActionBtn}
                                    onPress={() => {
                                        router.push({
                                            pathname: '/chat/[id]',
                                            params: { 
                                                id: currentActiveRide.id,
                                                recipientName: getPassengerName(currentActiveRide)
                                            }
                                        });
                                    }}
                                >
                                    <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* SEARCH MODAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Destination</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchBox}>
                            <Ionicons name="search" size={20} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
                            <TextInput 
                                placeholder="Search places..." 
                                style={styles.searchInput}
                                placeholderTextColor={COLORS.textSecondary}
                                value={searchQuery}
                                onChangeText={handleSearchInput}
                                autoFocus={true}
                            />
                            {isSearching && <ActivityIndicator size="small" color={COLORS.primary} />}
                        </View>
                        
                        <FlatList
                            data={searchResults}
                            keyExtractor={(item) => item.place_id}
                            keyboardShouldPersistTaps="handled"
                            ListEmptyComponent={
                                searchQuery.length > 2 && !isSearching ? (
                                    <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>No places found</Text>
                                ) : null
                            }
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.destItem} 
                                    onPress={() => handleSelectDestination(item)}
                                >
                                    <View style={styles.destIcon}>
                                        <Ionicons name="location" size={20} color={COLORS.white} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.destName}>{item.display_name.split(',')[0]}</Text>
                                        <Text style={styles.destAddress} numberOfLines={1}>{item.display_name}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    map: { ...StyleSheet.absoluteFillObject },

    topOverlay: { position: 'absolute', left: SPACING.m, right: SPACING.m },
    statusCard: { backgroundColor: COLORS.white, padding: 12, borderRadius: 30, flexDirection: 'row', alignItems: 'center', alignSelf: 'center', elevation: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, marginRight: 8 },
    statusText: { fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: Fonts.bold },

    turnCard: { backgroundColor: '#005124', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', elevation: 6 },
    turnIcon: { marginRight: 16 },
    turnDist: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    turnAction: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },

    // FAB Button Position
    fabContainer: { position: 'absolute', right: SPACING.m },
    fab: {
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: COLORS.white,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
    },
    fabActive: { backgroundColor: COLORS.primary },

    bottomPanel: { position: 'absolute', left: 0, right: 0, backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.l, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12 },
    panelTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 14 },
    
    tripInfoRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.s },
    statBox: { alignItems: 'center' },
    statLabel: { fontSize: 12, color: COLORS.textSecondary },
    statValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    dividerVertical: { width: 1, backgroundColor: COLORS.border, height: '80%' },

    navButton: { backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 12 },
    navButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
    stopButton: { backgroundColor: '#FFEBEE', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    stopButtonText: { color: '#D32F2F', fontSize: 16, fontWeight: 'bold' },

    // Custom Marker for User Location
    myLocationMarker: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: 'rgba(0, 81, 36, 0.3)', // Green transparent halo
        justifyContent: 'center', alignItems: 'center',
    },
    myLocationInner: {
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: COLORS.primary, // Solid green center
        borderWidth: 2, borderColor: 'white',
    },
    requestMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FF7043',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    pickupMarker: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    requestPanel: {
        marginTop: 12,
        borderRadius: 14,
        backgroundColor: '#FFF7F3',
        borderWidth: 1,
        borderColor: '#FFD8CC',
        padding: 12,
    },
    requestPanelName: {
        fontSize: 15,
        color: COLORS.text,
        fontFamily: Fonts.semibold,
        marginBottom: 4,
    },
    requestPanelRoute: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
        marginBottom: 10,
    },
    requestPanelActions: {
        flexDirection: 'row',
        gap: 10,
    },
    requestPanelSecondary: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E3C7BB',
        alignItems: 'center',
        paddingVertical: 10,
    },
    requestPanelSecondaryText: {
        color: COLORS.text,
        fontFamily: Fonts.semibold,
        fontSize: 13,
    },
    requestPanelPrimary: {
        flex: 1,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        paddingVertical: 10,
    },
    requestPanelPrimaryText: {
        color: COLORS.white,
        fontFamily: Fonts.semibold,
        fontSize: 13,
    },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.l, height: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.l },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 12, height: 50, marginBottom: SPACING.l },
    searchInput: { flex: 1, height: '100%', fontFamily: Fonts.rounded },
    
    destItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    destIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    destName: { fontSize: 16, fontWeight: '600' },
    destAddress: { fontSize: 12, color: COLORS.textSecondary },
    destMarker: { backgroundColor: COLORS.primary, padding: 8, borderRadius: 20, borderWidth: 2, borderColor: 'white' },

    // Notch Styles
    notchContainer: {
        position: 'absolute',
        left: 15,
        right: 15,
        zIndex: 100,
    },
    minimizedNotch: {
        backgroundColor: '#111827',
        borderRadius: 30,
        paddingHorizontal: 20,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 14, elevation: 16,
        borderWidth: 1.5,
        borderColor: '#4ADE80',
    },
    notchStatusDot: {
        width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80', marginRight: 10,
    },
    notchStatusText: {
        flex: 1, color: 'white', fontSize: 14, fontWeight: '600', fontFamily: Fonts.semibold,
    },
    maximizedNotch: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, elevation: 20,
        borderWidth: 1, borderColor: '#F0F0F0',
    },
    notchHeader: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 15,
    },
    notchTitleText: {
        fontSize: 12, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2,
    },
    notchPassengerName: {
        fontSize: 18, fontWeight: 'bold', color: COLORS.text,
    },
    minimizeBtn: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center',
    },
    notchBody: {
        marginBottom: 20,
    },
    dispatchHint: {
        marginTop: 10,
        color: '#475467',
        fontSize: 13,
        lineHeight: 18,
        fontFamily: Fonts.rounded,
    },
    routePreview: {
        backgroundColor: '#FAFAFA', padding: 15, borderRadius: 16,
    },
    routeLine: {
        position: 'absolute', left: 21, top: 30, bottom: 30, width: 1, backgroundColor: '#DDD',
    },
    routeItem: {
        flexDirection: 'row', alignItems: 'center', marginVertical: 4,
    },
    dot: {
        width: 8, height: 8, borderRadius: 4, marginRight: 12, zIndex: 1,
    },
    routeText: {
        fontSize: 14, color: COLORS.text, flex: 1,
    },
    notchActions: {
        flexDirection: 'row', gap: 12,
    },
    primaryActionBtn: {
        flex: 1, backgroundColor: COLORS.primary, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    },
    actionBtnText: {
        color: 'white', fontSize: 16, fontWeight: 'bold',
    },
    secondaryActionBtn: {
        width: 52, height: 52, borderRadius: 14, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center',
    },
});
