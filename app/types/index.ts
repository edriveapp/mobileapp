export type UserRole = 'driver' | 'passenger';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phoneNumber: string;
  isVerified: boolean;
  avatarUrl?: string;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  verificationStatus?: 'unverified' | 'pending' | 'approved' | 'rejected';
  token?: string;
  carModel?: string;
  vehicleType?: string;
  plateNumber?: string;
}

export interface Trip {
  id: string;
  driverId: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  price: number;
  seats: number;
  availableSeats: number;
  riders: string[]; // riderIds
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  // New Fields
  vehicle?: string;
  preferences?: {
    ac: boolean;
    luggage: boolean;
    smoking: boolean;
  };
  autoAccept?: boolean;
  description?: string;
  notes?: string;
  fare?: number;
  seatFare?: number;
  driver?: {
    id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    rating?: number;
    image?: string;
    avatarUrl?: string;
    phone?: string;
    phoneNumber?: string;
    vehicle?: { model?: string; plate?: string };
    vehicleType?: string;
    plateNumber?: string;
  };
}

export interface DriverOnboardingData {
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
  licenseNumber: string;
  licenseExpiry: string;
  nin: string;
  guarantorName: string;
  guarantorPhone: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

export interface VehicleData {
  type: string; // sedan, SUV, van, etc.
  make: string;
  model: string;
  year: string;
  plateNumber: string;
  capacity?: string; // for buses
}

export interface OnboardingDocuments {
  selfieUri: string | null;       // driver face photo for KYC
  licenseImageUri: string | null;
  insuranceImageUri: string | null;
  vehiclePhotos: string[]; // array of image URIs
}
