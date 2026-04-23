import { registerAs } from '@nestjs/config';

function resolveDatabaseUrl() {
    const internalUrl = process.env.DATABASE_URL;
    const publicUrl = process.env.DATABASE_PUBLIC_URL;
    const runningOnRailway = Boolean(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID);

    if (runningOnRailway) {
        return internalUrl || publicUrl;
    }

    return publicUrl || internalUrl;
}

export default registerAs('database', () => ({
    // Local machine cannot resolve *.railway.internal.
    // On Railway, prefer the internal DATABASE_URL.
    // Outside Railway, prefer DATABASE_PUBLIC_URL.
    url: resolveDatabaseUrl(),
    type: 'postgres' as const,
    // Never auto-sync schema in production — use migrations
    synchronize: false,
    // SSL required for Railway-managed Postgres
    ssl: {
        rejectUnauthorized: false,
    },
    // Connection pool tuning for Railway (adjust to your plan's connection limit)
    extra: {
        max: 10,           // Maximum pool size
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
    },
    logging: process.env.NODE_ENV !== 'production',
    autoLoadEntities: false,
}));
