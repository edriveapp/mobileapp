import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Ride } from '../rides/ride.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
    imports: [TypeOrmModule.forFeature([User, Ride])],
    controllers: [AdminController],
    providers: [AdminService],
    exports: [AdminService],
})
export class AdminModule {}
