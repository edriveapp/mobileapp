// Validation utilities for driver onboarding

export const validatePhoneNumber = (phone: string): boolean => {
    // Nigerian phone number format: starts with 0 or +234, followed by 10 or 13 digits
    const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validateLicenseNumber = (license: string): boolean => {
    // Basic validation: should not be empty and have minimum length
    return license.trim().length >= 5;
};

export const validateNIN = (nin: string): boolean => {
    // Exactly 11 digits
    return /^\d{11}$/.test(nin.trim());
};

export const validateDate = (date: string): boolean => {
    // Basic date validation (format: YYYY-MM-DD or DD/MM/YYYY)
    if (!date) return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/;
    return dateRegex.test(date);
};

export const validateFutureDate = (date: string): boolean => {
    if (!validateDate(date)) return false;

    // Convert to Date object
    let dateObj: Date;
    if (date.includes('-')) {
        dateObj = new Date(date);
    } else {
        const [day, month, year] = date.split('/');
        dateObj = new Date(`${year}-${month}-${day}`);
    }

    return dateObj > new Date();
};

export const validateRequired = (value: string): boolean => {
    return value.trim().length > 0;
};

export const validateYear = (year: string): boolean => {
    const yearNum = parseInt(year, 10);
    const currentYear = new Date().getFullYear();
    return yearNum >= 1900 && yearNum <= currentYear + 1;
};

export const validateDriverInfoStep = (driverInfo: {
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
}, selfieUri?: string | null): boolean => {
    return (
        !!selfieUri &&
        validateRequired(driverInfo.fullName) &&
        validatePhoneNumber(driverInfo.phoneNumber) &&
        validateDate(driverInfo.dateOfBirth) &&
        validateRequired(driverInfo.address) &&
        validateLicenseNumber(driverInfo.licenseNumber) &&
        validateFutureDate(driverInfo.licenseExpiry) &&
        validateNIN(driverInfo.nin) &&
        validateRequired(driverInfo.guarantorName) &&
        validatePhoneNumber(driverInfo.guarantorPhone) &&
        validateRequired(driverInfo.nextOfKinName) &&
        validatePhoneNumber(driverInfo.nextOfKinPhone)
    );
};

export const validateVehicleStep = (vehicleInfo: {
    type: string;
    make: string;
    model: string;
    year: string;
    plateNumber: string;
    capacity?: string;
}, documents: {
    licenseImageUri: string | null;
    insuranceImageUri: string | null;
    worthinessImageUri: string | null;
    vehiclePhotos: string[];
}): boolean => {
    const isBus = ['Van', 'Minibus', 'Coaster Bus'].includes(vehicleInfo.type);
    return (
        validateRequired(vehicleInfo.type) &&
        validateRequired(vehicleInfo.make) &&
        validateRequired(vehicleInfo.model) &&
        validateYear(vehicleInfo.year) &&
        validateRequired(vehicleInfo.plateNumber) &&
        (!isBus || validateRequired(vehicleInfo.capacity || '')) &&
        documents.licenseImageUri !== null &&
        documents.insuranceImageUri !== null &&
        documents.worthinessImageUri !== null &&
        documents.vehiclePhotos.length > 0
    );
};
