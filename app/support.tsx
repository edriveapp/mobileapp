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
import { COLORS, Fonts, SPACING } from '@/constants/theme';

const QUICK_TOPICS = [
  'Payment issue',
  'Trip cancellation',
  'Driver behavior',
  'Lost item',
  'Verification help',
  'Account issue',
];

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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Ticket</Text>
          <Text style={styles.cardSubtitle}>
            Share your issue and support/admin will respond in this thread.
          </Text>

          <Text style={styles.label}>Quick topic</Text>
          <View style={styles.topicsWrap}>
            {QUICK_TOPICS.map((item) => {
              const selected = topic === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.topicChip, selected && styles.topicChipActive]}
                  onPress={() => setTopic(item)}
                >
                  <Text style={[styles.topicChipText, selected && styles.topicChipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Message</Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Describe what happened, where and when."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={isSubmitting}>
            <Text style={styles.primaryButtonText}>{isSubmitting ? 'Submitting...' : 'Submit Ticket'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Tickets ({tickets.length})</Text>
          {tickets.map((ticket) => (
            <TouchableOpacity key={ticket.id} style={styles.ticketRow} onPress={() => setActiveTicketId(ticket.id)}>
              <View>
                <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                <Text style={styles.ticketMeta}>{new Date(ticket.updatedAt).toLocaleString()}</Text>
              </View>
              <Text style={styles.ticketStatus}>{ticket.status}</Text>
            </TouchableOpacity>
          ))}
          {tickets.length === 0 ? <Text style={styles.emptyText}>No tickets yet.</Text> : null}
        </View>

        {activeTicket ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ticket Conversation</Text>
            <Text style={styles.cardSubtitle}>Status: {activeTicketStatus}</Text>
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
                placeholderTextColor={COLORS.textSecondary}
              />
              <TouchableOpacity style={styles.replyButton} onPress={sendReply}>
                <Ionicons name="send" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    color: COLORS.text,
    fontFamily: Fonts.bold,
  },
  content: {
    padding: SPACING.l,
    gap: SPACING.m,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.m,
  },
  cardTitle: {
    fontSize: 17,
    color: COLORS.text,
    fontFamily: Fonts.semibold,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: Fonts.rounded,
    lineHeight: 19,
    marginBottom: SPACING.m,
  },
  label: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: Fonts.semibold,
    marginBottom: 8,
  },
  topicsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.m,
  },
  topicChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  topicChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EAF7EF',
  },
  topicChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: Fonts.semibold,
  },
  topicChipTextActive: {
    color: COLORS.primary,
  },
  messageInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.m,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: Fonts.rounded,
    backgroundColor: '#fff',
    marginBottom: SPACING.m,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },
  ticketRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketSubject: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: Fonts.semibold,
  },
  ticketMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ticketStatus: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: Fonts.semibold,
    textTransform: 'capitalize',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: Fonts.rounded,
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
  },
  messageBubbleAdmin: {
    backgroundColor: '#E7F6EC',
    alignSelf: 'flex-end',
  },
  messageText: {
    fontSize: 13,
    fontFamily: Fonts.rounded,
  },
  messageTextUser: {
    color: COLORS.text,
  },
  messageTextAdmin: {
    color: '#0A7A3E',
  },
  messageTime: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  replyRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
  },
  replyButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
