import { registerAs } from '@nestjs/config';

// Railway injects REDIS_URL automatically when a Redis service is linked.
// RedisService handles the case where this is absent at startup.
export default registerAs('redis', () => ({
    url: process.env.REDIS_URL ?? null,
}));
