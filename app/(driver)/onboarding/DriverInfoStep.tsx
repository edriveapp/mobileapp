import api from '@/app/services/api';
import { useAuthStore } from '@/app/stores/authStore';
import { useDriverStore } from '@/app/stores/driverStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type BankOption = {
    id: string;
    name: string;
    code: string;
};

export default function DriverInfoStep() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const { driverInfo, documents, setDriverInfo, setDocuments } = useDriverStore();
    const [banks, setBanks] = React.useState<BankOption[]>([]);
    const [bankPickerOpen, setBankPickerOpen] = React.useState(false);
    const [bankQuery, setBankQuery] = React.useState('');
    const [loadingBanks, setLoadingBanks] = React.useState(false);
    const [resolvingAccount, setResolvingAccount] = React.useState(false);

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

    React.useEffect(() => {
        if (user?.name && !driverInfo.fullName) {
            setDriverInfo({ fullName: user.name });
        }
        if (user?.phoneNumber && !driverInfo.phoneNumber) {
            setDriverInfo({ phoneNumber: user.phoneNumber });
        }
    }, [user, driverInfo.fullName, driverInfo.phoneNumber, setDriverInfo]);

    React.useEffect(() => {
        const loadBanks = async () => {
            try {
                setLoadingBanks(true);
                const response = await api.get('/payments/banks');
                setBanks(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error('Bank list error:', error);
            } finally {
                setLoadingBanks(false);
            }
        };
        loadBanks();
    }, []);

    const formatDateInput = (input: string) => {
        const digits = input.replace(/\D/g, '').slice(0, 8);
        if (digits.length <= 2) return digits;
        if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    };

    const handleAccountNumberChange = (text: string) => {
        const accountNumber = text.replace(/\D/g, '').slice(0, 10);
        setDriverInfo({
            accountNumber,
            accountName: '',
        });
    };

    const resolveAccountName = async () => {
        if (!driverInfo.bankCode || driverInfo.accountNumber.length !== 10) {
            Alert.alert('Incomplete bank details', 'Select a bank and enter a valid 10-digit account number.');
            return;
        }
        try {
            setResolvingAccount(true);
            const response = await api.post('/payments/resolve-account', {
                bankCode: driverInfo.bankCode,
                accountNumber: driverInfo.accountNumber,
            });
            setDriverInfo({ accountName: response.data.accountName || '' });
        } catch (error: any) {
            Alert.alert('Account lookup failed', error?.response?.data?.message || error?.message || 'Could not resolve account name.');
            setDriverInfo({ accountName: '' });
        } finally {
            setResolvingAccount(false);
        }
    };

    const filteredBanks = banks.filter((bank) => bank.name.toLowerCase().includes(bankQuery.trim().toLowerCase()));

    return (
        <>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>Driver Information</Text>
                <Text style={styles.subtitle}>
                    Please provide your personal and payout details
                </Text>

                <View style={styles.form}>
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

                    {[
                        ['Full Name *', driverInfo.fullName, (text: string) => setDriverInfo({ fullName: text }), 'Enter your full name', 'default'],
                        ['Phone Number *', driverInfo.phoneNumber, (text: string) => setDriverInfo({ phoneNumber: text }), 'e.g., 08012345678', 'phone-pad'],
                    ].map(([label, value, onChange, placeholder, keyboardType], index) => (
                        <View style={styles.inputGroup} key={`${label}-${index}`}>
                            <Text style={styles.label}>{label as string}</Text>
                            <TextInput
                                style={styles.input}
                                value={value as string}
                                onChangeText={onChange as (text: string) => void}
                                placeholder={placeholder as string}
                                placeholderTextColor={COLORS.textSecondary}
                                keyboardType={keyboardType as any}
                            />
                        </View>
                    ))}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date of Birth *</Text>
                        <TextInput
                            style={styles.input}
                            value={driverInfo.dateOfBirth}
                            onChangeText={(text) => setDriverInfo({ dateOfBirth: formatDateInput(text) })}
                            placeholder="DD/MM/YYYY"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="number-pad"
                            maxLength={10}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>NIN (11 digits) *</Text>
                        <TextInput
                            style={styles.input}
                            value={driverInfo.nin}
                            onChangeText={(text) => setDriverInfo({ nin: text.replace(/\D/g, '').slice(0, 11) })}
                            placeholder="Enter your 11-digit NIN"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="number-pad"
                            maxLength={11}
                        />
                    </View>

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

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>License Expiry Date *</Text>
                        <TextInput
                            style={styles.input}
                            value={driverInfo.licenseExpiry}
                            onChangeText={(text) => setDriverInfo({ licenseExpiry: formatDateInput(text) })}
                            placeholder="DD/MM/YYYY"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="number-pad"
                            maxLength={10}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Guarantor Name *</Text>
                        <TextInput style={styles.input} value={driverInfo.guarantorName} onChangeText={(text) => setDriverInfo({ guarantorName: text })} placeholder="Enter guarantor's full name" placeholderTextColor={COLORS.textSecondary} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Guarantor Phone *</Text>
                        <TextInput style={styles.input} value={driverInfo.guarantorPhone} onChangeText={(text) => setDriverInfo({ guarantorPhone: text })} placeholder="e.g., 08012345678" placeholderTextColor={COLORS.textSecondary} keyboardType="phone-pad" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Next of Kin Name *</Text>
                        <TextInput style={styles.input} value={driverInfo.nextOfKinName} onChangeText={(text) => setDriverInfo({ nextOfKinName: text })} placeholder="Enter next-of-kin full name" placeholderTextColor={COLORS.textSecondary} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Next of Kin Phone *</Text>
                        <TextInput style={styles.input} value={driverInfo.nextOfKinPhone} onChangeText={(text) => setDriverInfo({ nextOfKinPhone: text })} placeholder="e.g., 08012345678" placeholderTextColor={COLORS.textSecondary} keyboardType="phone-pad" />
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Payout Bank Details</Text>
                        <Text style={styles.sectionHint}>Choose your bank and confirm the account name before submitting.</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bank Name *</Text>
                            <TouchableOpacity style={styles.selector} onPress={() => setBankPickerOpen(true)} activeOpacity={0.8}>
                                <Text style={driverInfo.bankName ? styles.selectorValue : styles.selectorPlaceholder}>
                                    {driverInfo.bankName || (loadingBanks ? 'Loading banks...' : 'Select your bank')}
                                </Text>
                                <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Account Number *</Text>
                            <TextInput
                                style={styles.input}
                                value={driverInfo.accountNumber}
                                onChangeText={handleAccountNumberChange}
                                placeholder="Enter 10-digit account number"
                                placeholderTextColor={COLORS.textSecondary}
                                keyboardType="number-pad"
                                maxLength={10}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.resolveButton, (!driverInfo.bankCode || driverInfo.accountNumber.length !== 10 || resolvingAccount) && styles.resolveButtonDisabled]}
                            onPress={resolveAccountName}
                            disabled={!driverInfo.bankCode || driverInfo.accountNumber.length !== 10 || resolvingAccount}
                        >
                            {resolvingAccount ? <ActivityIndicator color="#fff" /> : <Text style={styles.resolveButtonText}>Verify Account Name</Text>}
                        </TouchableOpacity>

                        {driverInfo.accountName ? (
                            <View style={styles.accountPreviewCard}>
                                <Text style={styles.accountPreviewLabel}>Account name found</Text>
                                <Text style={styles.accountPreviewValue}>{driverInfo.accountName}</Text>
                            </View>
                        ) : (
                            <View style={styles.accountPreviewMuted}>
                                <Text style={styles.accountPreviewMutedText}>Verify the bank account to continue.</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            <Modal visible={bankPickerOpen} animationType="slide" onRequestClose={() => setBankPickerOpen(false)}>
                <View style={[styles.modalContainer, { paddingTop: insets.top + 10 }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Bank</Text>
                        <TouchableOpacity onPress={() => setBankPickerOpen(false)}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.modalSearch}
                        value={bankQuery}
                        onChangeText={setBankQuery}
                        placeholder="Search bank"
                        placeholderTextColor={COLORS.textSecondary}
                    />
                    <FlatList
                        data={filteredBanks}
                        keyExtractor={(item) => item.code}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.bankItem}
                                onPress={() => {
                                    setDriverInfo({ bankName: item.name, bankCode: item.code, accountName: '' });
                                    setBankPickerOpen(false);
                                    setBankQuery('');
                                }}
                            >
                                <Text style={styles.bankItemText}>{item.name}</Text>
                                {driverInfo.bankCode === item.code ? <Ionicons name="checkmark" size={18} color={COLORS.primary} /> : null}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={styles.emptyBanks}>No banks found.</Text>}
                    />
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    scrollContent: { paddingHorizontal: SPACING.l, paddingBottom: 120, paddingTop: SPACING.m },
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
    textArea: { minHeight: 90, textAlignVertical: 'top' },
    selfieSection: { marginBottom: 4 },
    kycNote: { color: COLORS.textSecondary, fontFamily: Fonts.rounded, fontSize: 12 },
    selfieContainer: {
        marginTop: 10,
        width: 130,
        height: 130,
        borderRadius: 65,
        overflow: 'hidden',
        backgroundColor: '#F4F7F6',
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selfieImage: { width: '100%', height: '100%' },
    selfiePlaceholder: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
    selfiePlaceholderText: { marginTop: 10, fontFamily: Fonts.semibold, color: COLORS.text },
    selfieSubText: { marginTop: 4, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
    selfieEditBadge: {
        position: 'absolute',
        right: 6,
        bottom: 6,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionCard: {
        backgroundColor: '#F8FBF9',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#D9EADF',
        padding: 16,
        gap: 12,
    },
    sectionTitle: { fontSize: 16, fontFamily: Fonts.bold, color: COLORS.text },
    sectionHint: { fontSize: 12, color: COLORS.textSecondary, fontFamily: Fonts.rounded },
    selector: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectorValue: { color: COLORS.text, fontFamily: Fonts.rounded },
    selectorPlaceholder: { color: COLORS.textSecondary, fontFamily: Fonts.rounded },
    resolveButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resolveButtonDisabled: { opacity: 0.55 },
    resolveButtonText: { color: '#fff', fontFamily: Fonts.semibold, fontSize: 14 },
    accountPreviewCard: {
        backgroundColor: '#E8F6EE',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#B7DFC6',
        padding: 14,
    },
    accountPreviewLabel: { fontSize: 12, color: '#2E6A46', fontFamily: Fonts.rounded, marginBottom: 4 },
    accountPreviewValue: { fontSize: 15, color: '#174D30', fontFamily: Fonts.bold },
    accountPreviewMuted: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E3E8E6',
        backgroundColor: '#fff',
        padding: 14,
    },
    accountPreviewMutedText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: Fonts.rounded },
    modalContainer: { flex: 1, backgroundColor: '#fff', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontFamily: Fonts.bold, color: COLORS.text },
    modalSearch: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
        color: COLORS.text,
    },
    bankItem: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F1F2',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bankItemText: { color: COLORS.text, fontFamily: Fonts.rounded, fontSize: 14 },
    emptyBanks: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 30, fontFamily: Fonts.rounded },
});
