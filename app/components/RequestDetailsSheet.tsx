import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { getRiderOfferFloor, roundFare } from '@/app/utils/pricing';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export type RequestRideMode = 'solo' | 'shared';

export interface RequestDetails {
  offerPrice: number;
  rideMode: RequestRideMode;
  note: string;
}

interface RequestDetailsSheetProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  confirmText?: string;
  loading?: boolean;
  estimatedPrivatePrice?: number;
  initialOfferPrice?: number;
  initialRideMode?: RequestRideMode;
  initialNote?: string;
  onClose: () => void;
  onSubmit: (details: RequestDetails) => void;
}

export default function RequestDetailsSheet({
  visible,
  title = 'Set your request',
  subtitle = 'Set your offer with the guide below, choose private or shared, and add anything the driver should know.',
  confirmText = 'Send request',
  loading = false,
  estimatedPrivatePrice = 0,
  initialOfferPrice = 0,
  initialRideMode = 'solo',
  initialNote = '',
  onClose,
  onSubmit,
}: RequestDetailsSheetProps) {
  const [offerText, setOfferText] = useState(initialOfferPrice ? String(initialOfferPrice) : '');
  const [rideMode, setRideMode] = useState<RequestRideMode>(initialRideMode);
  const [note, setNote] = useState(initialNote);

  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 10 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 110) {
          Animated.timing(translateY, {
            toValue: 700,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const floorPrice = React.useMemo(
    () => getRiderOfferFloor(estimatedPrivatePrice, rideMode),
    [estimatedPrivatePrice, rideMode]
  );

  const priceSuggestions = React.useMemo(() => {
    if (!estimatedPrivatePrice || estimatedPrivatePrice <= 0) {
      if (rideMode === 'solo') {
        return [
          floorPrice,
          roundFare(floorPrice * 1.1, floorPrice),
          roundFare(floorPrice * 1.25, floorPrice),
        ];
      }
      return [
        floorPrice,
        roundFare(floorPrice * 1.2, floorPrice),
        roundFare(floorPrice * 1.4, floorPrice),
      ];
    }

    if (rideMode === 'solo') {
      return [
        Math.max(floorPrice, roundFare(estimatedPrivatePrice * 0.92)),
        roundFare(estimatedPrivatePrice),
        roundFare(estimatedPrivatePrice * 1.08),
      ];
    }

    return [
      Math.max(floorPrice, roundFare(estimatedPrivatePrice / 4.2)),
      roundFare(estimatedPrivatePrice / 3),
      roundFare(estimatedPrivatePrice / 2),
    ];
  }, [estimatedPrivatePrice, floorPrice, rideMode]);

  const suggestedRangeText = React.useMemo(() => {
    if (!priceSuggestions.length) return '';
    return `Suggested range: ₦${priceSuggestions[0].toLocaleString()} - ₦${priceSuggestions[priceSuggestions.length - 1].toLocaleString()}`;
  }, [priceSuggestions]);

  useEffect(() => {
    if (!visible) return;
    setOfferText(initialOfferPrice ? String(initialOfferPrice) : '');
    setRideMode(initialRideMode);
    setNote(initialNote);
  }, [initialNote, initialOfferPrice, initialRideMode, visible]);

  useEffect(() => {
    if (!visible) return;
    if (initialOfferPrice) return;
    if (offerText.trim()) return;
    if (!priceSuggestions[1]) return;
    setOfferText(String(priceSuggestions[1]));
  }, [initialOfferPrice, offerText, priceSuggestions, visible]);

  const handleSubmit = () => {
    const offerPrice = Number(offerText.replace(/,/g, '').trim());
    if (!offerPrice || offerPrice <= 0) return;
    if (offerPrice < floorPrice) {
      Alert.alert(
        'Offer too low',
        `Minimum for ${rideMode === 'solo' ? 'private' : 'shared'} ride is ₦${floorPrice.toLocaleString()}.`
      );
      return;
    }

    onSubmit({
      offerPrice,
      rideMode,
      note: note.trim(),
    });
  };

  const numericOffer = Number(offerText.replace(/,/g, '').trim());
  const isDisabled = loading || !numericOffer || numericOffer < floorPrice;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
            <Pressable onPress={() => {}}>

              {/* Drag zone — only this area initiates the swipe */}
              <View {...panResponder.panHandlers} style={styles.dragZone}>
                <View style={styles.handle} />
              </View>

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>

              <View style={styles.section}>
                <Text style={styles.label}>Your offer for this ride</Text>
                <Text style={styles.floorText}>
                  Minimum offer for {rideMode === 'solo' ? 'private' : 'shared'}: ₦{floorPrice.toLocaleString()}
                </Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.currency}>₦</Text>
                  <TextInput
                    value={offerText}
                    onChangeText={setOfferText}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.input}
                  />
                </View>
                <>
                  <Text style={styles.rangeText}>
                    {rideMode === 'solo'
                      ? 'Private means you are covering the full trip cost for this route, so the price sits much closer to the full vehicle fare.'
                      : 'Shared is cheaper because you are splitting the trip cost, so offers usually land around 1/2 to 1/4.2 of the private fare.'}
                  </Text>
                  {!!estimatedPrivatePrice && (
                    <Text style={styles.privateGuideText}>
                      Full private guide: ₦{estimatedPrivatePrice.toLocaleString()}
                    </Text>
                  )}
                  <Text style={styles.rangeValue}>{suggestedRangeText}</Text>
                  <View style={styles.suggestionRow}>
                    {priceSuggestions.map((suggestedPrice, index) => (
                      <TouchableOpacity
                        key={`request-price-${rideMode}-${index}-${suggestedPrice}`}
                        style={[
                          styles.suggestionChip,
                          Number(offerText.replace(/,/g, '').trim()) === suggestedPrice && styles.suggestionChipActive,
                        ]}
                        onPress={() => setOfferText(String(suggestedPrice))}
                      >
                        <Text
                          style={[
                            styles.suggestionChipText,
                            Number(offerText.replace(/,/g, '').trim()) === suggestedPrice && styles.suggestionChipTextActive,
                          ]}
                        >
                          ₦{suggestedPrice.toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Ride type</Text>
                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[styles.modeCard, rideMode === 'solo' && styles.modeCardActive]}
                    onPress={() => setRideMode('solo')}
                  >
                    <Ionicons name="person-outline" size={18} color={rideMode === 'solo' ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[styles.modeTitle, rideMode === 'solo' && styles.modeTitleActive]}>Only me</Text>
                    <Text style={styles.modeSubtitle}>Private ride request</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeCard, rideMode === 'shared' && styles.modeCardActive]}
                    onPress={() => setRideMode('shared')}
                  >
                    <Ionicons name="people-outline" size={18} color={rideMode === 'shared' ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[styles.modeTitle, rideMode === 'shared' && styles.modeTitleActive]}>Shared</Text>
                    <Text style={styles.modeSubtitle}>Open to shared pickup</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Note for driver</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add pickup clue, luggage info, gate number, or anything helpful"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.noteInput}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isDisabled}
              >
                <Text style={styles.submitText}>
                  {loading
                    ? 'Sending...'
                    : numericOffer < floorPrice
                      ? `Increase to min ₦${floorPrice.toLocaleString()}`
                      : confirmText}
                </Text>
              </TouchableOpacity>

            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.xl,
    paddingTop: 0,
  },
  dragZone: {
    alignItems: 'center',
    paddingTop: SPACING.l,
    paddingBottom: SPACING.s,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D0D5DD',
  },
  title: {
    fontSize: 20,
    color: COLORS.text,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: Fonts.rounded,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: SPACING.l,
  },
  section: {
    marginBottom: SPACING.m,
  },
  label: {
    color: COLORS.text,
    fontSize: 13,
    fontFamily: Fonts.semibold,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 14,
    backgroundColor: '#FCFCFD',
    paddingHorizontal: 14,
    height: 52,
  },
  floorText: {
    color: '#B54708',
    fontSize: 12,
    fontFamily: Fonts.semibold,
    marginBottom: 6,
  },
  currency: {
    fontSize: 18,
    color: COLORS.text,
    fontFamily: Fonts.semibold,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontFamily: Fonts.rounded,
  },
  rangeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.rounded,
    lineHeight: 18,
    marginTop: 10,
  },
  rangeValue: {
    color: COLORS.text,
    fontSize: 13,
    fontFamily: Fonts.semibold,
    marginTop: 4,
    marginBottom: 10,
  },
  privateGuideText: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: Fonts.semibold,
    marginTop: 6,
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  suggestionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF6F0',
  },
  suggestionChipText: {
    color: '#344054',
    fontSize: 12,
    fontFamily: Fonts.semibold,
  },
  suggestionChipTextActive: {
    color: COLORS.primary,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    backgroundColor: '#FCFCFD',
    padding: 14,
  },
  modeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF6F0',
  },
  modeTitle: {
    marginTop: 8,
    marginBottom: 2,
    color: COLORS.text,
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  modeTitleActive: {
    color: COLORS.primary,
  },
  modeSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.rounded,
    lineHeight: 17,
  },
  noteInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 14,
    backgroundColor: '#FCFCFD',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    fontFamily: Fonts.rounded,
  },
  submitButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.s,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: 'white',
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },
});
