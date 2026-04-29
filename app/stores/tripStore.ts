import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import api from "../services/api";
import { Trip } from "../types";
import { useAuthStore } from "./authStore";

// --- 1. Types & Interfaces ---

export type RideStatus =
  | "IDLE"
  | "SEARCHING"
  | "ACCEPTED"
  | "ARRIVING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface RideRequest {
  origin: { lat: number; lon: number; address: string };
  destination: { lat: number; lon: number; address: string };
  tier: "Lite" | "Comfort" | "Van";
  price: number;
  tripFare?: number;
  distanceKm?: number;
  departureTime?: string; // ISO string
  notes?: string;
  preferences?: {
    shared?: boolean;
  };
}

export interface DriverLocation {
  id: string;
  userId?: string;
  name?: string;
  vehicle?: string;
  plateNumber?: string;
  coords: { latitude: number; longitude: number };
  heading: number;
}

const toAddressObject = (value: any) => {
  if (value && typeof value === "object") {
    return {
      lat: Number(value.lat ?? 0),
      lon: Number(value.lon ?? 0),
      address: String(value.address ?? ""),
    };
  }
  return {
    lat: 0,
    lon: 0,
    address: String(value ?? ""),
  };
};

const toNumber = (value: any) => {
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getId = (ride: any) => String(ride?.id ?? ride?._id ?? "");

const mapStatus = (status: string): RideStatus => {
  switch (String(status).toLowerCase()) {
    case "searching":
      return "SEARCHING";
    case "accepted":
      return "ACCEPTED";
    case "arrived":
      return "ARRIVING";
    case "in_progress":
    case "in progress":
      return "IN_PROGRESS";
    case "completed":
      return "COMPLETED";
    case "cancelled":
    case "canceled":
      return "CANCELLED";
    default:
      return "IDLE";
  }
};

const safeRequest = async <T>(fn: () => Promise<T>, retries = 2): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      return safeRequest(fn, retries - 1);
    }
    throw error;
  }
};

const normalizeTrip = (ride: any) => {
  const origin = toAddressObject(ride.origin);
  const destination = toAddressObject(ride.destination);
  const departure = ride.departureTime ? new Date(ride.departureTime) : null;

  return {
    ...ride,
    origin,
    destination,
    price: toNumber(ride.price ?? ride.fare),
    fare: toNumber(ride.fare ?? ride.price),
    seats:
      typeof ride.seats === "number" ? ride.seats : toNumber(ride.seats ?? 1),
    availableSeats:
      typeof ride.availableSeats === "number"
        ? ride.availableSeats
        : toNumber(ride.availableSeats ?? ride.seats ?? 1),
    date: ride.date ?? (departure ? departure.toLocaleDateString() : ""),
    time:
      ride.time ??
      (departure
        ? departure.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : ""),
  };
};

const normalizeDriverLocation = (driver: any): DriverLocation | null => {
  const coordinates = driver?.currentLocation?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  const fullName = [driver?.user?.firstName, driver?.user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id: driver?.user?.id || driver?.id,
    userId: driver?.user?.id || driver?.id,
    name: fullName || driver?.user?.name || driver?.user?.email || "Driver",
    vehicle: driver?.vehicleDetails?.model || "",
    plateNumber: driver?.vehicleDetails?.plateNumber || "",
    coords: {
      latitude,
      longitude,
    },
    heading: Number(driver?.heading ?? 0),
  };
};

interface TripState {
  // Lists
  trips: Trip[];
  availableTrips: Trip[];
  trendingTrips: Trip[]; // <--- Added for JoinRideView
  activeTrips: any[];
  history: any[];
  activeDrivers: DriverLocation[];

  // Active Ride State (Passenger)
  currentRide: any | null;
  rideStatus: RideStatus;

  // UI States
  isLoading: boolean;
  isFetchingTrips: boolean;
  isFetchingMyTrips: boolean;
  isMutatingRide: boolean;
  error: string | null;

  // Actions
  fetchTrips: (filters?: any) => Promise<void>;
  fetchAvailableTrips: (filters?: any) => Promise<void>;
  fetchMyTrips: () => Promise<void>;
  fetchNearbyDrivers: (lat: number, lon: number) => Promise<void>;

  // Ride Actions
  requestRide: (request: RideRequest) => Promise<void>;
  cancelRide: (rideId?: string) => Promise<void>;
  acceptRide: (rideId: string) => Promise<any>;
  bookTrip: (rideId: string, payload: any) => Promise<any>;
  postTrip: (tripData: any) => Promise<void>;
  createTrip: (tripData: any) => Promise<void>;
  updateTrip: (rideId: string, tripData: any) => Promise<any>;
  updateRideRequest: (rideId: string, requestData: any) => Promise<any>;
  updateTripStatus: (rideId: string, status: string) => Promise<any>;
  submitRating: (
    rideId: string,
    raterId: string,
    rateeId: string,
    value: number,
    comment: string,
  ) => Promise<void>;
  prependAvailableRide: (ride: any) => void;
  applySocketRideUpdate: (ride: any) => void;

  // State Setters (called by SocketService)
  updateRideStatus: (status: RideStatus, data?: any) => void;
}

// --- 2. Store Implementation ---

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      // Initial State
      trips: [],
      availableTrips: [],
      trendingTrips: [], // <--- Initialized
      activeTrips: [],
      history: [],
      activeDrivers: [],
      currentRide: null,
      rideStatus: "IDLE",
      isLoading: false,
      isFetchingTrips: false,
      isFetchingMyTrips: false,
      isMutatingRide: false,
      error: null,

      // --- Fetch Actions ---

      fetchTrips: async (filters) => {
        await get().fetchAvailableTrips({ role: "rider", ...(filters || {}) });
      },

      fetchAvailableTrips: async (filters) => {
        set({ isFetchingTrips: true, isLoading: true, error: null });
        try {
          const response = await safeRequest(() =>
            api.get("/rides/available", {
              params: filters,
            }),
          );
          const normalized = Array.isArray(response.data)
            ? response.data.map(normalizeTrip)
            : [];
          // Only update trendingTrips for rider-context fetches so driver-mode
          // calls don't overwrite the driver-route list shown in JoinRideView.
          const isRiderFetch = !filters?.role || filters?.role === "rider";
          set({
            availableTrips: normalized,
            trips: normalized,
            ...(isRiderFetch ? { trendingTrips: normalized.slice(0, 8) } : {}),
          });
        } catch (error: any) {
          console.error("Fetch Available Trips Error:", error);
          set({ error: error.message || "Failed to load trips" });
        } finally {
          set((state) => ({
            isFetchingTrips: false,
            isLoading:
              state.isMutatingRide || state.isFetchingTrips || state.isFetchingMyTrips,
          }));
        }
      },

      fetchMyTrips: async () => {
        if (get().isFetchingMyTrips) return;

        const token = useAuthStore.getState().token;
        if (!token) {
          set({
            activeTrips: [],
            history: [],
            currentRide: null,
            rideStatus: "IDLE",
            isLoading: false,
            isFetchingTrips: false,
            isFetchingMyTrips: false,
          });
          return;
        }

        set({ isFetchingMyTrips: true, isLoading: true, error: null });
        try {
          const response = await safeRequest(() => api.get("/rides/my-rides", { timeout: 8000 }));
          const active = Array.isArray(response.data.active)
            ? response.data.active.map(normalizeTrip)
            : [];
          const history = Array.isArray(response.data.history)
            ? response.data.history.map(normalizeTrip)
            : [];

          set({
            activeTrips: active,
            history,
          });

          const ongoingRide = active.find((r: any) =>
            ["searching", "accepted", "arrived", "in_progress"].includes(
              String(r.status).toLowerCase(),
            ),
          );

          if (ongoingRide) {
            set({
              currentRide: ongoingRide,
              rideStatus: mapStatus(ongoingRide.status),
            });
          } else {
            set({
              currentRide: null,
              rideStatus: "IDLE",
            });
          }
        } catch (error: any) {
          if (error?.response?.status === 401) {
            set({
              activeTrips: [],
              history: [],
              currentRide: null,
              rideStatus: "IDLE",
            });
            return;
          }
          // Suppress timeout/network noise from background polling
          if (
            error?.code !== "ECONNABORTED" &&
            !String(error?.message).includes("timeout")
          ) {
            console.error(
              "Fetch My Trips Error:",
              error?.message || "Unknown error",
            );
          }
        } finally {
          set((state) => ({
            isFetchingMyTrips: false,
            isLoading:
              state.isMutatingRide || state.isFetchingTrips || state.isFetchingMyTrips,
          }));
        }
      },

      fetchNearbyDrivers: async (lat, lon) => {
        try {
          const response = await safeRequest(() =>
            api.get("/users/drivers/nearby", {
              params: { lat, lon },
            }),
          );
          const normalized = Array.isArray(response.data)
            ? (response.data
                .map(normalizeDriverLocation)
                .filter(Boolean) as DriverLocation[])
            : [];
          set({ activeDrivers: normalized });
        } catch (error) {
          console.log("Error fetching drivers:", error);
        }
      },

      // --- Ride Flow Actions ---

      requestRide: async (request) => {
        set({
          isMutatingRide: true,
          isLoading: true,
          error: null,
          rideStatus: "SEARCHING",
        });
        try {
          await safeRequest(() => api.post("/rides/request", request));
          await get().fetchMyTrips();
        } catch (error: any) {
          set({
            rideStatus: "IDLE",
            currentRide: null,
            error: error.response?.data?.message || error.message,
          });
          throw error;
        } finally {
          set((state) => ({
            isMutatingRide: false,
            isLoading:
              state.isFetchingTrips || state.isFetchingMyTrips || state.isMutatingRide,
          }));
        }
      },

      cancelRide: async (rideId) => {
        const idToCancel = rideId || getId(get().currentRide);
        if (!idToCancel) return;

        set({
          isMutatingRide: true,
          isLoading: true,
          error: null,
          rideStatus: "IDLE",
        });
        try {
          await safeRequest(() => api.patch(`/rides/${idToCancel}/cancel`));
          await get().fetchMyTrips();
        } catch (error: any) {
          set({ error: error.message });
          console.error("Cancel Ride Error:", error);
        } finally {
          set((state) => ({
            isMutatingRide: false,
            isLoading:
              state.isFetchingTrips || state.isFetchingMyTrips || state.isMutatingRide,
          }));
        }
      },

      acceptRide: async (rideId) => {
        set({ isMutatingRide: true, isLoading: true, error: null });
        try {
          let response;
          try {
            response = await safeRequest(() => api.patch(`/rides/${rideId}/accept`));
          } catch (error: any) {
            const message = String(error?.message || "").toLowerCase();
            const status = Number(error?.response?.status || 0);

            if (status === 404 || message.includes("can't patch")) {
              response = await safeRequest(() => api.post(`/rides/${rideId}/accept`));
            } else {
              throw error;
            }
          }
          await get().fetchAvailableTrips({ role: "driver" });
          await get().fetchMyTrips();
          return response.data;
        } catch (error: any) {
          set({ error: error.response?.data?.message || error.message });
          throw error;
        } finally {
          set((state) => ({
            isMutatingRide: false,
            isLoading:
              state.isFetchingTrips || state.isFetchingMyTrips || state.isMutatingRide,
          }));
        }
      },

      bookTrip: async (rideId, payload) => {
        set({
          isMutatingRide: true,
          isLoading: true,
          error: null,
          rideStatus: "ACCEPTED",
        });
        try {
          let response;
          try {
            response = await safeRequest(() => api.post(`/rides/${rideId}/book`, payload));
          } catch (error: any) {
            const message = String(error?.message || "").toLowerCase();
            const status = Number(error?.response?.status || 0);

            if (status === 404 || message.includes("can't post")) {
              try {
                response = await safeRequest(() =>
                  api.post(`/rides/book/${rideId}`, payload),
                );
              } catch {
                response = await safeRequest(() =>
                  api.patch(`/rides/${rideId}/book`, payload),
                );
              }
            } else {
              throw error;
            }
          }
          await get().fetchTrips({ role: "rider" });
          await get().fetchMyTrips();
          return normalizeTrip(response.data);
        } catch (error: any) {
          set({ error: error.response?.data?.message || error.message });
          throw error;
        } finally {
          set((state) => ({
            isMutatingRide: false,
            isLoading:
              state.isFetchingTrips || state.isFetchingMyTrips || state.isMutatingRide,
          }));
        }
      },

      postTrip: async (tripData) => {
        set({ isMutatingRide: true, isLoading: true, error: null });
        try {
          await safeRequest(() => api.post("/rides/publish", tripData));
          await get().fetchMyTrips();
        } catch (error: any) {
          set({ error: error.message });
          throw error;
        } finally {
          set((state) => ({
            isMutatingRide: false,
            isLoading:
              state.isFetchingTrips || state.isFetchingMyTrips || state.isMutatingRide,
          }));
        }
      },

      createTrip: async (tripData) => {
        await get().postTrip(tripData);
      },

      updateTrip: async (rideId, tripData) => {
        set({ isMutatingRide: true, isLoading: true, error: null });
        try {
          const response = await safeRequest(() => api.patch(`/rides/${rideId}`, tripData));
          await get().fetchMyTrips();
          await get().fetchAvailableTrips({ role: "rider" });
          return response.data;
        } catch (error: any) {
          set({ error: error.response?.data?.message || error.message });
          throw error;
        } finally {
          set((state) => ({
            isMutatingRide: false,
            isLoading:
              state.isFetchingTrips || state.isFetchingMyTrips || state.isMutatingRide,
          }));
        }
      },

      updateRideRequest: async (rideId, requestData) => {
        set({
          isMutatingRide: true,
          isLoading: true,
          error: null,
          rideStatus: "SEARCHING",
        });
        try {
          const response = await safeRequest(() =>
            api.patch(`/rides/${rideId}/request`, requestData),
          );
          await get().fetchMyTrips();
          return normalizeTrip(response.data);
        } catch (error: any) {
          set({ error: error.response?.data?.message || error.message });
          throw error;
        } finally {
          set((state) => ({
            isMutatingRide: false,
            isLoading:
              state.isFetchingTrips || state.isFetchingMyTrips || state.isMutatingRide,
          }));
        }
      },

      updateTripStatus: async (rideId, status) => {
        set({ isMutatingRide: true, isLoading: true, error: null });
        try {
          const response = await safeRequest(() =>
            api.patch(`/rides/${rideId}/status`, { status }, { timeout: 12000 }),
          );
          // Refetch in the background — don't block the status update on these
          get()
            .fetchMyTrips()
            .catch(() => {});
          get()
            .fetchAvailableTrips({ role: "driver" })
            .catch(() => {});
          return response.data;
        } catch (error: any) {
          const msg = error.response?.data?.message || error.message;
          set({ error: msg });
          throw new Error(msg);
        } finally {
          set((state) => ({
            isMutatingRide: false,
            isLoading:
              state.isFetchingTrips || state.isFetchingMyTrips || state.isMutatingRide,
          }));
        }
      },

      submitRating: async (rideId, raterId, rateeId, value, comment) => {
        set({ isMutatingRide: true, isLoading: true, error: null });
        try {
          await safeRequest(() =>
            api.post("/ratings", {
              rideId,
              raterId,
              rateeId,
              value,
              comment,
            }),
          );
        } catch (error) {
          console.log("Rating Error:", error);
          throw error;
        } finally {
          set((state) => ({
            isMutatingRide: false,
            isLoading:
              state.isFetchingTrips || state.isFetchingMyTrips || state.isMutatingRide,
          }));
        }
      },

      applySocketRideUpdate: (ride) => {
        const normalized = normalizeTrip(ride);
        const id = getId(normalized);
        set((state) => {
          const currentId = getId(state.currentRide);
          const isActiveUpdate = [
            "searching",
            "accepted",
            "arrived",
            "in_progress",
          ].includes(String(normalized.status).toLowerCase());

          const updatedCurrentRide = currentId === id
            ? normalized
            : !state.currentRide && isActiveUpdate
            ? normalized
            : state.currentRide;

          const updateList = (list: any[]) =>
            list.map((item) => (getId(item) === id ? normalized : item));

          return {
            currentRide: updatedCurrentRide,
            rideStatus: mapStatus(normalized.status),
            activeTrips: updateList(state.activeTrips),
            history: updateList(state.history),
            availableTrips: updateList(state.availableTrips),
            trips: updateList(state.trips),
            trendingTrips: updateList(state.trendingTrips),
          };
        });
      },

      updateRideStatus: (status, data) => {
        set((state) => {
          const normalized = data ? normalizeTrip(data) : undefined;
          const currentId = getId(state.currentRide);
          const incomingId = normalized ? getId(normalized) : "";

          if (!state.currentRide) {
            return {
              currentRide: normalized || null,
              rideStatus: mapStatus(status),
            };
          }

          if (normalized && incomingId && currentId !== incomingId) {
            return state;
          }

          return {
            currentRide: normalized
              ? { ...state.currentRide, ...normalized }
              : state.currentRide,
            rideStatus: mapStatus(status),
          };
        });
      },

      prependAvailableRide: (ride) => {
        const normalized = normalizeTrip(ride);
        const id = getId(normalized);
        set((state) => {
          const existing = state.availableTrips.filter(
            (item: any) => getId(item) !== id,
          );
          return {
            availableTrips: [normalized, ...existing],
            trips: [
              normalized,
              ...state.trips.filter((item: any) => getId(item) !== id),
            ],
            trendingTrips: [
              normalized,
              ...state.trendingTrips.filter((item: any) => getId(item) !== id),
            ].slice(0, 8),
          };
        });
      },
    }),
    {
      name: "trip-store",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist cached lists — live ride state is always re-derived on app open
      partialize: (state) => ({
        trendingTrips: state.trendingTrips,
      }),
    },
  ),
);
