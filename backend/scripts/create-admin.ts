import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const email = 'admin@edrive.com';
  const password = await bcrypt.hash('password123', 10);

  try {
    const admin = await usersService.create({
      email,
      password,
      firstName: 'eDrive',
      lastName: 'Admin',
      role: 'admin',
    });
    console.log('✅ Admin user created successfully:');
    console.log(`Email: ${email}`);
    console.log(`Password: password123`);
  } catch (error: any) {
    if (error.code === '23505') {
       console.log('⚠️ Admin already exists! Trying to update role...');
       const existing = await usersService.findByEmail(email);
       if (existing) {
         existing.role = 'admin';
         existing.password = password;
         await usersService.update(existing.id, existing);
         console.log('✅ Updated existing user to admin!');
         console.log(`Email: ${email}`);
         console.log(`Password: password123`);
       }
    } else {
       console.error('Failed to create admin:', error);
    }
  }

  await app.close();
}

bootstrap();
