import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * InitialSchema1744000000000
 *
 * Creates all tables from scratch for a fresh Railway Postgres deployment.
 * Enums are created first so columns can reference them.
 * Tables follow dependency order (parents before children).
 *
 * Up   → creates everything
 * Down → drops everything in reverse order (safe for rollback in staging)
 */
export class InitialSchema1744000000000 implements MigrationInterface {
    name = 'InitialSchema1744000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ─── Enums ────────────────────────────────────────────────────────────

        await queryRunner.query(`
            CREATE TYPE "public"."users_role_enum" AS ENUM ('passenger', 'driver', 'admin')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."users_adminscope_enum" AS ENUM ('none', 'super_admin', 'verification', 'support', 'operations')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."users_verificationstatus_enum" AS ENUM ('unverified', 'pending', 'approved', 'rejected')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."rides_status_enum" AS ENUM ('searching', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."support_tickets_status_enum" AS ENUM ('open', 'in_progress', 'resolved')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."driver_warnings_level_enum" AS ENUM ('minor', 'major', 'final')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."notification_campaigns_repeat_enum" AS ENUM ('once', 'daily', 'weekly', 'weekdays', 'weekends')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."notification_campaigns_status_enum" AS ENUM ('active', 'paused', 'expired')
        `);

        // (PostGIS removed — using Redis for geospatial features)

        // ─── users ────────────────────────────────────────────────────────────

        await queryRunner.query(`
            CREATE TABLE "users" (
                "id"                   UUID                NOT NULL DEFAULT uuid_generate_v4(),
                "email"                VARCHAR             NOT NULL,
                "phone"                VARCHAR,
                "passwordHash"         VARCHAR,
                "role"                 "public"."users_role_enum" NOT NULL DEFAULT 'passenger',
                "adminScope"           "public"."users_adminscope_enum" NOT NULL DEFAULT 'none',
                "rating"               DOUBLE PRECISION    NOT NULL DEFAULT 5,
                "verificationStatus"   "public"."users_verificationstatus_enum" NOT NULL DEFAULT 'unverified',
                "balance"              NUMERIC(12,2)       NOT NULL DEFAULT 0,
                "pendingRemittance"    NUMERIC(12,2)       NOT NULL DEFAULT 0,
                "firstName"            VARCHAR,
                "lastName"             VARCHAR,
                "avatarUrl"            VARCHAR,
                "preferences"          JSONB DEFAULT '{"pushNotifications": true, "emailNotifications": true, "biometricLogin": false}',
                "expoPushTokens"       JSONB NOT NULL DEFAULT '[]',
                "isRestricted"         BOOLEAN NOT NULL DEFAULT false,
                "createdAt"            TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt"            TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "PK_users" PRIMARY KEY ("id")
            )
        `);

        // ─── driver_profiles ──────────────────────────────────────────────────

        await queryRunner.query(`
            CREATE TABLE "driver_profiles" (
                "id"              UUID    NOT NULL DEFAULT uuid_generate_v4(),
                "userId"          UUID    NOT NULL,
                "vehicleDetails"  JSONB,
                "licenseDetails"  JSONB,
                "onboardingMeta"  JSONB,
                "isVerified"      BOOLEAN NOT NULL DEFAULT false,
                "lastLocation"    JSONB,
                "isOnline"        BOOLEAN NOT NULL DEFAULT false,
                CONSTRAINT "PK_driver_profiles" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_driver_profiles_userId" UNIQUE ("userId"),
                CONSTRAINT "FK_driver_profiles_user"
                    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        // (Removed geospatial index)

        // ─── saved_places ─────────────────────────────────────────────────────

        await queryRunner.query(`
            CREATE TABLE "saved_places" (
                "id"        UUID    NOT NULL DEFAULT uuid_generate_v4(),
                "userId"    UUID    NOT NULL,
                "label"     VARCHAR NOT NULL,
                "address"   VARCHAR NOT NULL,
                "lat"       DOUBLE PRECISION NOT NULL,
                "lon"       DOUBLE PRECISION NOT NULL,
                "icon"      VARCHAR NOT NULL DEFAULT 'location-outline',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_saved_places" PRIMARY KEY ("id"),
                CONSTRAINT "FK_saved_places_user"
                    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // ─── rides ────────────────────────────────────────────────────────────

        await queryRunner.query(`
            CREATE TABLE "rides" (
                "id"               UUID    NOT NULL DEFAULT uuid_generate_v4(),
                "passengerId"      UUID,
                "driverId"         UUID,
                "origin"           TEXT    NOT NULL,
                "destination"      TEXT    NOT NULL,
                "status"           "public"."rides_status_enum" NOT NULL DEFAULT 'searching',
                "fare"             NUMERIC(10,2),
                "distanceKm"       INTEGER DEFAULT 0,
                "tripFare"         NUMERIC(10,2),
                "pickupLocation"   TEXT,
                "seats"            INTEGER NOT NULL DEFAULT 1,
                "availableSeats"   INTEGER NOT NULL DEFAULT 1,
                "tier"             VARCHAR,
                "notes"            TEXT,
                "preferences"      TEXT,
                "autoAccept"       BOOLEAN NOT NULL DEFAULT false,
                "paymentMethod"    VARCHAR,
                "paymentStatus"    VARCHAR,
                "pricingScenario"  VARCHAR,
                "pricingBreakdown" TEXT,
                "driverEarnings"   NUMERIC(10,2),
                "platformCut"      NUMERIC(10,2),
                "departureTime"    TIMESTAMP,
                "createdAt"        TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt"        TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_rides" PRIMARY KEY ("id"),
                CONSTRAINT "FK_rides_passenger"
                    FOREIGN KEY ("passengerId") REFERENCES "users"("id"),
                CONSTRAINT "FK_rides_driver"
                    FOREIGN KEY ("driverId") REFERENCES "users"("id")
            )
        `);

        // ─── messages ─────────────────────────────────────────────────────────

        await queryRunner.query(`
            CREATE TABLE "messages" (
                "id"         UUID    NOT NULL DEFAULT uuid_generate_v4(),
                "text"       VARCHAR NOT NULL,
                "rideId"     UUID    NOT NULL,
                "senderId"   UUID    NOT NULL,
                "senderName" VARCHAR,
                "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_messages" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "messages"
            ADD CONSTRAINT "FK_messages_sender"
            FOREIGN KEY ("senderId") REFERENCES "users"("id")
        `);

        // ─── ratings ──────────────────────────────────────────────────────────

        await queryRunner.query(`
            CREATE TABLE "ratings" (
                "id"        UUID    NOT NULL DEFAULT uuid_generate_v4(),
                "rideId"    UUID    NOT NULL,
                "raterId"   UUID    NOT NULL,
                "rateeId"   UUID    NOT NULL,
                "value"     INTEGER NOT NULL,
                "comment"   TEXT,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ratings" PRIMARY KEY ("id"),
                CONSTRAINT "FK_ratings_ride"
                    FOREIGN KEY ("rideId") REFERENCES "rides"("id"),
                CONSTRAINT "FK_ratings_rater"
                    FOREIGN KEY ("raterId") REFERENCES "users"("id"),
                CONSTRAINT "FK_ratings_ratee"
                    FOREIGN KEY ("rateeId") REFERENCES "users"("id")
            )
        `);

        // ─── support_tickets ──────────────────────────────────────────────────

        await queryRunner.query(`
            CREATE TABLE "support_tickets" (
                "id"               UUID    NOT NULL DEFAULT uuid_generate_v4(),
                "createdByUserId"  UUID    NOT NULL,
                "createdByRole"    VARCHAR NOT NULL,
                "subject"          VARCHAR NOT NULL,
                "description"      TEXT    NOT NULL,
                "category"         VARCHAR,
                "priority"         VARCHAR,
                "status"           "public"."support_tickets_status_enum" NOT NULL DEFAULT 'open',
                "assignedToUserId" UUID,
                "createdAt"        TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt"        TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_support_tickets" PRIMARY KEY ("id")
            )
        `);

        // ─── support_messages ─────────────────────────────────────────────────

        await queryRunner.query(`
            CREATE TABLE "support_messages" (
                "id"         UUID    NOT NULL DEFAULT uuid_generate_v4(),
                "ticketId"   UUID    NOT NULL,
                "senderId"   UUID    NOT NULL,
                "senderRole" VARCHAR NOT NULL,
                "text"       TEXT    NOT NULL,
                "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_support_messages" PRIMARY KEY ("id"),
                CONSTRAINT "FK_support_messages_ticket"
                    FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE
            )
        `);

        // ─── driver_warnings ──────────────────────────────────────────────────

        await queryRunner.query(`
            CREATE TABLE "driver_warnings" (
                "id"          UUID    NOT NULL DEFAULT uuid_generate_v4(),
                "driverId"    UUID    NOT NULL,
                "issuedById"  UUID    NOT NULL,
                "level"       "public"."driver_warnings_level_enum" NOT NULL DEFAULT 'minor',
                "reason"      TEXT    NOT NULL,
                "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_driver_warnings" PRIMARY KEY ("id"),
                CONSTRAINT "FK_driver_warnings_driver"
                    FOREIGN KEY ("driverId") REFERENCES "users"("id"),
                CONSTRAINT "FK_driver_warnings_issuer"
                    FOREIGN KEY ("issuedById") REFERENCES "users"("id")
            )
        `);

        // ─── notification_campaigns ───────────────────────────────────────────

        await queryRunner.query(`
            CREATE TABLE "notification_campaigns" (
                "id"          UUID    NOT NULL DEFAULT uuid_generate_v4(),
                "title"       VARCHAR NOT NULL,
                "body"        TEXT    NOT NULL,
                "repeat"      "public"."notification_campaigns_repeat_enum" NOT NULL DEFAULT 'once',
                "dayOfWeek"   INTEGER,
                "sendTime"    VARCHAR NOT NULL DEFAULT '09:00',
                "status"      "public"."notification_campaigns_status_enum" NOT NULL DEFAULT 'active',
                "lastSentAt"  TIMESTAMP,
                "nextSendAt"  TIMESTAMP,
                "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_notification_campaigns" PRIMARY KEY ("id")
            )
        `);

        // ─── migrations tracking table (TypeORM creates this automatically) ───
        // No action needed — TypeORM creates "typeorm_migrations" itself.
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "notification_campaigns"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "driver_warnings"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "support_messages"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "support_tickets"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ratings"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "rides"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "saved_places"`);
        // (Removed geospatial index drop)
        await queryRunner.query(`DROP TABLE IF EXISTS "driver_profiles"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."notification_campaigns_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."notification_campaigns_repeat_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."driver_warnings_level_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."support_tickets_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."rides_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_verificationstatus_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_adminscope_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
    }
}
