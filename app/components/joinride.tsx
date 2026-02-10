import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Dimensions } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Trip } from '@/app/types';
import { COLORS, SPACING, Fonts } from '@/constants/theme';

// 1. IMPORT THE STORE
import { useTripStore } from '@/app/stores/tripStore';

const { height } = Dimensions.get('window');

interface JoinRideViewProps {
  onClose: () => void;
  // We don't strictly need 'trips' prop anymore since we fetch trending from store,
  // but we can keep it for flexibility if you pass filtered results later.
  trips?: Trip[]; 
}

export default function JoinRideView({ onClose }: JoinRideViewProps) {
  const router = useRouter();
  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');

  // 2. USE THE STORE
  const { trendingTrips } = useTripStore();

  const renderSuggestionItem = ({ item }: { item: Trip }) => (
    <TouchableOpacity 
      style={styles.suggestionItem}
      onPress={() => router.push(`/trip-details/${item.id}`)}
    >
      <View style={styles.iconContainer}>
        {/* Changed color to Green per your design */}
        <Ionicons name="location-sharp" size={20} color={COLORS.success} />
      </View>
      <View style={styles.suggestionTextContainer}>
        {/* Destination is the main Title */}
        <Text style={styles.suggestionTitle}>{item.destination}</Text>
        <Text style={styles.suggestionSubtext}>{item.date} • {item.origin}</Text>
      </View>
      <View style={styles.arrowContainer}>
         <MaterialCommunityIcons name="navigation-variant" size={20} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join a Ride</Text>
        <View style={{ width: 40 }} /> 
      </View>

      {/* Inputs */}
      <View style={styles.inputsWrapper}>
        {/* Destination Input (Top) */}
        <View style={styles.inputRow}>
          <View style={styles.greenCircleIcon}>
             <Feather name="navigation" size={16} color={COLORS.success} />
          </View>
          <TextInput 
            style={styles.inputField} 
            placeholder="Where to?" 
            value={destText}
            onChangeText={setDestText}
            autoFocus={true}
          />
        </View>

        <View style={styles.divider} />

        {/* Origin Input (Bottom) */}
        <View style={styles.inputRow}>
           <View style={styles.greenPinIcon}>
             <Ionicons name="location" size={16} color={COLORS.success} />
          </View>
          <TextInput 
            style={styles.inputField} 
            placeholder="Enter Current Location" 
            value={originText}
            onChangeText={setOriginText}
          />
        </View>
      </View>

      {/* Trending List */}
      <Text style={styles.sectionHeader}>Trending</Text>
      <FlatList
        data={trendingTrips} // Uses data from Store
        renderItem={renderSuggestionItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Footer Button */}
      <View style={styles.footerButtonContainer}>
        <TouchableOpacity style={styles.findButton}>
          <Text style={styles.findButtonText}>Find Rides</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.l, marginTop: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  
  // FIXED: fontWeight must be a string '600'
  headerTitle: { fontSize: 20, fontWeight: '600', fontFamily: Fonts.semibold },
  
  inputsWrapper: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, marginBottom: SPACING.l },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.m, height: 50 },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginLeft: 50 },
  inputField: { flex: 1, fontSize: 16, fontFamily: Fonts.rounded, color: '#000', marginLeft: SPACING.s },
  greenCircleIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  greenPinIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },

  sectionHeader: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.s, fontFamily: Fonts.rounded, marginTop: SPACING.s },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.m, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  iconContainer: { width: 36, height: 36, backgroundColor: '#E8F5E9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
  suggestionTextContainer: { flex: 1 },
  suggestionTitle: { fontSize: 16, fontWeight: '500', color: '#000', fontFamily: Fonts.rounded },
  suggestionSubtext: { fontSize: 13, color: COLORS.textSecondary, fontFamily: Fonts.rounded },
  arrowContainer: { backgroundColor: '#E8F5E9', padding: 6, borderRadius: 8 },

  footerButtonContainer: { position: 'absolute', bottom: 20, left: 0, right: 0 },
  findButton: { backgroundColor: COLORS.primary, height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  findButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', fontFamily: Fonts.rounded },
});