export type RideMode = 'solo' | 'shared';

export const roundFare = (value: number, min = 500) => {
  if (!Number.isFinite(value) || value <= 0) return min;
  return Math.max(min, Math.round(value / 50) * 50);
};

export const estimatePrivateTripFare = (distanceKm: number) => {
  if (!distanceKm || distanceKm <= 0) return 0;
  const runningCost = distanceKm * 285;
  const setupCost = 12000;
  const returnCover = distanceKm * 28;
  const driverPay = distanceKm * 22;
  const subtotal = runningCost + setupCost + returnCover + driverPay;
  return roundFare(subtotal * 1.16);
};

export const getRiderOfferFloor = (estimatedPrivatePrice: number, rideMode: RideMode) => {
  if (!estimatedPrivatePrice || estimatedPrivatePrice <= 0) {
    return rideMode === 'solo' ? 3000 : 1200;
  }

  if (rideMode === 'solo') {
    return roundFare(estimatedPrivatePrice * 0.82, 2500);
  }

  return roundFare(estimatedPrivatePrice / 4.8, 1200);
};

export const getDriverSeatFloor = (tripTotalFare: number, seatsCount: number) => {
  if (!tripTotalFare || tripTotalFare <= 0 || !seatsCount) return 0;
  const protectedRevenue = tripTotalFare * 0.86;
  return roundFare(protectedRevenue / Math.max(seatsCount, 1), 500);
};
