export type UserRole = 'driver' | 'rider';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phoneNumber: string;
  isVerified: boolean;
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
}

export interface DriverOnboardingData {
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
  licenseNumber: string;
  licenseExpiry: string;
}

export interface VehicleData {
  type: string; // sedan, SUV, van, etc.
  make: string;
  model: string;
  year: string;
  plateNumber: string;
}

export interface OnboardingDocuments {
  licenseImageUri: string | null;
  vehiclePhotos: string[]; // array of image URIs
}
