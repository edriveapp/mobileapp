import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import api from '@/app/services/api';
import { COLORS, Fonts, SPACING } from '@/constants/theme';

const Row = ({ label, value }: { label: string; value?: string }) => (
    <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionBody}>{children}</View>
    </View>
);

export default function PersonalInfoScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);

    useEffect(() => {
        api.get('/users/driver-profile')
            .then((res) => {
                setProfile(res.data);
                if (!res.data) setFetchError(true);
            })
            .catch(() => setFetchError(true))
            .finally(() => setLoading(false));
    }, []);

    const handleRequestEdit = () => {
        Alert.alert(
            'Request an Edit',
            'Changing verified information requires admin approval. Do you want to open a support request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Open Support',
                    onPress: () => router.push('/support'),
                },
            ],
        );
    };

    // Fall back to joined user entity when onboardingMeta fields are absent
    const profileUser = profile?.user ?? {};
    const rawMeta = profile?.onboardingMeta ?? {};
    const meta = {
        fullName: rawMeta.fullName || [profileUser.firstName, profileUser.lastName].filter(Boolean).join(' ') || undefined,
        phoneNumber: rawMeta.phoneNumber || profileUser.phone || profileUser.phoneNumber || undefined,
        dateOfBirth: rawMeta.dateOfBirth,
        nin: rawMeta.nin,
        address: rawMeta.address,
        guarantorName: rawMeta.guarantorName,
        guarantorPhone: rawMeta.guarantorPhone,
        nextOfKinName: rawMeta.nextOfKinName,
        nextOfKinPhone: rawMeta.nextOfKinPhone,
        bankName: rawMeta.bankName,
        accountNumber: rawMeta.accountNumber,
        accountName: rawMeta.accountName,
    };
    const license = profile?.licenseDetails ?? {};

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Personal Information</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={COLORS.primary} />
                </View>
            ) : fetchError ? (
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={40} color={COLORS.textSecondary} />
                    <Text style={styles.emptyText}>Could not load profile data.</Text>
                    <Text style={styles.emptySubText}>Please check your connection or contact support.</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Verified badge */}
                    <View style={styles.verifiedBanner}>
                        <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} />
                        <Text style={styles.verifiedText}>
                            Identity verified — contact support to change any details
                        </Text>
                    </View>

                    <Section title="Personal Details">
                        <Row label="Full Name" value={meta.fullName} />
                        <Row label="Phone Number" value={meta.phoneNumber} />
                        <Row label="Date of Birth" value={meta.dateOfBirth} />
                        <Row label="NIN" value={meta.nin ? `•••• •••• ${meta.nin.slice(-3)}` : undefined} />
                        <Row label="Address" value={meta.address} />
                    </Section>

                    <Section title="Driver's License">
                        <Row label="License Number" value={license.number} />
                        <Row label="Expiry Date" value={license.expiryDate} />
                        {license.documentUrl ? (
                            <TouchableOpacity
                                style={styles.viewDocBtn}
                                onPress={() => Linking.openURL(license.documentUrl)}
                            >
                                <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
                                <Text style={styles.viewDocText}>View License Document</Text>
                            </TouchableOpacity>
                        ) : null}
                    </Section>

                    <Section title="Emergency Contacts">
                        <Row label="Guarantor" value={meta.guarantorName} />
                        <Row label="Guarantor Phone" value={meta.guarantorPhone} />
                        <Row label="Next of Kin" value={meta.nextOfKinName} />
                        <Row label="Next of Kin Phone" value={meta.nextOfKinPhone} />
                    </Section>

                    <Section title="Payout Details">
                        <Row label="Bank Name" value={meta.bankName} />
                        <Row label="Account Number" value={meta.accountNumber} />
                        <Row label="Account Name" value={meta.accountName} />
                    </Section>

                    <TouchableOpacity style={styles.editRequestBtn} onPress={handleRequestEdit}>
                        <Ionicons name="create-outline" size={18} color={COLORS.white} />
                        <Text style={styles.editRequestText}>Request to Edit</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F8FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    emptyText: { fontSize: 16, color: COLORS.text, fontFamily: Fonts.semibold, marginTop: 12, textAlign: 'center' },
    emptySubText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: Fonts.rounded, marginTop: 6, textAlign: 'center' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, fontFamily: Fonts.bold },

    content: { padding: SPACING.l, paddingBottom: 40 },

    verifiedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#EAF7F0',
        borderRadius: 12,
        padding: SPACING.m,
        marginBottom: SPACING.l,
        borderWidth: 1,
        borderColor: '#B2DFCC',
    },
    verifiedText: {
        flex: 1,
        fontSize: 13,
        color: '#1B5E3B',
        fontFamily: Fonts.rounded,
        lineHeight: 18,
    },

    section: { marginBottom: SPACING.l },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textSecondary,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
    },
    sectionBody: {
        backgroundColor: COLORS.white,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },

    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    rowLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
        flex: 1,
    },
    rowValue: {
        fontSize: 14,
        color: COLORS.text,
        fontFamily: Fonts.semibold,
        flex: 1,
        textAlign: 'right',
    },

    viewDocBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: SPACING.m,
        paddingVertical: 14,
    },
    viewDocText: {
        fontSize: 14,
        color: COLORS.primary,
        fontFamily: Fonts.semibold,
    },

    editRequestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 16,
        marginTop: SPACING.s,
    },
    editRequestText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Fonts.bold,
    },
});
