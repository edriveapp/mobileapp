import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettingsStore } from '@/app/stores/settingsStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

interface PlaceResult {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
}

const PRESET_ICONS: { label: string; icon: string }[] = [
    { label: 'Home', icon: 'home-outline' },
    { label: 'Work', icon: 'briefcase-outline' },
    { label: 'Gym', icon: 'fitness-outline' },
    { label: 'School', icon: 'school-outline' },
    { label: 'Other', icon: 'location-outline' },
];

export default function SavedPlacesScreen() {
    const router = useRouter();
    const { savedPlaces, fetchSavedPlaces, addSavedPlace, deleteSavedPlace, isLoading } = useSettingsStore();

    const [isAdding, setIsAdding] = useState(false);
    const [label, setLabel] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('location-outline');
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const searchTimeout = useRef<any>(null);

    useEffect(() => {
        fetchSavedPlaces();
    }, []);

    const handleSearch = useCallback((text: string) => {
        setSearchText(text);
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
                console.error('Search Error:', error);
            } finally {
                setIsSearching(false);
            }
        }, 800);
    }, []);

    const handleUseCurrentLocation = async () => {
        setIsGettingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is needed to use this feature.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = loc.coords;

            // Reverse geocode via LocationIQ
            const API_KEY = 'pk.b2973113f0eed13c609ab7a517220e92';
            const url = `https://us1.locationiq.com/v1/reverse.php?key=${API_KEY}&lat=${latitude}&lon=${longitude}&format=json`;
            const response = await fetch(url);
            const data = await response.json();

            if (data?.display_name) {
                const place: PlaceResult = {
                    place_id: `current_${Date.now()}`,
                    display_name: data.display_name,
                    lat: String(latitude),
                    lon: String(longitude),
                };
                setSelectedPlace(place);
                setSearchText(data.display_name.split(',')[0]);
                setSearchResults([]);
                Keyboard.dismiss();
            } else {
                Alert.alert('Error', 'Could not determine your address.');
            }
        } catch (error) {
            console.error('Location error:', error);
            Alert.alert('Error', 'Failed to get current location.');
        } finally {
            setIsGettingLocation(false);
        }
    };

    const handleSelectPlace = (place: PlaceResult) => {
        setSelectedPlace(place);
        setSearchText(place.display_name.split(',')[0]);
        setSearchResults([]);
        Keyboard.dismiss();
    };

    const handleSave = async () => {
        if (!selectedPlace || !label.trim()) {
            Alert.alert('Missing Info', 'Please enter a label and select a location.');
            return;
        }

        try {
            await addSavedPlace({
                label: label.trim(),
                address: selectedPlace.display_name.split(',').slice(0, 2).join(','),
                lat: parseFloat(selectedPlace.lat),
                lon: parseFloat(selectedPlace.lon),
                icon: selectedIcon,
            });
            // Reset
            setIsAdding(false);
            setLabel('');
            setSearchText('');
            setSelectedPlace(null);
            setSelectedIcon('location-outline');
        } catch {
            Alert.alert('Error', 'Failed to save place.');
        }
    };

    const handleDelete = (id: string, placeName: string) => {
        Alert.alert('Delete Place', `Remove "${placeName}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteSavedPlace(id),
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Saved Places</Text>
                <TouchableOpacity onPress={() => setIsAdding(!isAdding)}>
                    <Ionicons name={isAdding ? 'close' : 'add-circle-outline'} size={26} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* Add Place Form */}
            {isAdding && (
                <View style={styles.addForm}>
                    {/* Label selector */}
                    <View style={styles.iconRow}>
                        {PRESET_ICONS.map((item) => (
                            <TouchableOpacity
                                key={item.label}
                                style={[
                                    styles.iconChip,
                                    selectedIcon === item.icon && styles.iconChipActive,
                                ]}
                                onPress={() => {
                                    setSelectedIcon(item.icon);
                                    if (!label || PRESET_ICONS.some((p) => p.label === label)) {
                                        setLabel(item.label);
                                    }
                                }}
                            >
                                <Ionicons
                                    name={item.icon as any}
                                    size={18}
                                    color={selectedIcon === item.icon ? '#fff' : COLORS.text}
                                />
                                <Text
                                    style={[
                                        styles.iconChipText,
                                        selectedIcon === item.icon && styles.iconChipTextActive,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Custom label input */}
                    <TextInput
                        style={styles.input}
                        placeholder="Label (e.g. Home, Work)"
                        value={label}
                        onChangeText={setLabel}
                        placeholderTextColor={COLORS.textSecondary}
                    />

                    {/* Location search */}
                    <View style={styles.searchRow}>
                        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search for a location..."
                            value={searchText}
                            onChangeText={handleSearch}
                            placeholderTextColor={COLORS.textSecondary}
                        />
                        {isSearching && <ActivityIndicator size="small" color={COLORS.primary} />}
                        <TouchableOpacity
                            style={styles.locateButton}
                            onPress={handleUseCurrentLocation}
                            disabled={isGettingLocation}
                        >
                            {isGettingLocation ? (
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            ) : (
                                <Ionicons name="locate" size={20} color={COLORS.primary} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Search results */}
                    {searchResults.length > 0 && (
                        <View style={styles.resultsContainer}>
                            {searchResults.map((r) => (
                                <TouchableOpacity
                                    key={r.place_id}
                                    style={styles.resultItem}
                                    onPress={() => handleSelectPlace(r)}
                                >
                                    <Ionicons name="location" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
                                    <Text style={styles.resultText} numberOfLines={1}>{r.display_name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {selectedPlace && (
                        <View style={styles.selectedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                            <Text style={styles.selectedText} numberOfLines={1}>
                                {selectedPlace.display_name.split(',')[0]}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>Save Place</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* List of saved places */}
            {isLoading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : savedPlaces.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="bookmark-outline" size={48} color={COLORS.textSecondary} />
                    <Text style={styles.emptyText}>No saved places yet</Text>
                    <Text style={styles.emptySubtext}>Tap + to add your favorite locations</Text>
                </View>
            ) : (
                <FlatList
                    data={savedPlaces}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: SPACING.l, paddingTop: SPACING.m }}
                    renderItem={({ item }) => (
                        <View style={styles.placeItem}>
                            <View style={styles.placeIconBox}>
                                <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.placeInfo}>
                                <Text style={styles.placeLabel}>{item.label}</Text>
                                <Text style={styles.placeAddress} numberOfLines={1}>{item.address}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDelete(item.id, item.label)}>
                                <Ionicons name="trash-outline" size={20} color="#D32F2F" />
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, fontFamily: Fonts.bold },

    // Add Form
    addForm: {
        backgroundColor: COLORS.white,
        margin: SPACING.l,
        padding: SPACING.l,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: SPACING.m,
    },
    iconChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        gap: 4,
    },
    iconChipActive: {
        backgroundColor: COLORS.primary,
    },
    iconChipText: {
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.text,
    },
    iconChipTextActive: {
        color: '#fff',
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: SPACING.m,
        height: 48,
        fontSize: 15,
        fontFamily: Fonts.rounded,
        marginBottom: SPACING.s,
        color: COLORS.text,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: SPACING.m,
        height: 48,
        marginBottom: SPACING.s,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        fontFamily: Fonts.rounded,
        color: COLORS.text,
    },
    locateButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    resultsContainer: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: SPACING.s,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F0F0F0',
    },
    resultText: {
        flex: 1,
        fontSize: 14,
        color: COLORS.text,
    },
    selectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        padding: 10,
        borderRadius: 10,
        gap: 6,
        marginBottom: SPACING.m,
    },
    selectedText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.success,
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Fonts.rounded,
    },

    // Place List
    placeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.m,
        borderRadius: 12,
        marginBottom: SPACING.s,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    placeIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    placeInfo: { flex: 1 },
    placeLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: Fonts.rounded },
    placeAddress: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 80,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: SPACING.m,
        fontFamily: Fonts.rounded,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
});
