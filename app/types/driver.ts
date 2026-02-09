export type DriverStatus = 'pending' | 'approved' | 'rejected';

export interface DriverProfile {
  licenseNumber: string;
  licenseExpiry: string;
  status: DriverStatus;
}
