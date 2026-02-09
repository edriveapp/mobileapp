// stores/driverStore.ts
import { create } from 'zustand';
import { DriverOnboardingData, OnboardingDocuments, VehicleData } from '../types';

interface DriverState {
  // Onboarding status
  hasCompletedOnboarding: boolean;
  status: 'pending' | 'approved' | 'rejected';

  // Onboarding data
  driverInfo: DriverOnboardingData;
  vehicleInfo: VehicleData;
  documents: OnboardingDocuments;

  // Actions
  setDriverInfo: (info: Partial<DriverOnboardingData>) => void;
  setVehicleInfo: (info: Partial<VehicleData>) => void;
  setDocuments: (docs: Partial<OnboardingDocuments>) => void;
  completeOnboarding: () => void;
  setStatus: (status: 'pending' | 'approved' | 'rejected') => void;
}

export const useDriverStore = create<DriverState>((set) => ({
  // Initial state
  hasCompletedOnboarding: false,
  status: 'pending',

  driverInfo: {
    fullName: '',
    phoneNumber: '',
    dateOfBirth: '',
    address: '',
    licenseNumber: '',
    licenseExpiry: '',
  },

  vehicleInfo: {
    type: '',
    make: '',
    model: '',
    year: '',
    plateNumber: '',
  },

  documents: {
    licenseImageUri: null,
    vehiclePhotos: [],
  },

  // Actions
  setDriverInfo: (info) =>
    set((state) => ({
      driverInfo: { ...state.driverInfo, ...info },
    })),

  setVehicleInfo: (info) =>
    set((state) => ({
      vehicleInfo: { ...state.vehicleInfo, ...info },
    })),

  setDocuments: (docs) =>
    set((state) => ({
      documents: { ...state.documents, ...docs },
    })),

  completeOnboarding: () =>
    set({ hasCompletedOnboarding: true }),

  setStatus: (status) => set({ status }),
}));
