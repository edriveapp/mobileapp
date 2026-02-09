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

    const pickLicenseImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera roll permissions to upload your license.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setDocuments({ licenseImageUri: result.assets[0].uri });
        }
    };

    const pickVehiclePhotos = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera roll permissions to upload vehicle photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
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
                            onChangeText={(text) => setVehicleInfo({ plateNumber: text })}
                            placeholder="e.g., ABC-123-XY"
                            placeholderTextColor={COLORS.textSecondary}
                            autoCapitalize="characters"
                        />
                    </View>

                    {/* Driver's License Upload */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Driver's License Photo *</Text>
                        <TouchableOpacity style={styles.uploadButton} onPress={pickLicenseImage}>
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
