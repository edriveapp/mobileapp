import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDriverPayoutAndSupportEnhancements1745500000000 implements MigrationInterface {
    name = 'AddDriverPayoutAndSupportEnhancements1745500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "support_messages"
            ADD COLUMN IF NOT EXISTS "html" TEXT,
            ADD COLUMN IF NOT EXISTS "contentType" VARCHAR,
            ADD COLUMN IF NOT EXISTS "isInboundEmail" BOOLEAN NOT NULL DEFAULT false
        `);

        await queryRunner.query(`
            ALTER TABLE "rides"
            ADD COLUMN IF NOT EXISTS "paymentReference" VARCHAR,
            ADD COLUMN IF NOT EXISTS "platformCutPercent" NUMERIC(5,2),
            ADD COLUMN IF NOT EXISTS "platformCutAmount" NUMERIC(10,2),
            ADD COLUMN IF NOT EXISTS "insuranceReservePercent" NUMERIC(5,2),
            ADD COLUMN IF NOT EXISTS "insuranceReserveAmount" NUMERIC(10,2),
            ADD COLUMN IF NOT EXISTS "driverNetEarnings" NUMERIC(10,2),
            ADD COLUMN IF NOT EXISTS "estimatedDurationMinutes" INTEGER,
            ADD COLUMN IF NOT EXISTS "payoutStatus" VARCHAR
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "wallet_transactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "type" character varying NOT NULL,
                "amount" numeric(12,2) NOT NULL DEFAULT '0',
                "direction" character varying,
                "description" text NOT NULL,
                "rideId" character varying,
                "paymentReference" character varying,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_wallet_transactions" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "wallet_transactions"
            ADD CONSTRAINT "FK_wallet_transactions_user"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP CONSTRAINT IF EXISTS "FK_wallet_transactions_user"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "wallet_transactions"`);

        await queryRunner.query(`
            ALTER TABLE "rides"
            DROP COLUMN IF EXISTS "payoutStatus",
            DROP COLUMN IF EXISTS "estimatedDurationMinutes",
            DROP COLUMN IF EXISTS "driverNetEarnings",
            DROP COLUMN IF EXISTS "insuranceReserveAmount",
            DROP COLUMN IF EXISTS "insuranceReservePercent",
            DROP COLUMN IF EXISTS "platformCutAmount",
            DROP COLUMN IF EXISTS "platformCutPercent",
            DROP COLUMN IF EXISTS "paymentReference"
        `);

        await queryRunner.query(`
            ALTER TABLE "support_messages"
            DROP COLUMN IF EXISTS "isInboundEmail",
            DROP COLUMN IF EXISTS "contentType",
            DROP COLUMN IF EXISTS "html"
        `);
    }
}
