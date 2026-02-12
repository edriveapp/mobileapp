import { useAuthStore } from '@/app/stores/authStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Mock Socket for frontend demo until integration
// import { io } from 'socket.io-client';

interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: number;
}

interface ChatScreenProps {
    recipientName: string;
    recipientImage?: string;
    tripId: string;
    onClose: () => void;
}

export default function ChatScreen({ recipientName, recipientImage, tripId, onClose }: ChatScreenProps) {
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    // const socket = useRef(io('http://localhost:3000')).current;

    useEffect(() => {
        // Mock initial conversation
        setMessages([
            { id: '1', text: 'Hi, I am on my way!', senderId: 'driver_123', timestamp: Date.now() - 60000 },
            { id: '2', text: 'Great, thanks!', senderId: user?.id || 'me', timestamp: Date.now() - 30000 },
        ]);

        // socket.emit('join_room', tripId);
        // socket.on('new_message', (msg) => {
        //     setMessages(prev => [...prev, msg]);
        // });

        // return () => { socket.disconnect(); }
    }, []);

    const handleSend = () => {
        if (!inputText.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            text: inputText.trim(),
            senderId: user?.id || 'me',
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, newMessage]);
        setInputText('');

        // socket.emit('send_message', { ...newMessage, tripId });
    };

    const renderItem = ({ item }: { item: Message }) => {
        const isMe = item.senderId === (user?.id || 'me');
        return (
            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
                    {item.text}
                </Text>
                <Text style={[styles.timeText, isMe ? styles.myTime : styles.theirTime]}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    {recipientImage && <Image source={{ uri: recipientImage }} style={styles.avatar} />}
                    <View>
                        <Text style={styles.name}>{recipientName}</Text>
                        <Text style={styles.status}>Online</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.callButton}>
                    <Ionicons name="call" size={20} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />

            {/* Input */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
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
        borderBottomColor: COLORS.border,
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
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.semibold,
    },
    status: {
        fontSize: 12,
        color: COLORS.success,
        fontFamily: Fonts.rounded,
    },
    callButton: {
        padding: 10,
        backgroundColor: COLORS.primaryLight,
        borderRadius: 20,
    },
    listContent: {
        padding: SPACING.m,
        gap: 12,
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
        backgroundColor: COLORS.surface,
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
        fontFamily: Fonts.mono,
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
        borderTopColor: COLORS.border,
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.surface,
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
        backgroundColor: COLORS.textSecondary,
        opacity: 0.5,
    },
});
