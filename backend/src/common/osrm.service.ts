import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OSRMService {
    private osrmUrl: string;

    constructor(private configService: ConfigService) {
        this.osrmUrl = this.configService.get<string>('OSRM_URL') || 'http://localhost:5000';
    }

    async getRoute(start: { lat: number; lon: number }, end: { lat: number; lon: number }) {
        try {
            const startStr = `${start.lon},${start.lat}`;
            const endStr = `${end.lon},${end.lat}`;
            const url = `${this.osrmUrl}/route/v1/driving/${startStr};${endStr}?overview=full&geometries=geojson`;

            const response = await axios.get(url);
            if (response.data.code !== 'Ok') return null;

            const route = response.data.routes[0];
            return {
                distance: route.distance, // meters
                duration: route.duration, // seconds
                geometry: route.geometry,
            };
        } catch (error) {
            console.error('OSRM API Error', error.message);
            return null; // Fallback or throw
        }
    }
}
