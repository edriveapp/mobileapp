import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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

const DocRow = ({ label, url }: { label: string; url?: string }) => (
    <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        {url ? (
            <TouchableOpacity
                style={styles.viewDocInline}
                onPress={() => Linking.openURL(url)}
            >
                <Ionicons name="open-outline" size={14} color={COLORS.primary} />
                <Text style={styles.viewDocInlineText}>View</Text>
            </TouchableOpacity>
        ) : (
            <Text style={styles.rowValue}>—</Text>
        )}
    </View>
);

export default function VehicleDocsScreen() {
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
            'Changing verified vehicle or document information requires admin approval. Open a support request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Open Support',
                    onPress: () => router.push('/support'),
                },
            ],
        );
    };

    const vehicle = profile?.vehicleDetails ?? {};
    const photos: string[] = Array.isArray(vehicle.vehiclePhotoUrls) ? vehicle.vehiclePhotoUrls : [];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Vehicle & Documents</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={COLORS.primary} />
                </View>
            ) : fetchError ? (
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={40} color={COLORS.textSecondary} />
                    <Text style={styles.emptyText}>Could not load vehicle data.</Text>
                    <Text style={styles.emptySubText}>Please check your connection or contact support.</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.verifiedBanner}>
                        <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} />
                        <Text style={styles.verifiedText}>
                            Vehicle verified — contact support to update any information
                        </Text>
                    </View>

                    <Section title="Vehicle Details">
                        <Row label="Type" value={vehicle.type} />
                        <Row label="Make" value={vehicle.make} />
                        <Row label="Model" value={vehicle.model} />
                        <Row label="Year" value={vehicle.year} />
                        <Row label="Colour" value={vehicle.color} />
                        <Row label="Plate Number" value={vehicle.plateNumber} />
                        {vehicle.capacity ? <Row label="Capacity" value={`${vehicle.capacity} seats`} /> : null}
                    </Section>

                    <Section title="Documents">
                        <DocRow label="Insurance" url={vehicle.insuranceDocumentUrl} />
                        <DocRow label="Worthiness Certificate" url={vehicle.worthinessCertificateUrl} />
                    </Section>

                    {photos.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Vehicle Photos</Text>
                            <View style={styles.photoGrid}>
                                {photos.map((uri, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        onPress={() => Linking.openURL(uri)}
                                        activeOpacity={0.85}
                                    >
                                        <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

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

    viewDocInline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    viewDocInlineText: {
        fontSize: 13,
        color: COLORS.primary,
        fontFamily: Fonts.semibold,
    },

    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    photo: {
        width: 100,
        height: 100,
        borderRadius: 10,
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
