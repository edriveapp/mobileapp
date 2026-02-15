import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS so your mobile app isn't blocked by security headers
    app.enableCors();

    // 0.0.0.0 tells the server to accept connections from any IP on your network
    await app.listen(3000, '0.0.0.0');

    console.log(`Application is running on: ${await app.getUrl()}`);
    // Trigger restart
}
bootstrap();