import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
    KeyboardAvoidingView
} from 'react-native';
// 1. IMPORT SafeAreaView
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { useAuthStore } from '@/app/stores/authStore';
import { useDriverStore } from '@/app/stores/driverStore';
import { useTripStore } from '@/app/stores/tripStore';

// Mock Data
const POPULAR_ROUTES = [
    { origin: 'Lagos (Jibowu)', destination: 'Abuja (Utako)' },
    { origin: 'Port Harcourt (Aba Road)', destination: 'Lagos (Yaba)' },
    { origin: 'Abuja (Utako)', destination: 'Kaduna (Mando)' },
];

const VEHICLE_TYPES = ['Toyota Sienna', 'Toyota Corolla', '18-Seater Bus'];

export default function CreateTripScreen() {
    const router = useRouter();
    const createTrip = useTripStore((state) => state.createTrip);
    const { user } = useAuthStore();
    const driverStatus = useDriverStore((state) => state.status);

    // Form State
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [tripNotes, setTripNotes] = useState('');
    
    // Date & Time State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [price, setPrice] = useState('');
    const [seats, setSeats] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState(VEHICLE_TYPES[0]);
    const [acEnabled, setAcEnabled] = useState(true);
    const [luggageEnabled, setLuggageEnabled] = useState(true);
    const [autoAccept, setAutoAccept] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Error State
    const [errors, setErrors] = useState({
        origin: false,
        destination: false,
        price: false,
        seats: false
    });

    // --- DATE HELPERS ---
    const setQuickDate = (offsetDays: number) => {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        setSelectedDate(d);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const onDateChange = (event: any, date?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (event.type === 'dismissed') return;
        
        if (date) setSelectedDate((prev) => {
            const newDate = new Date(date);
            newDate.setHours(prev.getHours(), prev.getMinutes()); // Keep time
            return newDate;
        });
    };

    const onTimeChange = (event: any, date?: Date) => {
        if (Platform.OS === 'android') setShowTimePicker(false);
        if (event.type === 'dismissed') return;

        if (date) setSelectedDate((prev) => {
            const newDate = new Date(prev);
            newDate.setHours(date.getHours(), date.getMinutes());
            return newDate;
        });
    };

    const handleCreateTrip = () => {
        // Validation Logic
        const newErrors = {
            origin: !origin.trim(),
            destination: !destination.trim(),
            price: !price.trim(),
            seats: !seats.trim()
        };
        setErrors(newErrors);

        // Check if any field has an error
        if (Object.values(newErrors).some(Boolean)) {
            Alert.alert('Missing Details', 'Please fill in all required fields highlighted in red.');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'You must be logged in');
            return;
        }

        if (driverStatus !== 'approved') {
            Alert.alert(
                'Verification Pending',
                'You cannot create a trip until your documents have been verified.',
                [
                    { text: 'Verify Now', onPress: () => router.push('/(driver)/onboarding') },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
            return;
        }

        createTrip({
            driverId: user.id,
            origin,
            destination,
            date: formatDate(selectedDate),
            time: formatTime(selectedDate),
            price: parseInt(price),
            seats: parseInt(seats),
            vehicle: selectedVehicle,
            description: tripNotes, 
            preferences: { ac: acEnabled, luggage: luggageEnabled, smoking: false },
            autoAccept,
        });

        Alert.alert('Success', 'Trip published successfully!', [
            { text: 'OK', onPress: () => router.back() },
        ]);
    };

    const applySuggestion = (route: { origin: string; destination: string }) => {
        setOrigin(route.origin);
        setDestination(route.destination);
        setErrors(prev => ({ ...prev, origin: false, destination: false })); // Clear errors
        setShowSuggestions(false);
    };

    return (
        // 2. ROOT is SafeAreaView
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="dark" backgroundColor={COLORS.background} />
            
            {/* 3. FIXED HEADER (Outside ScrollView) */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Post a Trip</Text>
                {/* Spacer for alignment */}
                <View style={{ width: 32 }} /> 
            </View>

            {/* 4. KEYBOARD AVOIDING VIEW (Wraps Content) */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    
                    {/* Origin & Destination */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Route</Text>
                        
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>From</Text>
                            <TextInput
                                style={[styles.input, errors.origin && styles.inputError]}
                                placeholder="e.g. Lagos (Jibowu)"
                                value={origin}
                                onChangeText={(t) => {
                                    setOrigin(t);
                                    if (t) setErrors(prev => ({...prev, origin: false}));
                                }}
                                onFocus={() => setShowSuggestions(true)}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>To</Text>
                            <TextInput
                                style={[styles.input, errors.destination && styles.inputError]}
                                placeholder="e.g. Abuja (Utako)"
                                value={destination}
                                onChangeText={(t) => {
                                    setDestination(t);
                                    if (t) setErrors(prev => ({...prev, destination: false}));
                                }}
                                onFocus={() => setShowSuggestions(true)}
                            />
                        </View>

                        {showSuggestions && (
                            <View style={styles.suggestionsContainer}>
                                <Text style={styles.suggestionTitle}>Popular Routes</Text>
                                {POPULAR_ROUTES.map((route, index) => (
                                    <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => applySuggestion(route)}>
                                        <Ionicons name="trending-up-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.suggestionText}>{route.origin} → {route.destination}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Schedule Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Schedule</Text>
                        
                        <View style={styles.quickDateRow}>
                            <TouchableOpacity style={styles.quickChip} onPress={() => setQuickDate(0)}>
                                <Text style={styles.quickChipText}>Today</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickChip} onPress={() => setQuickDate(1)}>
                                <Text style={styles.quickChipText}>Tomorrow</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1, marginRight: SPACING.s }]}>
                                <Text style={styles.label}>Date</Text>
                                <TouchableOpacity 
                                    style={styles.inputButton} 
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={styles.inputText}>{formatDate(selectedDate)}</Text>
                                    <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.label}>Time</Text>
                                <TouchableOpacity 
                                    style={styles.inputButton} 
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Text style={styles.inputText}>{formatTime(selectedDate)}</Text>
                                    <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={selectedDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                onChange={onDateChange}
                                minimumDate={new Date()}
                                accentColor="#005124" 
                                textColor="#005124"
                            />
                        )}
                        
                        {showTimePicker && (
                            <DateTimePicker
                                value={selectedDate}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onTimeChange}
                                accentColor="#005124"
                                textColor="#005124"
                            />
                        )}
                    </View>

                    {/* Vehicle & Capacity */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Vehicle & Pricing</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Select Vehicle</Text>
                            <View style={styles.vehicleSelector}>
                                {VEHICLE_TYPES.map((v) => (
                                    <TouchableOpacity
                                        key={v}
                                        style={[styles.vehicleOption, selectedVehicle === v && styles.vehicleOptionSelected]}
                                        onPress={() => setSelectedVehicle(v)}
                                    >
                                        <Text style={[styles.vehicleText, selectedVehicle === v && styles.vehicleTextSelected]}>{v}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1, marginRight: SPACING.s }]}>
                                <Text style={styles.label}>Price per Seat (₦)</Text>
                                <TextInput
                                    style={[styles.input, errors.price && styles.inputError]}
                                    placeholder="15000"
                                    value={price}
                                    onChangeText={(t) => {
                                        setPrice(t);
                                        if (t) setErrors(prev => ({...prev, price: false}));
                                    }}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.label}>Available Seats</Text>
                                <TextInput
                                    style={[styles.input, errors.seats && styles.inputError]}
                                    placeholder="3"
                                    value={seats}
                                    onChangeText={(t) => {
                                        setSeats(t);
                                        if (t) setErrors(prev => ({...prev, seats: false}));
                                    }}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Trip Notes Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Trip Notes</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Driver's Note (Optional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="e.g. Leaving strictly by 8:00 AM. One stop at Ore. AC is working perfectly."
                                value={tripNotes}
                                onChangeText={setTripNotes}
                                multiline={true}
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                            <Text style={styles.helperText}>Passengers will see this on the search page.</Text>
                        </View>
                    </View>

                    {/* Preferences */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Trip Preferences</Text>
                        <View style={styles.preferenceRow}>
                            <View>
                                <Text style={styles.preferenceLabel}>Air Conditioning</Text>
                                <Text style={styles.preferenceSubLabel}>Vehicle has working AC</Text>
                            </View>
                            <Switch
                                value={acEnabled}
                                onValueChange={setAcEnabled}
                                trackColor={{ false: '#767577', true: COLORS.primary }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>

                        <View style={styles.preferenceRow}>
                            <View>
                                <Text style={styles.preferenceLabel}>Luggage Allowance</Text>
                                <Text style={styles.preferenceSubLabel}>Standard luggage allowed</Text>
                            </View>
                            <Switch
                                value={luggageEnabled}
                                onValueChange={setLuggageEnabled}
                                trackColor={{ false: '#767577', true: COLORS.primary }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>

                        <View style={styles.preferenceRow}>
                            <View>
                                <Text style={styles.preferenceLabel}>Auto-Accept Bookings</Text>
                                <Text style={styles.preferenceSubLabel}>Instantly confirm riders</Text>
                            </View>
                            <Switch
                                value={autoAccept}
                                onValueChange={setAutoAccept}
                                trackColor={{ false: '#767577', true: COLORS.primary }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleCreateTrip}>
                        <Text style={styles.buttonText}>Publish Trip</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    
    // Updated Header Styles
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        zIndex: 10,
    },
    backButton: { padding: 4 },
    title: { fontSize: 20, fontWeight: '600', color: COLORS.primary, fontFamily: Fonts.semibold },
    
    content: { padding: SPACING.l, paddingBottom: 60 },
    
    section: { marginBottom: SPACING.xl },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.m, fontFamily: Fonts.mono, textTransform: 'uppercase', letterSpacing: 1 },
    
    inputContainer: { marginBottom: SPACING.m },
    label: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 6, fontFamily: Fonts.rounded },
    
    input: { 
        backgroundColor: COLORS.white, 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        borderRadius: 12, 
        padding: SPACING.m, 
        fontSize: 16, 
        fontFamily: Fonts.rounded, 
        color: COLORS.text 
    },
    inputError: {
        borderColor: '#FF3B30', 
        backgroundColor: '#FFF5F5', 
    },
    
    inputButton: { 
        backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: SPACING.m, 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' 
    },
    inputText: { fontSize: 16, fontFamily: Fonts.rounded, color: COLORS.text },
    
    quickDateRow: { flexDirection: 'row', gap: 10, marginBottom: 12, },
    quickChip: { backgroundColor: '#005124', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
    quickChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    row: { flexDirection: 'row' },

    suggestionsContainer: { 
        backgroundColor: '#005124', 
        padding: SPACING.m, 
        borderRadius: 12, 
        marginTop: -8, 
        marginBottom: SPACING.m, 
        borderWidth: 1, 
        borderColor: '#005124' 
    },
    suggestionTitle: { fontSize: 12, color: '#fff', fontWeight: '600', marginBottom: 8 },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    suggestionText: { color: '#fff', fontSize: 14 },

    vehicleSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    vehicleOption: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
    vehicleOptionSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    vehicleText: { fontSize: 13, color: COLORS.textSecondary },
    vehicleTextSelected: { color: COLORS.white, fontWeight: 'bold' },

    textArea: {
        minHeight: 80,
        paddingTop: 12,
    },
    helperText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 4,
        fontStyle: 'italic',
    },

    preferenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.l, backgroundColor: COLORS.white, padding: SPACING.m, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    preferenceLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
    preferenceSubLabel: { fontSize: 12, color: COLORS.textSecondary },

    button: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 16, alignItems: 'center', marginTop: 20, marginBottom: SPACING.m, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', fontFamily: Fonts.rounded },
});