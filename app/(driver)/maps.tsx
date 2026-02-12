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
    Platform
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationService } from '@/app/services/locationService';
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
    } catch (error) {
        return null;
    }
};

export default function DriverMapScreen() {
    const mapRef = useRef<MapView>(null);
    const insets = useSafeAreaInsets();

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
    
    const searchTimeout = useRef<any>(null);

    // Initial Location Load
    useEffect(() => {
        let mounted = true;
        (async () => {
            const coords = await LocationService.getCurrentCoordinates();
            if (mounted && coords) {
                setLocation(coords);
                setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

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
                    </View>
                )}
            </View>

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
});