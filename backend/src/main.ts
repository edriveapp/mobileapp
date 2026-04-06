import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    // rawBody: true lets us verify Paystack webhook HMAC signatures
    const app = await NestFactory.create(AppModule, { rawBody: true });

    // Enable CORS so your mobile app isn't blocked by security headers
    app.enableCors();

    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');

    console.log(`Application is running on: ${await app.getUrl()}`);
    // Trigger restart
}
bootstrap();