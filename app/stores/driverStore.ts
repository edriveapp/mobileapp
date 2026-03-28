// stores/driverStore.ts
import { create } from 'zustand';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
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
  completeOnboarding: () => Promise<void>;
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
    nin: '',
    address: '',
    licenseNumber: '',
    licenseExpiry: '',
    guarantorName: '',
    guarantorPhone: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
  },

  vehicleInfo: {
    type: '',
    make: '',
    model: '',
    year: '',
    plateNumber: '',
    capacity: '',
  },

  documents: {
    licenseImageUri: null,
    insuranceImageUri: null,
    worthinessImageUri: null,
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

  completeOnboarding: async () => {
    const { driverInfo, vehicleInfo, documents } = useDriverStore.getState();

    const payload = {
      vehicleDetails: {
        type: vehicleInfo.type,
        make: vehicleInfo.make,
        model: vehicleInfo.model,
        year: vehicleInfo.year,
        plateNumber: vehicleInfo.plateNumber,
        capacity: vehicleInfo.capacity || '',
        insuranceDocumentUrl: documents.insuranceImageUri || '',
        worthinessCertificateUrl: documents.worthinessImageUri || '',
        vehiclePhotoUrls: documents.vehiclePhotos || [],
      },
      licenseDetails: {
        number: driverInfo.licenseNumber,
        expiryDate: driverInfo.licenseExpiry,
        documentUrl: documents.licenseImageUri || '',
      },
      onboardingMeta: {
        fullName: driverInfo.fullName,
        phoneNumber: driverInfo.phoneNumber,
        dateOfBirth: driverInfo.dateOfBirth,
        nin: driverInfo.nin,
        address: driverInfo.address,
        guarantorName: driverInfo.guarantorName,
        guarantorPhone: driverInfo.guarantorPhone,
        nextOfKinName: driverInfo.nextOfKinName,
        nextOfKinPhone: driverInfo.nextOfKinPhone,
      },
    };

    // Submit onboarding payload to existing backend route.
    await api.post('/users/driver-profile', payload);
    await useAuthStore.getState().refreshProfile();

    set({
      hasCompletedOnboarding: true,
      status: 'pending',
    });
  },

  setStatus: (status) => set({ status }),
}));
