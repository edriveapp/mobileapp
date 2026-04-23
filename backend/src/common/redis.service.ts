import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const url = this.configService.get<string>('REDIS_URL');
        if (!url) {
            this.logger.warn('REDIS_URL is not set — Redis features will be unavailable');
            return;
        }

        this.client = new Redis(url, {
            // Retry up to 10 times with exponential back-off (max 3 s between retries)
            retryStrategy: (times: number) => {
                if (times > 10) return null; // Stop retrying
                return Math.min(times * 200, 3000);
            },
            enableReadyCheck: true,
            maxRetriesPerRequest: 3,
            lazyConnect: false,
        });

        this.client.on('error', (err) => this.logger.error('Redis error', err.message));
        this.client.on('connect', () => this.logger.log('Redis connected'));
        this.client.on('ready', () => this.logger.log('Redis ready'));
    }

    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit();
        }
    }

    async set(key: string, value: string, ttl?: number) {
        if (!this.client) return;
        if (ttl) {
            await this.client.set(key, value, 'EX', ttl);
        } else {
            await this.client.set(key, value);
        }
    }

    async get(key: string): Promise<string | null> {
        if (!this.client) return null;
        return this.client.get(key);
    }

    async setDriverLocation(driverId: string, lat: number, lon: number) {
        if (!this.client) return;
        // GEOADD key longitude latitude member
        await this.client.geoadd('drivers:locations', lon, lat, driverId);
    }

    async getNearbyDrivers(lat: number, lon: number, radiusKm: number): Promise<string[]> {
        if (!this.client) return [];
        // GEOSEARCH key FROMLONLAT lon lat BYRADIUS radius km ASC
        const results = await this.client.call(
            'GEOSEARCH',
            'drivers:locations',
            'FROMLONLAT',
            lon,
            lat,
            'BYRADIUS',
            radiusKm,
            'km',
            'ASC',
        ) as string[];
        return results;
    }

    async getJson<T>(key: string): Promise<T | null> {
        const raw = await this.get(key);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    }

    async setJson(key: string, value: unknown, ttl?: number) {
        await this.set(key, JSON.stringify(value), ttl);
    }

    async del(...keys: string[]) {
        if (!this.client || keys.length === 0) return;
        await this.client.del(...keys);
    }

    // Deletes all keys matching a glob pattern using SCAN (non-blocking).
    async delPattern(pattern: string) {
        if (!this.client) return;
        let cursor = '0';
        do {
            const [next, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = next;
            if (keys.length > 0) {
                await this.client.del(...keys);
            }
        } while (cursor !== '0');
    }
}
