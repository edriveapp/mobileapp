import { useAuthStore } from '@/app/stores/authStore';
import { useDriverStore } from '@/app/stores/driverStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function DriverInfoStep() {
    const user = useAuthStore((s) => s.user);
    const { driverInfo, setDriverInfo } = useDriverStore();

    // Pre-fill name and phone from signup
    React.useEffect(() => {
        if (user?.name && !driverInfo.fullName) {
            setDriverInfo({ fullName: user.name });
        }
        if (user?.phoneNumber && !driverInfo.phoneNumber) {
            setDriverInfo({ phoneNumber: user.phoneNumber });
        }
    }, [user]);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Driver Information</Text>
                <Text style={styles.subtitle}>
                    Please provide your personal details
                </Text>

                <View style={styles.form}>
                    {/* Full Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={driverInfo.fullName}
                            onChangeText={(text) => setDriverInfo({ fullName: text })}
                            placeholder="Enter your full name"
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>

                    {/* Phone Number */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number *</Text>
                        <TextInput
                            style={styles.input}
                            value={driverInfo.phoneNumber}
                            onChangeText={(text) => setDriverInfo({ phoneNumber: text })}
                            placeholder="e.g., 08012345678"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Date of Birth */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date of Birth *</Text>
                        <TextInput
                            style={styles.input}
                            value={driverInfo.dateOfBirth}
                            onChangeText={(text) => setDriverInfo({ dateOfBirth: text })}
                            placeholder="DD/MM/YYYY"
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>

                    {/* Address */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Address *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={driverInfo.address}
                            onChangeText={(text) => setDriverInfo({ address: text })}
                            placeholder="Enter your full address"
                            placeholderTextColor={COLORS.textSecondary}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    {/* Driver's License Number */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Driver's License Number *</Text>
                        <TextInput
                            style={styles.input}
                            value={driverInfo.licenseNumber}
                            onChangeText={(text) => setDriverInfo({ licenseNumber: text })}
                            placeholder="Enter license number"
                            placeholderTextColor={COLORS.textSecondary}
                            autoCapitalize="characters"
                        />
                    </View>

                    {/* License Expiry Date */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>License Expiry Date *</Text>
                        <TextInput
                            style={styles.input}
                            value={driverInfo.licenseExpiry}
                            onChangeText={(text) => setDriverInfo({ licenseExpiry: text })}
                            placeholder="DD/MM/YYYY"
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.l,
    },
    title: {
        fontSize: 28,
        fontFamily: Fonts?.sans || 'System',
        color: COLORS.text,
        marginBottom: SPACING.s,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xl,
    },
    form: {
        gap: SPACING.m,
    },
    inputGroup: {
        marginBottom: SPACING.m,
    },
    label: {
        fontSize: 14,
        fontFamily: Fonts?.sans || 'System',
        color: COLORS.text,
        marginBottom: SPACING.s,
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: SPACING.m,
        fontSize: 16,
        color: COLORS.text,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
});
