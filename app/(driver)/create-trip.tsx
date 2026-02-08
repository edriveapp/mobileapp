import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';
import { useTripStore } from '../stores/tripStore';

export default function CreateTripScreen() {
    const router = useRouter();
    const createTrip = useTripStore((state) => state.createTrip);
    const { user } = useAuthStore();

    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [price, setPrice] = useState('');
    const [seats, setSeats] = useState('');

    const handleCreateTrip = () => {
        if (!origin || !destination || !date || !time || !price || !seats) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'You must be logged in');
            return;
        }

        createTrip({
            driverId: user.id,
            origin,
            destination,
            date,
            time,
            price: parseInt(price),
            seats: parseInt(seats),
        });

        Alert.alert('Success', 'Trip created successfully!', [
            { text: 'OK', onPress: () => router.back() }
        ]);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Post a Trip</Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>From (State/City)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Lagos"
                    value={origin}
                    onChangeText={setOrigin}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>To (State/City)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Abuja"
                    value={destination}
                    onChangeText={setDestination}
                />
            </View>

            <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: SPACING.s }]}>
                    <Text style={styles.label}>Date</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="YYYY-MM-DD"
                        value={date}
                        onChangeText={setDate}
                    />
                </View>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                    <Text style={styles.label}>Time</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="HH:MM"
                        value={time}
                        onChangeText={setTime}
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: SPACING.s }]}>
                    <Text style={styles.label}>Price (₦)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 15000"
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="numeric"
                    />
                </View>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                    <Text style={styles.label}>Seats</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 3"
                        value={seats}
                        onChangeText={setSeats}
                        keyboardType="numeric"
                    />
                </View>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleCreateTrip}>
                <Text style={styles.buttonText}>Publish Trip</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: SPACING.l,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: SPACING.xl,
    },
    inputContainer: {
        marginBottom: SPACING.m,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: SPACING.m,
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
    },
    button: {
        backgroundColor: COLORS.primary,
        padding: SPACING.m,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: SPACING.l,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
