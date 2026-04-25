import 'dotenv/config'; // loads .env when running locally
import { DataSource } from 'typeorm';

import { Message } from './chat/message.entity';
import { Rating } from './ratings/rating.entity';
import { Booking } from './rides/booking.entity';
import { Ride } from './rides/ride.entity';
import { SupportMessage } from './support/support-message.entity';
import { SupportTicket } from './support/support-ticket.entity';
import { DriverProfile } from './users/driver-profile.entity';
import { SavedPlace } from './users/saved-place.entity';
import { User } from './users/user.entity';
import { WalletTransaction } from './users/wallet-transaction.entity';
import { DriverWarning } from './admin/driver-warning.entity';
import { NotificationCampaign } from './admin/notification-campaign.entity';

export const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },

    // Source (ts-node) — used when generating migrations locally
    entities: [
        User,
        WalletTransaction,
        DriverProfile,
        Ride,
        Booking,
        Message,
        Rating,
        SavedPlace,
        SupportTicket,
        SupportMessage,
        DriverWarning,
        NotificationCampaign,
    ],

    // Migrations — CLI reads from compiled JS in dist/
    migrations: ['dist/migrations/*.js'],
    migrationsTableName: 'typeorm_migrations',

    synchronize: false,
    logging: true,
});
