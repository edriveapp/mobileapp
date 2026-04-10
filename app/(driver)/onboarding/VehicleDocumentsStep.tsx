import { useDriverStore } from '@/app/stores/driverStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
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

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Van', 'Minibus', 'Coaster Bus'];

export default function VehicleDocumentsStep() {
    const { vehicleInfo, documents, setVehicleInfo, setDocuments } = useDriverStore();
    const isBusType = ['Van', 'Minibus', 'Coaster Bus'].includes(vehicleInfo.type);

    const formatPlateNumber = (value: string) => {
        const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        if (cleaned.length <= 3) return cleaned;
        if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    };

    const pickSingleDocument = async (targetField: 'licenseImageUri' | 'insuranceImageUri' | 'worthinessImageUri') => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera roll permissions to upload documents.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const uri = result.assets[0].uri;
            if (targetField === 'licenseImageUri') {
                setDocuments({ licenseImageUri: uri });
            } else if (targetField === 'insuranceImageUri') {
                setDocuments({ insuranceImageUri: uri });
            } else {
                setDocuments({ worthinessImageUri: uri });
            }
        }
    };

    const pickVehiclePhotos = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera roll permissions to upload vehicle photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            const uris = result.assets.map((asset: { uri: string }) => asset.uri);
            setDocuments({ vehiclePhotos: [...documents.vehiclePhotos, ...uris] });
        }
    };

    const removeVehiclePhoto = (uri: string) => {
        setDocuments({
            vehiclePhotos: documents.vehiclePhotos.filter((photo) => photo !== uri),
        });
    };

    return (
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>Vehicle & Documents</Text>
                <Text style={styles.subtitle}>
                    Provide your vehicle details and upload required documents
                </Text>

                <View style={styles.form}>
                    {/* Vehicle Type */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Vehicle Type *</Text>
                        <View style={styles.chipContainer}>
                            {VEHICLE_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.chip,
                                        vehicleInfo.type === type && styles.chipSelected,
                                    ]}
                                    onPress={() => setVehicleInfo({ type })}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            vehicleInfo.type === type && styles.chipTextSelected,
                                        ]}
                                    >
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Vehicle Make */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Vehicle Make *</Text>
                        <TextInput
                            style={styles.input}
                            value={vehicleInfo.make}
                            onChangeText={(text) => setVehicleInfo({ make: text })}
                            placeholder="e.g., Toyota"
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>

                    {/* Vehicle Model */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Vehicle Model *</Text>
                        <TextInput
                            style={styles.input}
                            value={vehicleInfo.model}
                            onChangeText={(text) => setVehicleInfo({ model: text })}
                            placeholder="e.g., Camry"
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>

                    {/* Vehicle Year */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Vehicle Year *</Text>
                        <TextInput
                            style={styles.input}
                            value={vehicleInfo.year}
                            onChangeText={(text) => setVehicleInfo({ year: text })}
                            placeholder="e.g., 2020"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="number-pad"
                            maxLength={4}
                        />
                    </View>

                    {/* Plate Number */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Plate Number *</Text>
                        <TextInput
                            style={styles.input}
                            value={vehicleInfo.plateNumber}
                            onChangeText={(text) =>
                                setVehicleInfo({ plateNumber: formatPlateNumber(text) })
                            }
                            placeholder="e.g., ABC-123-XY"
                            placeholderTextColor={COLORS.textSecondary}
                            autoCapitalize="characters"
                            maxLength={10}
                        />
                    </View>

                    {/* Bus Capacity */}
                    {isBusType && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Passenger Capacity *</Text>
                            <TextInput
                                style={styles.input}
                                value={vehicleInfo.capacity || ''}
                                onChangeText={(text) => setVehicleInfo({ capacity: text.replace(/\D/g, '') })}
                                placeholder="e.g., 14"
                                placeholderTextColor={COLORS.textSecondary}
                                keyboardType="number-pad"
                                maxLength={2}
                            />
                        </View>
                    )}

                    {/* Driver's License Upload */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Driver License Photo *</Text>
                        <TouchableOpacity style={styles.uploadButton} onPress={() => pickSingleDocument('licenseImageUri')}>
                            <Text style={styles.uploadButtonText}>
                                {documents.licenseImageUri ? '✓ License Uploaded' : '+ Upload License'}
                            </Text>
                        </TouchableOpacity>
                        {documents.licenseImageUri && (
                            <Image
                                source={{ uri: documents.licenseImageUri }}
                                style={styles.previewImage}
                                resizeMode="cover"
                            />
                        )}
                    </View>

                    {/* Vehicle Insurance Upload */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Vehicle Insurance Document *</Text>
                        <TouchableOpacity style={styles.uploadButton} onPress={() => pickSingleDocument('insuranceImageUri')}>
                            <Text style={styles.uploadButtonText}>
                                {documents.insuranceImageUri ? '✓ Insurance Uploaded' : '+ Upload Insurance Document'}
                            </Text>
                        </TouchableOpacity>
                        {documents.insuranceImageUri && (
                            <Image
                                source={{ uri: documents.insuranceImageUri }}
                                style={styles.previewImage}
                                resizeMode="cover"
                            />
                        )}
                    </View>

                    {/* Worthiness Certificate Upload */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Vehicle Inspection/Worthiness Certificate *</Text>
                        <TouchableOpacity style={styles.uploadButton} onPress={() => pickSingleDocument('worthinessImageUri')}>
                            <Text style={styles.uploadButtonText}>
                                {documents.worthinessImageUri ? '✓ Certificate Uploaded' : '+ Upload Worthiness Certificate'}
                            </Text>
                        </TouchableOpacity>
                        {documents.worthinessImageUri && (
                            <Image
                                source={{ uri: documents.worthinessImageUri }}
                                style={styles.previewImage}
                                resizeMode="cover"
                            />
                        )}
                    </View>

                    {/* Vehicle Photos Upload */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Vehicle Photos * (at least 1)</Text>
                        <TouchableOpacity style={styles.uploadButton} onPress={pickVehiclePhotos}>
                            <Text style={styles.uploadButtonText}>
                                + Add Vehicle Photos ({documents.vehiclePhotos.length})
                            </Text>
                        </TouchableOpacity>
                        {documents.vehiclePhotos.length > 0 && (
                            <View style={styles.photoGrid}>
                                {documents.vehiclePhotos.map((uri, index) => (
                                    <View key={index} style={styles.photoContainer}>
                                        <Image
                                            source={{ uri }}
                                            style={styles.photoThumbnail}
                                            resizeMode="cover"
                                        />
                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            onPress={() => removeVehiclePhoto(uri)}
                                        >
                                            <Text style={styles.removeButtonText}>×</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
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
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.s,
    },
    chip: {
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    chipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 14,
        color: COLORS.text,
    },
    chipTextSelected: {
        color: COLORS.white,
    },
    uploadButton: {
        backgroundColor: COLORS.primaryLight,
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 12,
        padding: SPACING.m,
        alignItems: 'center',
        borderStyle: 'dashed',
    },
    uploadButtonText: {
        fontSize: 16,
        color: COLORS.primary,
        fontFamily: Fonts?.sans || 'System',
    },
    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginTop: SPACING.m,
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.s,
        marginTop: SPACING.m,
    },
    photoContainer: {
        position: 'relative',
        width: 100,
        height: 100,
    },
    photoThumbnail: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    removeButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: COLORS.error,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
});
