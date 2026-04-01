import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/app/stores/authStore';
import { useChatStore } from '@/app/stores/chatStore';
import { useTripStore } from '@/app/stores/tripStore';
import EmptyState from '../components/common/Emptystate';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const getPassengerName = (ride: any) => {
  const firstName = String(ride?.passenger?.firstName || '').trim();
  return firstName || ride?.passenger?.name || ride?.passenger?.email || 'Passenger';
};

const isPlaceholderName = (value?: string) => {
  if (!value) return true;
  return ['passenger', 'driver', 'user', 'rider'].includes(value.trim().toLowerCase());
};

const getAddressText = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.address || '';
};

const getPreviewText = (ride: any, lastMessageText?: string) => {
  if (lastMessageText) return lastMessageText;
  if (!ride) return 'Open conversation';
  return `Chat about ${getAddressText(ride.origin)} to ${getAddressText(ride.destination)}`;
};

const getChatStorageKey = (rideId: string) => `chat_messages_${rideId}`;

export default function DriverInboxScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { activeTrips, history, fetchMyTrips, isLoading } = useTripStore();
  const unreadByRide = useChatStore((state) => state.unreadByRide);
  const hydrateUnread = useChatStore((state) => state.hydrateUnread);
  const [cachedChats, setCachedChats] = useState<Record<string, { lastMessageText: string; lastSenderName: string; updatedAt: string | null }>>({});

  useEffect(() => {
    fetchMyTrips();
    void hydrateUnread();
  }, [fetchMyTrips, hydrateUnread]);

  useEffect(() => {
    const loadCachedChats = async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const chatKeys = keys.filter((key) => key.startsWith('chat_messages_'));
        if (!chatKeys.length) {
          setCachedChats({});
          return;
        }

        const entries = await AsyncStorage.multiGet(chatKeys);
        const nextChats: Record<string, { lastMessageText: string; lastSenderName: string; updatedAt: string | null }> = {};

        entries.forEach(([key, value]) => {
          if (!value) return;
          try {
            const parsed = JSON.parse(value) as { text?: string; createdAt?: string; user?: { name?: string } }[];
            const lastMessage = parsed[parsed.length - 1];
            if (!lastMessage) return;
            const rideId = key.replace(getChatStorageKey(''), '');
            nextChats[rideId] = {
              lastMessageText: lastMessage.text || 'Open conversation',
              lastSenderName: lastMessage.user?.name || '',
              updatedAt: lastMessage.createdAt || null,
            };
          } catch {
            return;
          }
        });

        setCachedChats(nextChats);
      } catch {
        setCachedChats({});
      }
    };

    void loadCachedChats();
  }, [activeTrips, history]);

  const chatTrips = useMemo(() => {
    const merged = [...activeTrips, ...history];
    const tripMap = new Map<string, any>();

    merged.forEach((item: any) => {
      if (item?.id && (item?.passengerId || item?.passenger || cachedChats[item.id])) {
        tripMap.set(item.id, item);
      }
    });

    Object.keys(cachedChats).forEach((rideId) => {
      if (!tripMap.has(rideId)) {
        tripMap.set(rideId, { id: rideId });
      }
    });

    return Array.from(tripMap.values()).sort((a: any, b: any) => {
      const aTime = new Date(cachedChats[a.id]?.updatedAt || a.updatedAt || 0).getTime();
      const bTime = new Date(cachedChats[b.id]?.updatedAt || b.updatedAt || 0).getTime();
      return bTime - aTime;
    });
  }, [activeTrips, cachedChats, history]);

  const getThreadName = (ride: any) => {
    const passengerName = getPassengerName(ride);
    if (!isPlaceholderName(passengerName)) {
      return passengerName;
    }

    const cachedName = cachedChats[ride?.id]?.lastSenderName || '';
    if (
      !isPlaceholderName(cachedName) &&
      cachedName.trim().toLowerCase() !== (user?.name || '').trim().toLowerCase()
    ) {
      return cachedName;
    }

    return 'Rider';
  };

  const renderChatItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() =>
        router.push({
          pathname: '/chat/[id]',
          params: {
            id: item.id,
            recipientName: getThreadName(item),
          },
        })
      }
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{getThreadName(item).charAt(0)}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{getThreadName(item)}</Text>
            {!!unreadByRide[item.id] && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.time}>
            {new Date(cachedChats[item.id]?.updatedAt || item.updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.messagePreview} numberOfLines={1}>
          {getPreviewText(item, cachedChats[item.id]?.lastMessageText)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <FlatList
        data={chatTrips}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={fetchMyTrips}
        ListEmptyComponent={
          <EmptyState
            title="No Conversations"
            message="Driver chats will appear here once riders book or message you."
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
    fontFamily: Fonts.semibold,
    color: COLORS.text,
    textAlign: 'center',
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: COLORS.text,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#22C55E',
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
