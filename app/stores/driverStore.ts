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
    selfieUri: null,
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
    const { uploadFile, uploadMultipleFiles } = require('../services/mediaService');

    // 1. Upload all documents to the backend
    console.log("Uploading documents...");
    
    let uploadedInsuranceUrl = documents.insuranceImageUri;
    if (documents.insuranceImageUri && !documents.insuranceImageUri.startsWith('http')) {
      uploadedInsuranceUrl = await uploadFile(documents.insuranceImageUri);
    }

    let uploadedWorthinessUrl = documents.worthinessImageUri;
    if (documents.worthinessImageUri && !documents.worthinessImageUri.startsWith('http')) {
      uploadedWorthinessUrl = await uploadFile(documents.worthinessImageUri);
    }

    let uploadedLicenseUrl = documents.licenseImageUri;
    if (documents.licenseImageUri && !documents.licenseImageUri.startsWith('http')) {
      uploadedLicenseUrl = await uploadFile(documents.licenseImageUri);
    }

    let uploadedSelfieUrl = documents.selfieUri;
    if (documents.selfieUri && !documents.selfieUri.startsWith('http')) {
      uploadedSelfieUrl = await uploadFile(documents.selfieUri);
    }

    let uploadedVehiclePhotos = documents.vehiclePhotos;
    const localPhotos = documents.vehiclePhotos.filter(p => !p.startsWith('http'));
    if (localPhotos.length > 0) {
      const newPhotoUrls = await uploadMultipleFiles(localPhotos);
      // Replace only local ones with uploaded ones
      uploadedVehiclePhotos = documents.vehiclePhotos.map(p => 
        p.startsWith('http') ? p : (newPhotoUrls.shift() || p)
      );
    }

    const payload = {
      vehicleDetails: {
        type: vehicleInfo.type,
        make: vehicleInfo.make,
        model: vehicleInfo.model,
        year: vehicleInfo.year,
        plateNumber: vehicleInfo.plateNumber,
        capacity: vehicleInfo.capacity || '',
        insuranceDocumentUrl: uploadedInsuranceUrl || '',
        worthinessCertificateUrl: uploadedWorthinessUrl || '',
        vehiclePhotoUrls: uploadedVehiclePhotos || [],
      },
      licenseDetails: {
        number: driverInfo.licenseNumber,
        expiryDate: driverInfo.licenseExpiry,
        documentUrl: uploadedLicenseUrl || '',
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

    // Persist selfie as the driver's profile photo
    if (uploadedSelfieUrl) {
        await api.patch('/users/me', { avatarUrl: uploadedSelfieUrl });
    }

    await useAuthStore.getState().refreshProfile();

    set({
      hasCompletedOnboarding: true,
      status: 'pending',
    });
  },

  setStatus: (status) => set({ status }),
}));
