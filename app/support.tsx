import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import api from '@/app/services/api';
import { Fonts, SPACING } from '@/constants/theme';
import { safeOpenURL } from '@/app/utils/linking';

const QUICK_TOPICS = [
  'Driver behaviour',
  'Rider behaviour',
  'Delayed trip acceptance',
  'Assault',
  'Long waiting hours',
  'Bad vehicle',
  'Pricing Issues',
];

const MINT = '#A8E6C3';
const MINT_BG = '#C8F0D8';
const MINT_TEXT = '#1A6640';
const BG = '#EFEFEF';
const TEXT = '#1A1A1A';
const TEXT_SEC = '#888888';
const BORDER = '#DEDEDE';
const WHITE = '#FFFFFF';
const PRIMARY = '#005124';
const SUPPORT_NUMBER = '09160500033';

type SupportTicket = {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved';
  updatedAt: string;
};

type TicketDetails = SupportTicket & {
  messages: Array<{
    id: string;
    senderRole: string;
    text: string;
    createdAt: string;
  }>;
};

export default function SupportScreen() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<TicketDetails | null>(null);
  const [reply, setReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeTicketStatus = useMemo(() => activeTicket?.status || 'open', [activeTicket?.status]);

  const loadTickets = async () => {
    const response = await api.get('/support/tickets/my');
    const data = Array.isArray(response.data) ? response.data : [];
    setTickets(data);
    if (!activeTicketId && data.length > 0) {
      setActiveTicketId(data[0].id);
    }
  };

  const loadTicketDetails = async (ticketId: string) => {
    const response = await api.get(`/support/tickets/${ticketId}`);
    setActiveTicket(response.data);
  };

  useEffect(() => {
    loadTickets().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!activeTicketId) return;
    loadTicketDetails(activeTicketId).catch(() => undefined);
  }, [activeTicketId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadTickets().catch(() => undefined);
      if (activeTicketId) {
        loadTicketDetails(activeTicketId).catch(() => undefined);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTicketId]);

  const handleSubmit = async () => {
    if (!topic.trim() || !message.trim()) {
      Alert.alert('Incomplete', 'Please select a topic and enter your message.');
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await api.post('/support/tickets', {
        subject: topic.trim(),
        description: message.trim(),
        category: topic.trim(),
      });
      const ticket = response.data as TicketDetails;
      setTopic('');
      setMessage('');
      setActiveTicketId(ticket.id);
      setActiveTicket(ticket);
      await loadTickets();
      Alert.alert('Ticket created', 'Support has received your message.');
    } catch (error: any) {
      Alert.alert('Failed', error?.message || 'Could not create ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!activeTicketId || !reply.trim()) return;
    try {
      const response = await api.post(`/support/tickets/${activeTicketId}/messages`, {
        text: reply.trim(),
      });
      setReply('');
      setActiveTicket(response.data);
      await loadTickets();
    } catch (error: any) {
      Alert.alert('Failed', error?.message || 'Could not send reply.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Ticket</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.tabRow}>
          <View style={styles.tabActive}>
            <Text style={styles.tabActiveText}>Make Report</Text>
          </View>
        </View>

        <View style={styles.supportCard}>
          <View>
            <Text style={styles.supportCardTitle}>Customer Support</Text>
            <Text style={styles.supportCardMeta}>Call {SUPPORT_NUMBER}</Text>
          </View>
          <TouchableOpacity style={styles.callButton} onPress={() => safeOpenURL(`tel:${SUPPORT_NUMBER}`)} activeOpacity={0.8}>
            <Ionicons name="call-outline" size={16} color={WHITE} />
            <Text style={styles.callButtonText}>Call now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.categoryGrid}>
          {QUICK_TOPICS.map((item) => {
            const selected = topic === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.categoryChip, selected && styles.categoryChipActive]}
                onPress={() => setTopic(item)}
                activeOpacity={0.75}
              >
                <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.messageContainer}>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder=""
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.sendButton, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={15} color={WHITE} />
          </TouchableOpacity>
        </View>

        {tickets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Tickets ({tickets.length})</Text>
            {tickets.map((ticket) => (
              <TouchableOpacity
                key={ticket.id}
                style={styles.ticketRow}
                onPress={() => setActiveTicketId(ticket.id)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                  <Text style={styles.ticketMeta}>{new Date(ticket.updatedAt).toLocaleString()}</Text>
                </View>
                <Text style={styles.ticketStatus}>{ticket.status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTicket && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conversation</Text>
            <Text style={styles.sectionSubtitle}>Status: {activeTicketStatus}</Text>
            <View style={styles.messagesWrap}>
              {activeTicket.messages.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.messageBubble,
                    item.senderRole === 'admin' ? styles.messageBubbleAdmin : styles.messageBubbleUser,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      item.senderRole === 'admin' ? styles.messageTextAdmin : styles.messageTextUser,
                    ]}
                  >
                    {item.text}
                  </Text>
                  <Text style={styles.messageTime}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
              ))}
            </View>
            <View style={styles.replyRow}>
              <TextInput
                style={styles.replyInput}
                value={reply}
                onChangeText={setReply}
                placeholder="Reply to support..."
                placeholderTextColor={TEXT_SEC}
              />
              <TouchableOpacity style={styles.replyButton} onPress={sendReply} activeOpacity={0.8}>
                <Ionicons name="send" size={15} color={WHITE} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
      <TouchableOpacity style={styles.floatingSupportButton} onPress={() => safeOpenURL(`tel:${SUPPORT_NUMBER}`)} activeOpacity={0.85}>
        <Ionicons name="headset-outline" size={22} color={WHITE} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.s,
    paddingBottom: SPACING.m,
    backgroundColor: BG,
  },
  backButton: {
    width: 32,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 22,
    color: TEXT,
    fontFamily: Fonts!.bold,
  },
  content: {
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.xl,
    gap: SPACING.m,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  tabActive: {
    backgroundColor: MINT_BG,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  tabActiveText: {
    fontSize: 14,
    fontFamily: Fonts!.semibold,
    color: MINT_TEXT,
  },
  supportCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supportCardTitle: {
    fontSize: 15,
    color: TEXT,
    fontFamily: Fonts!.semibold,
  },
  supportCardMeta: {
    marginTop: 4,
    color: TEXT_SEC,
    fontSize: 12,
    fontFamily: Fonts!.rounded,
  },
  callButton: {
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callButtonText: {
    color: WHITE,
    fontSize: 13,
    fontFamily: Fonts!.semibold,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    width: '47.5%',
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: {
    borderColor: MINT,
    backgroundColor: MINT_BG,
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: Fonts!.semibold,
    color: TEXT,
    textAlign: 'center',
  },
  categoryChipTextActive: {
    color: MINT_TEXT,
  },
  messageContainer: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BORDER,
    minHeight: 260,
    padding: SPACING.m,
  },
  messageInput: {
    flex: 1,
    minHeight: 220,
    fontSize: 15,
    color: TEXT,
    fontFamily: Fonts!.rounded,
    textAlignVertical: 'top',
  },
  sendButton: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: SPACING.m,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts!.semibold,
    color: TEXT,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: Fonts!.rounded,
    color: TEXT_SEC,
    textTransform: 'capitalize',
    marginBottom: SPACING.s,
  },
  ticketRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketSubject: {
    fontSize: 14,
    color: TEXT,
    fontFamily: Fonts!.semibold,
  },
  ticketMeta: {
    fontSize: 11,
    color: TEXT_SEC,
    marginTop: 2,
    fontFamily: Fonts!.rounded,
  },
  ticketStatus: {
    fontSize: 12,
    color: PRIMARY,
    fontFamily: Fonts!.semibold,
    textTransform: 'capitalize',
    marginLeft: 8,
  },
  messagesWrap: {
    gap: 8,
    marginBottom: SPACING.m,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 10,
  },
  messageBubbleUser: {
    backgroundColor: '#F2F4F7',
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  messageBubbleAdmin: {
    backgroundColor: MINT_BG,
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  messageText: {
    fontSize: 13,
    fontFamily: Fonts!.rounded,
  },
  messageTextUser: {
    color: TEXT,
  },
  messageTextAdmin: {
    color: MINT_TEXT,
  },
  messageTime: {
    marginTop: 3,
    fontSize: 10,
    color: TEXT_SEC,
  },
  replyRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  replyInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: TEXT,
    fontFamily: Fonts!.rounded,
    backgroundColor: WHITE,
  },
  replyButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingSupportButton: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
