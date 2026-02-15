import { useAuthStore } from '@/app/stores/authStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import api from '../services/api';
// import { io } from "socket.io-client"; // Uncomment when socket is ready

import { Message, useChatStore } from '@/app/stores/chatStore';

export default function ChatScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const params = useLocalSearchParams();
    const tripId = params.id as string;
    const recipientName = params.recipientName as string || 'User';
    const recipientImage = params.recipientImage as string;

    // Cast the store state to any if stricty typed, but implicit should work if interface matches.
    // actually, useChatStore returns specific Message type.
    const { messages, connect, disconnect, sendMessage, setMessages } = useChatStore();
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        fetchMessages();
        connect(tripId);

        return () => {
            disconnect();
        };
    }, [tripId]);

    const fetchMessages = async () => {
        try {
            const res = await api.get(`/chats/${tripId}/messages`);
            setMessages(res.data);
        } catch (error) {
            console.log("Error fetching messages", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;

        // sendMessage in store emits socket event
        sendMessage(tripId, inputText.trim());
        setInputText('');
    };

    const renderItem = ({ item }: { item: Message }) => {
        // Handle both structure if necessary, but store enforces user object.
        const isMe = item.user?._id === user?.id;

        return (
            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
                    {item.text}
                </Text>
                <Text style={[styles.timeText, isMe ? styles.myTime : styles.theirTime]}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    {recipientImage ? (
                        <Image source={{ uri: recipientImage }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitials}>{recipientName.charAt(0)}</Text>
                        </View>
                    )}
                    <View>
                        <Text style={styles.name}>{recipientName}</Text>
                        <Text style={styles.status}>Online</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.callButton}>
                    <Ionicons name="call" size={20} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderItem}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={styles.listContent}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    />
                )}

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message..."
                        placeholderTextColor={COLORS.textSecondary}
                        multiline
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
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border || '#E5E7EB',
        backgroundColor: COLORS.white,
        marginTop: Platform.OS === 'android' ? 30 : 0,
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
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarInitials: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.semibold,
    },
    status: {
        fontSize: 12,
        color: COLORS.success || '#10B981',
        fontFamily: Fonts.rounded,
    },
    callButton: {
        padding: 10,
        backgroundColor: '#F0F9FF',
        borderRadius: 20,
    },
    listContent: {
        padding: SPACING.m,
        gap: 12,
        paddingBottom: 20
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 4,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#F3F4F6',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        fontFamily: Fonts.rounded,
    },
    myText: {
        color: COLORS.white,
    },
    theirText: {
        color: COLORS.text,
    },
    timeText: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
        fontFamily: Fonts.rounded,
    },
    myTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    theirTime: {
        color: COLORS.textSecondary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border || '#E5E7EB',
        marginBottom: Platform.OS === 'ios' ? 10 : 0,
    },
    input: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 12,
        fontSize: 16,
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
        backgroundColor: COLORS.textSecondary || '#9CA3AF',
        opacity: 0.5,
    },
});
