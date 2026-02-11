import { useDriverStore } from '@/app/stores/driverStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DriverInfoStep from './DriverInfoStep';
import VehicleDocumentsStep from './VehicleDocumentsStep';
import {
  validateDriverInfoStep,
  validateVehicleStep,
} from './validation';

const TOTAL_STEPS = 2;

export default function DriverOnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const { driverInfo, vehicleInfo, documents, completeOnboarding } = useDriverStore();

  const goToNextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 0) {
      if (!validateDriverInfoStep(driverInfo)) {
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

    // Mark onboarding as complete
    completeOnboarding();

    // Navigate to driver home
    router.replace('/(driver)');
  };

  const progressPercentage = ((currentStep + 1) / TOTAL_STEPS) * 100;

  return (
    <View style={styles.container}>
      {/* Header with Progress */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>
            Step {currentStep + 1} of {TOTAL_STEPS}
          </Text>
          <View style={{ width: 28 }} /> {/* Spacer for centering */}
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
        </View>
      </View>

      {/* Step Content */}
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

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
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
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleSubmit}
          >
            <Text style={styles.buttonPrimaryText}>Complete Onboarding</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.m,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  backButton: {
    padding: 4,
    marginLeft: -4, // alignment correction
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
    gap: SPACING.m,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.m,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
});
