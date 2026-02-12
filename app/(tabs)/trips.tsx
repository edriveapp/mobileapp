import { useAuthStore } from '@/app/stores/authStore';
import { useTripStore } from '@/app/stores/tripStore';
import { Trip } from '@/app/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, SPACING, Fonts } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
// 1. Import Safe Area & Status Bar
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Mock Data for "Where to Go" Suggestions (Horizontal Slider)
const SUGGESTED_DESTINATIONS = [
    { id: '1', name: 'Lagos', image: 'https://images.unsplash.com/photo-1719314073622-9399d167725b?q=80&w=200' },
    { id: '2', name: 'Abuja', image: 'https://images.unsplash.com/photo-1721642472312-cd30e9bd7cac?q=80&w=200' },
    { id: '3', name: 'Owerri', image: 'https://images.unsplash.com/photo-1616012623377-50b2847c207e?q=80&w=200' },
    { id: '4', name: 'Uyo', image: 'https://images.unsplash.com/photo-1598556885317-0685933610d4?q=80&w=200' },
];

export default function TripsScreen() {
    const router = useRouter();
    const { trips, fetchTrips, isLoading } = useTripStore();
    const { user } = useAuthStore();
    const [selectedDateFilter, setSelectedDateFilter] = useState('All');

    useEffect(() => {
        fetchTrips();
    }, []);

    // Mock Date Filters
    const dateFilters = ['All', 'Today', 'Tomorrow', 'Sat', 'Sun'];

    const renderDateFilter = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={[
                styles.dateFilterChip,
                selectedDateFilter === item && styles.dateFilterChipSelected
            ]}
            onPress={() => setSelectedDateFilter(item)}
        >
            <Text style={[
                styles.dateFilterText,
                selectedDateFilter === item && styles.dateFilterTextSelected
            ]}>{item}</Text>
        </TouchableOpacity>
    );

    const renderSuggestionItem = ({ item }: { item: { id: string, name: string, image: string } }) => (
        <TouchableOpacity style={styles.suggestionCard} onPress={() => console.log(`Search for ${item.name}`)}>
            <Image source={{ uri: item.image }} style={styles.suggestionImage} />
            <View style={styles.suggestionOverlay}>
                <Text style={styles.suggestionText}>{item.name}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderTripItem = ({ item }: { item: Trip }) => (
        <TouchableOpacity
            style={styles.tripCard}
            onPress={() => router.push(`/trip-details/${item.id}`)}
        >
            {/* Driver Tip / Note Section */}
            <View style={styles.driverTipContainer}>
                <IconSymbol name="bubble.left.and.bubble.right.fill" size={12} color={COLORS.primary} />
                <Text style={styles.driverTipText} numberOfLines={1}>
                    "Leaving strictly by {item.time}. AC is working perfectly."
                </Text>
            </View>

            <View style={styles.tripHeader}>
                <View style={styles.routeContainer}>
                    <Text style={styles.tripRouteOrigin}>{item.origin}</Text>
                    <View style={styles.routeLineContainer}>
                         <View style={styles.routeDot} />
                         <View style={styles.routeLine} />
                         <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
                    </View>
                    <Text style={styles.tripRouteDest}>{item.destination}</Text>
                </View>
                <Text style={styles.tripPrice}>₦{item.price.toLocaleString()}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.tripFooter}>
                <View style={styles.driverInfoSmall}>
                    {/* Placeholder for driver image */}
                    <View style={styles.driverAvatarSmall}>
                        <Text style={styles.driverInitials}>DK</Text>
                    </View>
                    <Text style={styles.driverNameSmall}>David K.</Text>
                </View>

                <View style={styles.tripMeta}>
                    <View style={styles.metaItem}>
                        <IconSymbol name="calendar" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.metaText}>{item.date}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <IconSymbol name="clock" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.metaText}>{item.time}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        // 2. Use SafeAreaView as root container
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="dark" backgroundColor={COLORS.white} />
            
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Available Trips</Text>
            </View>

            <FlatList
                data={trips}
                renderItem={renderTripItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={fetchTrips} colors={[COLORS.primary]} />
                }
                ListHeaderComponent={
                    <>
                        {/* Horizontal Suggestions Slider */}
                        <Text style={styles.sectionTitle}>Where to next?</Text>
                        <FlatList
                            data={SUGGESTED_DESTINATIONS}
                            renderItem={renderSuggestionItem}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.suggestionsList}
                        />

                        {/* Date Filters Slider */}
                        <Text style={styles.sectionTitle}>When?</Text>
                        <FlatList
                            data={dateFilters}
                            renderItem={renderDateFilter}
                            keyExtractor={(item) => item}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.dateFilterList}
                        />
                        
                        <Text style={[styles.sectionTitle, { marginTop: SPACING.m }]}>Upcoming Trips</Text>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <IconSymbol name="paperplane.fill" size={48} color={COLORS.textSecondary} />
                        <Text style={styles.emptyText}>No trips found for this date.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA', 
    },
    header: {
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.m, // Adjusted padding
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 24,
        
        textAlign: 'center',
        color: COLORS.text,
        fontFamily: Fonts.semibold,
    },
    listContent: {
        paddingBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginLeft: SPACING.m,
        marginBottom: SPACING.s,
        marginTop: SPACING.m,
        fontFamily: Fonts.bold,
    },
    
    // Suggestions Styles
    suggestionsList: {
        paddingHorizontal: SPACING.m,
        marginBottom: SPACING.m,
    },
    suggestionCard: {
        width: 140,
        height: 100,
        borderRadius: 12,
        marginRight: SPACING.m,
        overflow: 'hidden',
        backgroundColor: '#ccc',
    },
    suggestionImage: {
        width: '100%',
        height: '100%',
    },
    suggestionOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-end',
        padding: 8,
    },
    suggestionText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },

    // Date Filters Styles
    dateFilterList: {
        paddingHorizontal: SPACING.m,
        marginBottom: SPACING.s,
    },
    dateFilterChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: SPACING.s,
    },
    dateFilterChipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    dateFilterText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    dateFilterTextSelected: {
        color: COLORS.white,
    },

    // Trip Card Styles
    tripCard: {
        backgroundColor: COLORS.white,
        marginHorizontal: SPACING.m,
        marginBottom: SPACING.m,
        borderRadius: 16,
        padding: SPACING.m,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    driverTipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9FF',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: SPACING.m,
        alignSelf: 'flex-start',
    },
    driverTipText: {
        fontSize: 12,
        color: '#0284C7',
        marginLeft: 6,
        fontStyle: 'italic',
        maxWidth: 250,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.s,
    },
    routeContainer: {
        flex: 1,
    },
    tripRouteOrigin: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    routeLineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 16,
        width: 20, // Small visual connector
        marginLeft: 2,
    },
    routeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#ccc',
    },
    routeLine: {
        width: 2,
        height: 10,
        backgroundColor: '#ccc',
        position: 'absolute',
        left: 2,
        top: 6,
    },
    tripRouteDest: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: 4,
    },
    tripPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: SPACING.m,
    },
    tripFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    driverInfoSmall: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    driverAvatarSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    driverInitials: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#4338CA',
    },
    driverNameSmall: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
    },
    tripMeta: {
        flexDirection: 'row',
        gap: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
    },
    emptyText: {
        marginTop: SPACING.m,
        color: COLORS.textSecondary,
        fontSize: 16,
    },
});