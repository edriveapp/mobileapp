import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingsTable1744200000000 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "bookings_status_enum" AS ENUM ('confirmed', 'cancelled', 'completed')
        `);

        await queryRunner.query(`
            CREATE TABLE "bookings" (
                "id"              uuid                        NOT NULL DEFAULT uuid_generate_v4(),
                "rideId"          uuid                        NOT NULL,
                "passengerId"     uuid                        NOT NULL,
                "seatsBooked"     integer                     NOT NULL DEFAULT 1,
                "pickupLocation"  text,
                "paymentMethod"   character varying           DEFAULT 'cash',
                "paymentStatus"   character varying           DEFAULT 'pending',
                "fareCharged"     numeric(10,2),
                "paystackReference" character varying,
                "status"          "bookings_status_enum"      NOT NULL DEFAULT 'confirmed',
                "createdAt"       TIMESTAMP                   NOT NULL DEFAULT now(),
                "updatedAt"       TIMESTAMP                   NOT NULL DEFAULT now(),
                CONSTRAINT "PK_bookings" PRIMARY KEY ("id"),
                CONSTRAINT "FK_bookings_ride"
                    FOREIGN KEY ("rideId") REFERENCES "rides"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_bookings_passenger"
                    FOREIGN KEY ("passengerId") REFERENCES "users"("id")
            )
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP TYPE "bookings_status_enum"`);
    }
}
