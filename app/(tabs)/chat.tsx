import { useTripStore } from '@/app/stores/tripStore';
import EmptyState from '../components/common/Emptystate';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InboxScreen() {
    const router = useRouter();
    const { activeTrips, fetchMyTrips, isLoading } = useTripStore();

    useEffect(() => {
        fetchMyTrips();
    }, []);

    // For now, we assume every active trip has a valid chat channel
    const renderChatItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => router.push({
                pathname: "/chat/[id]",
                params: {
                    id: item.id,
                    recipientName: item.driver?.name || "Driver",
                    // recipientImage: item.driver?.photo 
                }
            })}
        >
            <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                    {(item.driver?.name || "D").charAt(0)}
                </Text>
            </View>

            <View style={styles.content}>
                <View style={styles.topRow}>
                    <Text style={styles.name}>{item.driver?.name || "Driver"}</Text>
                    <Text style={styles.time}>{new Date(item.updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <Text style={styles.messagePreview} numberOfLines={1}>
                    Tap to chat about your trip to {item.destination}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Inbox</Text>
            </View>

            <FlatList
                data={activeTrips}
                renderItem={renderChatItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshing={isLoading}
                onRefresh={fetchMyTrips}
                ListEmptyComponent={
                    <EmptyState
                        title="No Messages"
                        message="You have no active chats."
                        icon="chatbubbles-outline"
                    />
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    header: {
        padding: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: {
        fontSize: 24,
        fontFamily: Fonts.bold,
        color: COLORS.text,
    },
    list: {
        padding: SPACING.m,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    content: {
        flex: 1,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontFamily: Fonts.semibold,
        color: COLORS.text,
    },
    time: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    messagePreview: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
    },
});