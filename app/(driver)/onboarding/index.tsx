import { useDriverStore } from '@/app/stores/driverStore';
import { useAuthStore } from '@/app/stores/authStore';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DriverInfoStep from './DriverInfoStep';
import VehicleDocumentsStep from './VehicleDocumentsStep';
import {
  validateDriverInfoStep,
  validateVehicleStep,
} from './validation';

const TOTAL_STEPS = 2;

export default function DriverOnboardingScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [currentStep, setCurrentStep] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { driverInfo, vehicleInfo, documents, completeOnboarding } = useDriverStore();

  const goToNextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 0) {
      if (!validateDriverInfoStep(driverInfo, documents.selfieUri)) {
        Alert.alert(
          'Incomplete Information',
          'Please fill in all required fields correctly before continuing.'
        );
        return;
      }
    }

    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate final step
    if (!validateVehicleStep(vehicleInfo, documents)) {
      Alert.alert(
        'Incomplete Information',
        'Please fill in all required fields and upload all required documents.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await completeOnboarding();
      setPreviewVisible(false);
      router.replace('/(driver)/onboarding/review');
    } catch (error: any) {
      Alert.alert(
        'Submission Failed',
        error?.message || 'Could not submit onboarding details. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = ((currentStep + 1) / TOTAL_STEPS) * 100;

  if (user?.verificationStatus === 'pending') {
    return (
      <SafeAreaView style={styles.lockedContainer} edges={['top', 'bottom']}>
        <View style={styles.lockedCard}>
          <Ionicons name="time-outline" size={28} color="#B54708" />
          <Text style={styles.lockedTitle}>Verification Pending</Text>
          <Text style={styles.lockedText}>
            Your submission is under review. Editing is disabled until admin approves or rejects it.
          </Text>
          <TouchableOpacity style={styles.lockedPrimaryBtn} onPress={() => router.replace('/(driver)/onboarding/review')}>
            <Text style={styles.lockedPrimaryText}>View Status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.lockedSecondaryBtn} onPress={() => router.replace('/(driver)')}>
            <Text style={styles.lockedSecondaryText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerSide}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.stepIndicator}>
            {`Step ${currentStep + 1} of ${TOTAL_STEPS}`}
          </Text>
          <View style={styles.headerSide} />
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
        </View>
      </View>

      <View style={styles.stepWrapper}>
        {currentStep === 0 ? (
          <View style={styles.stepContainer}>
            <DriverInfoStep />
          </View>
        ) : (
          <View style={styles.stepContainer}>
            <VehicleDocumentsStep />
          </View>
        )}
      </View>

      <View
        style={[
          styles.footer,
          currentStep === TOTAL_STEPS - 1 ? styles.footerStepTwo : null,
          { paddingBottom: SPACING.xl },
        ]}
      >
        {currentStep > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, currentStep === TOTAL_STEPS - 1 ? styles.buttonStepTwo : null]}
            onPress={goToPreviousStep}
          >
            <Text style={styles.buttonSecondaryText}>Back</Text>
          </TouchableOpacity>
        )}

        {currentStep < TOTAL_STEPS - 1 ? (
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, currentStep === 0 && styles.buttonFull]}
            onPress={goToNextStep}
          >
            <Text style={styles.buttonPrimaryText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, styles.buttonStepTwo]}
            onPress={() => setPreviewVisible(true)}
          >
            <Text style={styles.buttonPrimaryText}>Review & Submit</Text>
          </TouchableOpacity>
        )}
      </View>
      </KeyboardAvoidingView>

      <Modal
        visible={previewVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Review Before Submission</Text>
            <Text style={styles.modalSubtitle}>
              Please confirm all details are correct. This information is used for verification.
            </Text>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <Text style={styles.itemText}>Full Name: {driverInfo.fullName || '-'}</Text>
              <Text style={styles.itemText}>Phone: {driverInfo.phoneNumber || '-'}</Text>
              <Text style={styles.itemText}>Date of Birth: {driverInfo.dateOfBirth || '-'}</Text>
              <Text style={styles.itemText}>NIN: {driverInfo.nin || '-'}</Text>
              <Text style={styles.itemText}>Address: {driverInfo.address || '-'}</Text>
              <Text style={styles.itemText}>License Number: {driverInfo.licenseNumber || '-'}</Text>
              <Text style={styles.itemText}>License Expiry: {driverInfo.licenseExpiry || '-'}</Text>
              <Text style={styles.itemText}>Guarantor: {driverInfo.guarantorName || '-'} ({driverInfo.guarantorPhone || '-'})</Text>
              <Text style={styles.itemText}>Next of Kin: {driverInfo.nextOfKinName || '-'} ({driverInfo.nextOfKinPhone || '-'})</Text>

              <Text style={styles.sectionTitle}>Vehicle Information</Text>
              <Text style={styles.itemText}>Type: {vehicleInfo.type || '-'}</Text>
              <Text style={styles.itemText}>Make: {vehicleInfo.make || '-'}</Text>
              <Text style={styles.itemText}>Model: {vehicleInfo.model || '-'}</Text>
              <Text style={styles.itemText}>Year: {vehicleInfo.year || '-'}</Text>
              <Text style={styles.itemText}>Plate Number: {vehicleInfo.plateNumber || '-'}</Text>
              <Text style={styles.itemText}>Capacity: {vehicleInfo.capacity || '-'}</Text>

              <Text style={styles.sectionTitle}>Documents</Text>
              <Text style={styles.itemText}>License: {documents.licenseImageUri ? 'Uploaded' : 'Missing'}</Text>
              <Text style={styles.itemText}>Insurance: {documents.insuranceImageUri ? 'Uploaded' : 'Missing'}</Text>
              <Text style={styles.itemText}>Worthiness Certificate: {documents.worthinessImageUri ? 'Uploaded' : 'Missing'}</Text>
              <Text style={styles.itemText}>Vehicle Photos: {documents.vehiclePhotos.length} uploaded</Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setPreviewVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.modalSecondaryText}>Back to Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryBtn, isSubmitting && styles.modalPrimaryBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.modalPrimaryText}>
                  {isSubmitting ? 'Submitting...' : 'Submit Onboarding'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  lockedContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.l,
  },
  lockedCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.l,
    alignItems: 'center',
  },
  lockedTitle: {
    marginTop: SPACING.s,
    fontSize: 20,
    color: COLORS.text,
    fontFamily: Fonts.bold,
  },
  lockedText: {
    marginTop: SPACING.s,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: SPACING.l,
  },
  lockedPrimaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: '100%',
    paddingVertical: SPACING.m,
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  lockedPrimaryText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },
  lockedSecondaryBtn: {
    borderRadius: 12,
    width: '100%',
    paddingVertical: SPACING.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  lockedSecondaryText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.rounded,
  },

  header: {
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.m,
    paddingBottom: SPACING.m,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  headerSide: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    padding: 4,
    marginLeft: 0,
    marginTop: 0,
  },
  stepIndicator: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: Fonts?.sans || 'System',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  stepWrapper: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.l,
    gap: SPACING.l,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerStepTwo: {
    paddingHorizontal: SPACING.s,
    paddingTop: SPACING.m,
    gap: SPACING.m,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.s,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonStepTwo: {
    minHeight: 46,
    borderRadius: 12,
    paddingVertical: 0,
  },
  buttonFull: {
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  buttonPrimaryText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: Fonts?.sans || 'System',
  },
  buttonSecondaryText: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: Fonts?.sans || 'System',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.l,
    maxHeight: '88%',
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D0D5DD',
    alignSelf: 'center',
    marginBottom: SPACING.s,
  },
  modalTitle: {
    fontSize: 20,
    color: COLORS.text,
    fontFamily: Fonts.bold,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
    textAlign: 'center',
    fontFamily: Fonts.rounded,
  },
  modalScroll: {
    marginBottom: SPACING.m,
  },
  sectionTitle: {
    fontSize: 15,
    color: COLORS.text,
    fontFamily: Fonts.semibold,
    marginTop: SPACING.m,
    marginBottom: 8,
  },
  itemText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontFamily: Fonts.rounded,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.s,
  },
  modalSecondaryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    backgroundColor: COLORS.white,
  },
  modalSecondaryText: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  modalPrimaryBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    backgroundColor: COLORS.primary,
  },
  modalPrimaryBtnDisabled: {
    opacity: 0.7,
  },
  modalPrimaryText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
});
