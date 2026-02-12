import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverProfile } from './driver-profile.entity';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Module({
    imports: [TypeOrmModule.forFeature([User, DriverProfile])],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
