import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: RedisClientType;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        this.client = createClient({
            url: this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
        });
        this.client.on('error', (err) => console.error('Redis Client Error', err));
        await this.client.connect();
    }

    async onModuleDestroy() {
        await this.client.disconnect();
    }

    async set(key: string, value: string, ttl?: number) {
        if (ttl) {
            await this.client.set(key, value, { EX: ttl });
        } else {
            await this.client.set(key, value);
        }
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async setDriverLocation(driverId: string, lat: number, lon: number) {
        // GEOADD key longitude latitude member
        await this.client.geoAdd('drivers:locations', {
            longitude: lon,
            latitude: lat,
            member: driverId,
        });
    }

    async getNearbyDrivers(lat: number, lon: number, radiusKm: number): Promise<string[]> {
        // GEORADIUS key longitude latitude radius m|km|ft|mi
        // geoSearch is newer
        const results = await this.client.geoSearch(
            'drivers:locations',
            { longitude: lon, latitude: lat },
            { radius: radiusKm, unit: 'km' }
        );
        return results; // returns array of driverIds
    }
}
