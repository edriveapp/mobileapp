import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { AdminScope, UserRole } from '../src/users/user.entity';
import { UsersService } from '../src/users/users.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const email = process.env.ADMIN_EMAIL || 'admin@edrive.com';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error('❌ ADMIN_PASSWORD environment variable is required');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const admin = await usersService.create({
      email,
      passwordHash,
      firstName: 'eDrive',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      adminScope: AdminScope.SUPER_ADMIN,
    });
    console.log('✅ Admin user created successfully:');
    console.log(`Email: ${admin.email}`);
  } catch (error: any) {
    if (error.code === '23505') {
       console.log('⚠️ Admin already exists.');
    } else {
       console.error('Failed to create admin:', error);
    }
  }

  await app.close();
}

bootstrap();
