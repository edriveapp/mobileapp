import { Ride, RideStatus } from './ride.entity';

export type TrendingAreaItem = {
    name: string;
    rides: number;
    rides24h: number;
    rides7d: number;
    growthRate: number;
    trendScore: number;
    uniqueUsers: number;
};

type NormalizedLocation = {
    city: string;
    state: string;
    country: string;
    raw: string;
};

type AreaBucket = {
    rides: number;
    rides24h: number; // Exclusive 0-24h
    rides7d: number;  // Exclusive 24h-7d
    previous7d: number; // 7d-14d
    userIds: Set<string>;
    statusTotalWeight: number;
    penalty: number;
};

const REGION_PENALTY_MAP: Record<string, number> = {
    'nigeria': 0.7,
    'ng': 0.7,
    'ghana': 0.7,
    'kenya': 0.7,
    'united states': 0.7,
    'usa': 0.7,
    'uk': 0.7,
    'unknown': 0.1,
};

const statusWeight = (status: RideStatus | string) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === RideStatus.COMPLETED) return 1.8;
    if (normalized === RideStatus.IN_PROGRESS) return 1.5;
    if (normalized === RideStatus.ARRIVED) return 1.35;
    if (normalized === RideStatus.ACCEPTED) return 1.25;
    if (normalized === RideStatus.SEARCHING) return 1.15;
    if (normalized === RideStatus.CANCELLED) return 0.6;
    return 1.0;
};

const recencyMultiplier = (time: Date, now: number) => {
    const ageHours = (now - new Date(time).getTime()) / (1000 * 60 * 60);
    if (ageHours <= 24) return 1.6;
    if (ageHours <= 72) return 1.25;
    if (ageHours <= 24 * 7) return 1.0;
    return 0.7;
};

const cleanSegment = (value: string) =>
    value
        .replace(/\d+/g, '')
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s-]/g, '')
        .trim();

const titleCase = (value: string) =>
    value
        .toLowerCase()
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

/**
 * Standardizes location data into a structured format.
 * Handles strings, Geo objects {lat, lng}, and address objects.
 */
export const normalizeLocation = (input: any): NormalizedLocation => {
    const result: NormalizedLocation = { city: '', state: '', country: '', raw: '' };

    if (!input) return result;

    if (typeof input === 'object') {
        if (typeof input.address === 'string') {
            result.raw = input.address;
        } else if (input.lat && (input.lon || input.lng || input.longitude)) {
            result.raw = `${input.lat},${input.lon || input.lng || input.longitude}`;
        } else {
            result.raw = JSON.stringify(input);
        }
    } else {
        result.raw = String(input);
    }

    const parts = result.raw
        .split(',')
        .map((p) => cleanSegment(p))
        .filter(Boolean);

    if (!parts.length) return result;

    // Simple mapping from end of string (Country -> State -> City)
    const rev = [...parts].reverse();
    if (rev.length >= 1) result.country = rev[0];
    if (rev.length >= 2) result.state = rev[1];
    if (rev.length >= 3) result.city = rev[2];

    // Heuristic: If only one part exists and it's a known country/region, 
    // mark it as country rather than city.
    if (parts.length === 1) {
        const lower = parts[0].toLowerCase();
        if (REGION_PENALTY_MAP[lower]) {
            result.country = parts[0];
            result.city = '';
        }
    }

    return result;
};

export const extractAreaName = (normalized: NormalizedLocation): string => {
    if (normalized.city) return titleCase(normalized.city);
    if (normalized.state) return titleCase(normalized.state);
    if (normalized.country) return titleCase(normalized.country);
    return 'Unknown';
};

const getAreaPenalty = (normalized: NormalizedLocation): number => {
    let penalty = 1.0;
    const countryNorm = normalized.country.toLowerCase();
    const stateNorm = normalized.state.toLowerCase();

    if (REGION_PENALTY_MAP[countryNorm]) penalty *= REGION_PENALTY_MAP[countryNorm];
    if (REGION_PENALTY_MAP[stateNorm]) penalty *= REGION_PENALTY_MAP[stateNorm];
    
    // Downrank if we only have high-level geographical signals (no city/state)
    if (!normalized.city && !normalized.state && normalized.country) {
        penalty *= 0.6;
    }
    
    return penalty;
};

/**
 * Builds trending area metrics with popularity vs momentum scoring.
 * Prevents time-window double counting and applies growth rate clamping.
 */
export const buildTrendingAreas = (rides: Ride[], limit = 8): TrendingAreaItem[] => {
    const buckets = new Map<string, AreaBucket>();
    const now = Date.now();
    
    // Exclusive time windows
    const h24 = now - 24 * 60 * 60 * 1000;
    const d7 = now - 7 * 24 * 60 * 60 * 1000;
    const d14 = now - 14 * 24 * 60 * 60 * 1000;

    rides.forEach((ride) => {
        const normalized = normalizeLocation(ride.destination);
        const area = extractAreaName(normalized);
        if (area === 'Unknown') return;

        let bucket = buckets.get(area);
        if (!bucket) {
            bucket = {
                rides: 0,
                rides24h: 0,
                rides7d: 0,
                previous7d: 0,
                userIds: new Set(),
                statusTotalWeight: 0,
                penalty: getAreaPenalty(normalized),
            };
            buckets.set(area, bucket);
        }

        const rideTime = new Date(ride.updatedAt || ride.createdAt).getTime();
        
        bucket.rides += 1;
        if (ride.passengerId) {
            bucket.userIds.add(ride.passengerId);
        }

        // Momentum signal: Status weight * Recency
        bucket.statusTotalWeight += statusWeight(ride.status) * recencyMultiplier(ride.updatedAt || ride.createdAt, now);

        // Exclusive bucket assignment to prevent double counting influence
        if (rideTime >= h24) {
            bucket.rides24h += 1;
        } else if (rideTime >= d7) {
            bucket.rides7d += 1;
        } else if (rideTime >= d14) {
            bucket.previous7d += 1;
        }
    });

    return Array.from(buckets.entries())
        .map(([name, bucket]) => {
            const rides7dTotal = bucket.rides7d + bucket.rides24h;
            
            // Growth rate calculation with protection against division by zero
            const growthRate =
                bucket.previous7d > 0
                    ? ((rides7dTotal - bucket.previous7d) / bucket.previous7d) * 100
                    : rides7dTotal > 0
                      ? 100
                      : 0;

            // Clamp growth to prevent outliers from dominating
            const clampedGrowth = Math.min(growthRate, 300);
            const uniqueUsersCount = bucket.userIds.size;

            /**
             * Final Scoring Model:
             * Popularity (50%): 7d volume + Unique user diversity
             * Momentum (40%): 24h spike + Clamped growth (log scaled)
             * Quality (10%): Status-weighted ride value
             */
            const popularity = (rides7dTotal * 0.5) + (uniqueUsersCount * 0.8);
            const momentum = (bucket.rides24h * 1.2) + (Math.log1p(Math.max(0, clampedGrowth)) * 0.4);
            const quality = bucket.statusTotalWeight * 0.2;

            const trendScore = (popularity + momentum + quality) * bucket.penalty;

            return {
                name,
                rides: bucket.rides,
                rides24h: bucket.rides24h,
                rides7d: rides7dTotal,
                growthRate: Number(growthRate.toFixed(1)),
                trendScore: Number(trendScore.toFixed(2)),
                uniqueUsers: uniqueUsersCount,
            };
        })
        .sort((a, b) => b.trendScore - a.trendScore || b.rides7d - a.rides7d || b.rides24h - a.rides24h)
        .slice(0, limit);
};
