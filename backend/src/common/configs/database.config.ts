import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
    // Use Railway's internal DATABASE_URL at runtime.
    // DATABASE_PUBLIC_URL is only for local CLI and local development fallbacks.
    url: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
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
