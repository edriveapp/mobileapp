import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
    url: process.env.DATABASE_URL,
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
        connectionTimeoutMillis: 5_000,
    },
    logging: process.env.NODE_ENV !== 'production',
    autoLoadEntities: false,
}));
