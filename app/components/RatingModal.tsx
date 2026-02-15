import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface RatingModalProps {
    visible: boolean;
    onSubmit: (rating: number, comment: string) => Promise<void>;
    onClose: () => void; // Should usually force rating, but allow close for MVP
    driverName?: string;
    driverImage?: string;
}

export default function RatingModal({ visible, onSubmit, onClose, driverName = "Driver" }: RatingModalProps) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) return;
        setIsLoading(true);
        try {
            await onSubmit(rating, comment);
            // Reset
            setRating(0);
            setComment('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>Rate your trip</Text>
                    <Text style={styles.subtitle}>How was your ride with {driverName}?</Text>

                    <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <Ionicons
                                    name={star <= rating ? "star" : "star-outline"}
                                    size={40}
                                    color={COLORS.primary}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Add a comment (optional)"
                        value={comment}
                        onChangeText={setComment}
                        multiline
                    />

                    <TouchableOpacity
                        style={[styles.button, rating === 0 && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={rating === 0 || isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.buttonText}>Submit Rating</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onClose} style={styles.skipBtn}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: SPACING.l,
    },
    container: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: SPACING.l,
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
        fontFamily: Fonts.bold,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 24,
        fontFamily: Fonts.rounded,
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    input: {
        width: '100%',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 12,
        height: 80,
        textAlignVertical: 'top',
        marginBottom: 24,
        fontFamily: Fonts.rounded,
    },
    button: {
        width: '100%',
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    disabledButton: {
        backgroundColor: COLORS.textSecondary,
        opacity: 0.5,
    },
    buttonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: Fonts.semibold,
    },
    skipBtn: {
        padding: 8,
    },
    skipText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontFamily: Fonts.rounded,
    },
});
