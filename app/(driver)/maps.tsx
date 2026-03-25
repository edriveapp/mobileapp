import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    FlatList,
    TextInput,
    Alert,
    Keyboard,
    Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationService } from '@/app/services/locationService';
import { useRideRealtimeStore } from '@/app/stores/rideRealtimeStore';
import { useTripStore } from '@/app/stores/tripStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

interface PlaceResult {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
}

// --- FREE ROUTING HELPER (OSRM) ---
const getDirections = async (startLoc: any, destinationLoc: any) => {
    try {
        const start = `${startLoc.longitude},${startLoc.latitude}`;
        const end = `${destinationLoc.longitude},${destinationLoc.latitude}`;
        const url = `http://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;
        
        const response = await fetch(url);
        const json = await response.json();
        
        if (json.code !== 'Ok') return null;
        
        const route = json.routes[0];
        const coordinates = route.geometry.coordinates.map((c: number[]) => ({
            latitude: c[1],
            longitude: c[0],
        }));
        
        return { coordinates, distance: route.distance / 1000, duration: route.duration / 60 };
    } catch {
        return null;
    }
};

export default function DriverMapScreen() {
    const mapRef = useRef<MapView>(null);
    const insets = useSafeAreaInsets();
    const router = useRouter();
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

    const liveRideRequests = (requestQueue.length > 0 ? requestQueue : availableTrips).filter(
        (ride: any) => ride?.origin?.lat && ride?.origin?.lon,
    );

    const activePickupTrips = activeTrips.filter(
        (ride: any) => ['accepted', 'arriving', 'in_progress'].includes(String(ride.status).toLowerCase())
    );
    
    // Most relevant active ride
    const currentActiveRide = activePickupTrips[0] || null;

    const selectedRideRequest = liveRideRequests.find((ride: any) => ride.id === selectedRideRequestId) || null;

    const getPassengerName = (ride: any) => {
        const fullName = [ride?.passenger?.firstName, ride?.passenger?.lastName].filter(Boolean).join(' ').trim();
        return fullName || ride?.passenger?.name || ride?.passenger?.email || ride?.passenger?.phone || 'Passenger';
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
                // Using LocationIQ (Free Tier)
                const API_KEY = 'pk.b2973113f0eed13c609ab7a517220e92'; 
                const url = `https://us1.locationiq.com/v1/search.php?key=${API_KEY}&q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5&countrycodes=ng`;
                
                const response = await fetch(url);
                const data = await response.json();

                if (Array.isArray(data)) {
                    setSearchResults(data);
                } else {
                    setSearchResults([]);
                }
            } catch (error) {
                console.error("Search Error:", error);
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
            Alert.alert('Status update failed', error?.message || 'Could not update ride status.');
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
                provider={PROVIDER_GOOGLE}
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
                            latitude: Number(ride.pickupLocation.lat),
                            longitude: Number(ride.pickupLocation.lon),
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
            <View style={[styles.fabContainer, { bottom: isNavigating ? 180 : 160 }]}>
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

            {/* Bottom Panel */}
            <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + SPACING.m }]}>
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
                <View style={[styles.notchContainer, { bottom: insets.bottom + 10 }]}>
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

    bottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.l, elevation: 10 },
    panelTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    
    tripInfoRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.l },
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
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 12,
    },
    notchStatusDot: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80', marginRight: 10,
    },
    notchStatusText: {
        flex: 1, color: 'white', fontSize: 13, fontWeight: '600', fontFamily: Fonts.semibold,
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
