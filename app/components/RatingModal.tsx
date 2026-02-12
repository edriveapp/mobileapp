import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface RatingModalProps {
    isVisible: boolean;
    driverName: string;
    driverImage: string;
    onSubmit: (rating: number, comment: string) => void;
    onSkip: () => void;
}

export default function RatingModal({ isVisible, driverName, driverImage, onSubmit, onSkip }: RatingModalProps) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    const handleSubmit = () => {
        onSubmit(rating, comment);
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onSkip}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header Image */}
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: driverImage }} style={styles.driverImage} />
                        <View style={styles.checkBadge}>
                            <Ionicons name="checkmark" size={16} color={COLORS.white} />
                        </View>
                    </View>

                    <Text style={styles.title}>Rate your trip with {driverName}</Text>
                    <Text style={styles.subtitle}>How was your experience?</Text>

                    {/* Star Rating */}
                    <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <Ionicons
                                    name={rating >= star ? "star" : "star-outline"}
                                    size={40}
                                    color="#FFD700"
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Comment Input */}
                    <TextInput
                        style={styles.input}
                        placeholder="Leave a comment (optional)"
                        placeholderTextColor={COLORS.textSecondary}
                        multiline
                        returnKeyType="done"
                        blurOnSubmit={true}
                        value={comment}
                        onChangeText={setComment}
                    />

                    {/* Actions */}
                    <TouchableOpacity
                        style={[styles.submitButton, rating === 0 && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={rating === 0}
                    >
                        <Text style={styles.submitText}>Submit Review</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
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
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: SPACING.l,
    },
    container: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: SPACING.xl,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    imageContainer: {
        marginBottom: SPACING.m,
        position: 'relative',
    },
    driverImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#eee',
    },
    checkBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.success,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.semibold,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
        marginBottom: SPACING.l,
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: SPACING.l,
    },
    input: {
        width: '100%',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        fontFamily: Fonts.rounded,
        color: COLORS.text,
        height: 100,
        textAlignVertical: 'top',
        marginBottom: SPACING.l,
    },
    submitButton: {
        width: '100%',
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    disabledButton: {
        backgroundColor: COLORS.textSecondary,
        opacity: 0.5,
    },
    submitText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Fonts.semibold,
    },
    skipButton: {
        padding: 8,
    },
    skipText: {
        color: COLORS.textSecondary,
        fontSize: 16,
        fontWeight: '500',
        fontFamily: Fonts.rounded,
    },
});
