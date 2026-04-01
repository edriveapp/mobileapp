import { Ride, RideStatus } from './ride.entity';

export type TrendingAreaItem = {
    name: string;
    rides: number;
    rides24h: number;
    rides7d: number;
    growthRate: number;
    trendScore: number;
};

type AreaBucket = {
    rides: number;
    rides24h: number;
    rides7d: number;
    previous7d: number;
    trendScore: number;
};

const IGNORED_REGIONS = new Set([
    'nigeria',
    'ng',
    'ghana',
    'kenya',
    'united states',
    'usa',
    'uk',
]);

const statusWeight = (status: RideStatus | string) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === RideStatus.COMPLETED) return 1.8;
    if (normalized === RideStatus.IN_PROGRESS) return 1.5;
    if (normalized === RideStatus.ARRIVED) return 1.35;
    if (normalized === RideStatus.ACCEPTED) return 1.25;
    if (normalized === RideStatus.SEARCHING) return 1.15;
    if (normalized === RideStatus.CANCELLED) return 0.6;
    return 1;
};

const recencyMultiplier = (time: Date, now: number) => {
    const ageHours = (now - new Date(time).getTime()) / (1000 * 60 * 60);
    if (ageHours <= 24) return 1.6;
    if (ageHours <= 72) return 1.25;
    if (ageHours <= 24 * 7) return 1;
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

export const extractAreaName = (input: any): string => {
    if (!input) return 'Unknown';

    if (typeof input === 'object' && typeof input.address === 'string') {
        return extractAreaName(input.address);
    }

    if (typeof input !== 'string') return 'Unknown';

    const parts = input
        .split(',')
        .map((part) => cleanSegment(part))
        .filter(Boolean);

    if (!parts.length) return 'Unknown';

    // Prefer the last meaningful locality segment before country/state labels.
    const reverseCandidates = [...parts].reverse();
    for (const candidate of reverseCandidates) {
        const normalized = candidate.toLowerCase();
        if (!normalized || IGNORED_REGIONS.has(normalized)) continue;
        if (normalized.endsWith('state')) continue;
        if (normalized.length < 2) continue;
        return titleCase(candidate);
    }

    return titleCase(parts[0]);
};

export const buildTrendingAreas = (rides: Ride[], limit = 8): TrendingAreaItem[] => {
    const buckets = new Map<string, AreaBucket>();
    const now = Date.now();
    const h24 = now - 24 * 60 * 60 * 1000;
    const d7 = now - 7 * 24 * 60 * 60 * 1000;
    const d14 = now - 14 * 24 * 60 * 60 * 1000;

    rides.forEach((ride) => {
        const area = extractAreaName((ride.destination as any)?.address ?? ride.destination);
        if (!area || area === 'Unknown') return;

        const bucket = buckets.get(area) || {
            rides: 0,
            rides24h: 0,
            rides7d: 0,
            previous7d: 0,
            trendScore: 0,
        };

        const rideTime = new Date(ride.updatedAt || ride.createdAt).getTime();
        const weight = statusWeight(ride.status) * recencyMultiplier(ride.updatedAt || ride.createdAt, now);

        bucket.rides += 1;
        bucket.trendScore += weight;
        if (rideTime >= h24) bucket.rides24h += 1;
        if (rideTime >= d7) bucket.rides7d += 1;
        if (rideTime < d7 && rideTime >= d14) bucket.previous7d += 1;

        buckets.set(area, bucket);
    });

    return Array.from(buckets.entries())
        .map(([name, bucket]) => {
            const growthRate =
                bucket.previous7d > 0
                    ? ((bucket.rides7d - bucket.previous7d) / bucket.previous7d) * 100
                    : bucket.rides7d > 0
                      ? 100
                      : 0;

            return {
                name,
                rides: bucket.rides,
                rides24h: bucket.rides24h,
                rides7d: bucket.rides7d,
                growthRate: Number(growthRate.toFixed(1)),
                trendScore: Number(bucket.trendScore.toFixed(2)),
            };
        })
        .sort((a, b) => b.trendScore - a.trendScore || b.rides7d - a.rides7d || b.rides24h - a.rides24h)
        .slice(0, limit);
};
