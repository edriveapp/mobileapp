import { useDriverStore } from '@/app/stores/driverStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Van', 'Minibus', 'Coaster Bus'];
const MIN_VEHICLE_PHOTOS = 4;

export default function VehicleDocumentsStep() {
    const { vehicleInfo, documents, setVehicleInfo, setDocuments } = useDriverStore();
    const isBusType = ['Van', 'Minibus', 'Coaster Bus'].includes(vehicleInfo.type);

    const formatPlateNumber = (value: string) => {
        const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        if (cleaned.length <= 3) return cleaned;
        if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    };

    const pickSingleDocument = async (targetField: 'licenseImageUri' | 'insuranceImageUri') => {
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
            setDocuments({ [targetField]: uri } as any);
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
            selectionLimit: 10,
        });

        if (!result.canceled) {
            const uris = result.assets.map((asset: { uri: string }) => asset.uri);
            const deduped = Array.from(new Set([...documents.vehiclePhotos, ...uris]));
            setDocuments({ vehiclePhotos: deduped });
        }
    };

    const removeVehiclePhoto = (uri: string) => {
        setDocuments({ vehiclePhotos: documents.vehiclePhotos.filter((photo) => photo !== uri) });
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Vehicle & Documents</Text>
            <Text style={styles.subtitle}>Provide your vehicle details and upload required documents</Text>

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Vehicle Type *</Text>
                    <View style={styles.chipContainer}>
                        {VEHICLE_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[styles.chip, vehicleInfo.type === type && styles.chipSelected]}
                                onPress={() => setVehicleInfo({ type })}
                            >
                                <Text style={[styles.chipText, vehicleInfo.type === type && styles.chipTextSelected]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Vehicle Make *</Text>
                    <TextInput style={styles.input} value={vehicleInfo.make} onChangeText={(text) => setVehicleInfo({ make: text })} placeholder="e.g., Toyota" placeholderTextColor={COLORS.textSecondary} />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Vehicle Model *</Text>
                    <TextInput style={styles.input} value={vehicleInfo.model} onChangeText={(text) => setVehicleInfo({ model: text })} placeholder="e.g., Camry" placeholderTextColor={COLORS.textSecondary} />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Vehicle Year *</Text>
                    <TextInput style={styles.input} value={vehicleInfo.year} onChangeText={(text) => setVehicleInfo({ year: text })} placeholder="e.g., 2020" placeholderTextColor={COLORS.textSecondary} keyboardType="number-pad" maxLength={4} />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Plate Number *</Text>
                    <TextInput style={styles.input} value={vehicleInfo.plateNumber} onChangeText={(text) => setVehicleInfo({ plateNumber: formatPlateNumber(text) })} placeholder="e.g., ABC-123-XY" placeholderTextColor={COLORS.textSecondary} autoCapitalize="characters" maxLength={10} />
                </View>

                {isBusType && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Passenger Capacity *</Text>
                        <TextInput style={styles.input} value={vehicleInfo.capacity || ''} onChangeText={(text) => setVehicleInfo({ capacity: text.replace(/\D/g, '') })} placeholder="e.g., 14" placeholderTextColor={COLORS.textSecondary} keyboardType="number-pad" maxLength={2} />
                    </View>
                )}

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Driver License Photo *</Text>
                    <TouchableOpacity style={styles.uploadButton} onPress={() => pickSingleDocument('licenseImageUri')}>
                        <Text style={styles.uploadButtonText}>{documents.licenseImageUri ? '✓ License Uploaded' : '+ Upload License'}</Text>
                    </TouchableOpacity>
                    {documents.licenseImageUri ? <Image source={{ uri: documents.licenseImageUri }} style={styles.previewImage} resizeMode="cover" /> : null}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Vehicle Insurance Document *</Text>
                    <TouchableOpacity style={styles.uploadButton} onPress={() => pickSingleDocument('insuranceImageUri')}>
                        <Text style={styles.uploadButtonText}>{documents.insuranceImageUri ? '✓ Insurance Uploaded' : '+ Upload Insurance Document'}</Text>
                    </TouchableOpacity>
                    {documents.insuranceImageUri ? <Image source={{ uri: documents.insuranceImageUri }} style={styles.previewImage} resizeMode="cover" /> : null}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Vehicle Photos * (minimum {MIN_VEHICLE_PHOTOS})</Text>
                    <TouchableOpacity style={styles.uploadButton} onPress={pickVehiclePhotos}>
                        <Text style={styles.uploadButtonText}>+ Add Vehicle Photos ({documents.vehiclePhotos.length})</Text>
                    </TouchableOpacity>
                    <Text style={styles.helperText}>
                        Upload at least {MIN_VEHICLE_PHOTOS} clear photos of the vehicle exterior and interior.
                    </Text>
                    {documents.vehiclePhotos.length > 0 && (
                        <View style={styles.photoGrid}>
                            {documents.vehiclePhotos.map((uri, index) => (
                                <View key={`${uri}-${index}`} style={styles.photoContainer}>
                                    <Image source={{ uri }} style={styles.photoThumbnail} resizeMode="cover" />
                                    <TouchableOpacity style={styles.removePhotoButton} onPress={() => removeVehiclePhoto(uri)}>
                                        <Text style={styles.removePhotoButtonText}>×</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                    {documents.vehiclePhotos.length < MIN_VEHICLE_PHOTOS ? (
                        <Text style={styles.warningText}>{MIN_VEHICLE_PHOTOS - documents.vehiclePhotos.length} more photo(s) required.</Text>
                    ) : (
                        <Text style={styles.successText}>Vehicle photo requirement met.</Text>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContent: { paddingBottom: 120 },
    title: { fontSize: 24, fontFamily: Fonts.bold, color: COLORS.text, marginBottom: 6 },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, fontFamily: Fonts.rounded, marginBottom: SPACING.l },
    form: { gap: SPACING.m },
    inputGroup: { gap: 8 },
    label: { fontSize: 14, fontFamily: Fonts.semibold, color: COLORS.text },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        backgroundColor: '#fff',
        color: COLORS.text,
        fontFamily: Fonts.rounded,
    },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { color: COLORS.text, fontFamily: Fonts.rounded, fontSize: 13 },
    chipTextSelected: { color: '#fff', fontFamily: Fonts.semibold },
    uploadButton: {
        backgroundColor: '#F4F7F6',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    uploadButtonText: { color: COLORS.primary, fontFamily: Fonts.semibold, fontSize: 14 },
    previewImage: { width: '100%', height: 180, borderRadius: 14, marginTop: 8 },
    helperText: { color: COLORS.textSecondary, fontSize: 12, fontFamily: Fonts.rounded },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
    photoContainer: { position: 'relative' },
    photoThumbnail: { width: 96, height: 96, borderRadius: 12, backgroundColor: '#EDEDED' },
    removePhotoButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#D92D20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removePhotoButtonText: { color: '#fff', fontSize: 16, lineHeight: 18, fontFamily: Fonts.bold },
    warningText: { color: '#B54708', fontSize: 12, fontFamily: Fonts.rounded },
    successText: { color: '#027A48', fontSize: 12, fontFamily: Fonts.rounded },
});
