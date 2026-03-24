import { useAuthStore } from '@/app/stores/authStore';
import { useTripStore } from '@/app/stores/tripStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

import { Message, useChatStore } from '@/app/stores/chatStore';

const getAddressText = (value: any) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.address || '';
};

const getPersonName = (person: any, fallback: string) => {
    const fullName = [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim();
    return fullName || person?.name || person?.email || fallback;
};

const isPlaceholderName = (value?: string) => {
    if (!value) return true;
    return ['passenger', 'driver', 'user', 'rider'].includes(value.trim().toLowerCase());
};

const getMessageParticipantName = (messages: Message[], currentUserId?: string) => {
    const counterpart = messages.find((message) => message?.user?._id && message.user._id !== currentUserId);
    return counterpart?.user?.name || '';
};

const normalizeFetchedMessage = (message: any): Message => ({
    _id: String(message._id || message.id),
    text: String(message.text || ''),
    createdAt: message.createdAt,
    user: {
        _id: String(message.user?._id || message.senderId || message.sender?.id || ''),
        name: message.user?.name || getPersonName(message.sender, 'User'),
    },
});

export default function ChatScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { trips, availableTrips, activeTrips, history } = useTripStore();
    const params = useLocalSearchParams();
    const tripId = params.id as string;
    const passedRecipientName = params.recipientName as string;
    const recipientImage = params.recipientImage as string;
    const trip = [...trips, ...availableTrips, ...activeTrips, ...history].find((item: any) => item.id === tripId);
    const { messages, connect, disconnect, sendMessage, setMessages, hydrateMessages, markRideRead, isConnected } = useChatStore();
    const derivedRecipientName = user?.role === 'driver'
        ? getPersonName(trip?.passenger, 'Rider')
        : getPersonName(trip?.driver, getAddressText(trip?.destination) || 'Driver');
    const messageParticipantName = getMessageParticipantName(messages, user?.id);
    const recipientName =
        (!isPlaceholderName(passedRecipientName) ? passedRecipientName : '') ||
        (!isPlaceholderName(derivedRecipientName) ? derivedRecipientName : '') ||
        (!isPlaceholderName(messageParticipantName) ? messageParticipantName : '') ||
        (user?.role === 'driver' ? 'Rider' : 'Driver');

    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);
    const prevMessageCount = useRef(0);

    const fetchMessages = useCallback(async () => {
        try {
            const res = await api.get(`/chats/${tripId}/messages`);
            const normalized = Array.isArray(res.data)
                ? res.data.map(normalizeFetchedMessage)
                : [];
            await setMessages(tripId, normalized);
        } catch (error) {
            console.log("Error fetching messages", error);
        } finally {
            setLoading(false);
        }
    }, [setMessages, tripId]);

    useEffect(() => {
        // Hydrate cached messages first (no loading flash), then fetch fresh
        hydrateMessages(tripId).finally(() => {
            setLoading(false); // Show cached immediately
            fetchMessages();
        });
        void markRideRead(tripId);
        connect(tripId);

        return () => {
            disconnect();
        };
    }, [connect, disconnect, fetchMessages, hydrateMessages, markRideRead, tripId]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > prevMessageCount.current) {
            prevMessageCount.current = messages.length;
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 80);
        }
    }, [messages]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        sendMessage(tripId, inputText.trim());
        setInputText('');
        // Scroll after optimistic append
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
    };

    const renderItem = ({ item }: { item: Message }) => {
        const isMe = item.user?._id === user?.id;

        return (
            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
                    {item.text}
                </Text>
                <View style={styles.timeRow}>
                    <Text style={[styles.timeText, isMe ? styles.myTime : styles.theirTime]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {isMe && (
                        <Ionicons
                            name={item.pending ? 'time-outline' : 'checkmark-done'}
                            size={12}
                            color={item.pending ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.8)'}
                            style={{ marginLeft: 4 }}
                        />
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    {recipientImage ? (
                        <Image source={{ uri: recipientImage }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitials}>{recipientName.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                    <View>
                        <Text style={styles.name}>{recipientName}</Text>
                        <View style={styles.onlineRow}>
                            <View style={[styles.onlineDot, { backgroundColor: isConnected ? COLORS.success : '#A0AEC0' }]} />
                            <Text style={styles.status}>{isConnected ? 'Connected' : 'Connecting...'}</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={styles.callButton}>
                    <Ionicons name="phone-portrait-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 25}
            >
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <>
                        {messages.length === 0 && (
                            <View style={styles.emptyChat}>
                                <Ionicons name="chatbubbles-outline" size={48} color="#C8D5CC" />
                                <Text style={styles.emptyChatText}>No messages yet</Text>
                                <Text style={styles.emptyChatSub}>Say hello to start the conversation</Text>
                            </View>
                        )}
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            renderItem={renderItem}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={styles.listContent}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        />
                    </>
                )}

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message..."
                        placeholderTextColor={COLORS.textSecondary}
                        multiline
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
                        blurOnSubmit={false}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                    >
                        <Ionicons name="send" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border || '#E5E7EB',
        backgroundColor: COLORS.white,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eee',
        marginRight: 10,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight || '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarInitials: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
        fontFamily: Fonts.bold,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.semibold,
    },
    onlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 1,
    },
    onlineDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#22C55E',
    },
    status: {
        fontSize: 12,
        color: '#22C55E',
        fontFamily: Fonts.rounded,
    },
    callButton: {
        padding: 10,
        backgroundColor: '#F0F9FF',
        borderRadius: 20,
    },
    listContent: {
        padding: SPACING.m,
        paddingBottom: 20,
        flexGrow: 1,
    },
    emptyChat: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        zIndex: 0,
    },
    emptyChatText: {
        fontSize: 16,
        color: COLORS.text,
        fontFamily: Fonts.semibold,
    },
    emptyChatSub: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 18,
        marginBottom: 6,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.white,
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    messageText: {
        fontSize: 15,
        fontFamily: Fonts.rounded,
        lineHeight: 20,
    },
    myText: {
        color: COLORS.white,
    },
    theirText: {
        color: COLORS.text,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    timeText: {
        fontSize: 10,
        fontFamily: Fonts.rounded,
    },
    myTime: {
        color: 'rgba(255,255,255,0.65)',
    },
    theirTime: {
        color: COLORS.textSecondary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: SPACING.m,
        paddingTop: 10,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border || '#E5E7EB',
        marginBottom: Platform.OS === 'ios' ? 10 : 0,
        gap: 10,
    },
    input: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        fontFamily: Fonts.rounded,
        maxHeight: 100,
        color: COLORS.text,
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#CBD5E1',
    },
});
