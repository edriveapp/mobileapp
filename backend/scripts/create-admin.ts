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

  try {
    const existingUser = await usersService.findOneByEmail(email);
    if (existingUser) {
      console.log(`⚠️ User with email ${email} already exists. Updating to Admin...`);
      await usersService.updatePassword(existingUser.id, password);
      await usersService.setAdmin(existingUser.id, UserRole.ADMIN, AdminScope.SUPER_ADMIN);
      console.log('✅ Admin user updated successfully.');
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
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
    }
  } catch (error: any) {
    console.error('❌ Failed to process admin user:', error);
  }

  await app.close();
}

bootstrap();
