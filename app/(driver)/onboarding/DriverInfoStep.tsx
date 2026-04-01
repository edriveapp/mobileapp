import { useAuthStore } from '@/app/stores/authStore';
import { useDriverStore } from '@/app/stores/driverStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function DriverInfoStep() {
    const user = useAuthStore((s) => s.user);
    const { driverInfo, documents, setDriverInfo, setDocuments } = useDriverStore();

    const takeSelfie = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera access is needed for identity verification.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
            cameraType: ImagePicker.CameraType.front,
        });
        if (!result.canceled && result.assets[0]) {
            setDocuments({ selfieUri: result.assets[0].uri });
        }
    };

    const pickSelfieFromGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Photo library access is needed.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });
        if (!result.canceled && result.assets[0]) {
            setDocuments({ selfieUri: result.assets[0].uri });
        }
    };

    const handleSelfie = () => {
        Alert.alert('Profile Photo', 'This photo will be used for identity verification and shown to passengers.', [
            { text: 'Take Selfie', onPress: takeSelfie },
            { text: 'Choose from Library', onPress: pickSelfieFromGallery },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    // Pre-fill name and phone from signup
    React.useEffect(() => {
        if (user?.name && !driverInfo.fullName) {
            setDriverInfo({ fullName: user.name });
        }
        if (user?.phoneNumber && !driverInfo.phoneNumber) {
            setDriverInfo({ phoneNumber: user.phoneNumber });
        }
    }, [user, driverInfo.fullName, driverInfo.phoneNumber, setDriverInfo]);

    const formatDateInput = (input: string) => {
        const digits = input.replace(/\D/g, '').slice(0, 8);
        if (digits.length <= 2) return digits;
        if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    };

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
                    {/* Selfie / Profile Photo */}
                    <View style={styles.selfieSection}>
                        <Text style={styles.label}>Profile Photo * <Text style={styles.kycNote}>(Required for KYC)</Text></Text>
                        <TouchableOpacity style={styles.selfieContainer} onPress={handleSelfie} activeOpacity={0.8}>
                            {documents.selfieUri ? (
                                <Image source={{ uri: documents.selfieUri }} style={styles.selfieImage} />
                            ) : (
                                <View style={styles.selfiePlaceholder}>
                                    <Ionicons name="camera" size={32} color={COLORS.primary} />
                                    <Text style={styles.selfiePlaceholderText}>Take Selfie</Text>
                                    <Text style={styles.selfieSubText}>Clear face photo, good lighting</Text>
                                </View>
                            )}
                            {documents.selfieUri && (
                                <View style={styles.selfieEditBadge}>
                                    <Ionicons name="camera" size={14} color="#fff" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

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
                            onChangeText={(text) =>
                                setDriverInfo({ dateOfBirth: formatDateInput(text) })
                            }
                            placeholder="DD/MM/YYYY"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="number-pad"
                            maxLength={10}
                        />
                    </View>

                    {/* NIN */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>NIN (11 digits) *</Text>
                        <TextInput
                            style={styles.input}
                            value={driverInfo.nin}
                            onChangeText={(text) =>
                                setDriverInfo({ nin: text.replace(/\D/g, '').slice(0, 11) })
                            }
                            placeholder="Enter your 11-digit NIN"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="number-pad"
                            maxLength={11}
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
                        <Text style={styles.label}>Driver License Number *</Text>
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
                            onChangeText={(text) =>
                                setDriverInfo({ licenseExpiry: formatDateInput(text) })
                            }
                            placeholder="DD/MM/YYYY"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="number-pad"
                            maxLength={10}
                        />
                    </View>

                    {/* Guarantor */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Guarantor Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={driverInfo.guarantorName}
                            onChangeText={(text) => setDriverInfo({ guarantorName: text })}
                            placeholder="Enter guarantor's full name"
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Guarantor Phone *</Text>
                        <TextInput
                            style={styles.input}
                            value={driverInfo.guarantorPhone}
                            onChangeText={(text) => setDriverInfo({ guarantorPhone: text })}
                            placeholder="e.g., 08012345678"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Next of Kin */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Next of Kin Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={driverInfo.nextOfKinName}
                            onChangeText={(text) => setDriverInfo({ nextOfKinName: text })}
                            placeholder="Enter next-of-kin full name"
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Next of Kin Phone *</Text>
                        <TextInput
                            style={styles.input}
                            value={driverInfo.nextOfKinPhone}
                            onChangeText={(text) => setDriverInfo({ nextOfKinPhone: text })}
                            placeholder="e.g., 08012345678"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="phone-pad"
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
    selfieSection: {
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    selfieContainer: {
        marginTop: SPACING.s,
        position: 'relative',
    },
    selfieImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: COLORS.primary,
    },
    selfiePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    selfiePlaceholderText: {
        fontSize: 13,
        color: COLORS.primary,
        fontFamily: Fonts?.sans || 'System',
        fontWeight: '600',
    },
    selfieSubText: {
        fontSize: 10,
        color: COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    selfieEditBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    kycNote: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '400',
    },
});
