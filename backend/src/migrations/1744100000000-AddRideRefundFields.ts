import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRideRefundFields1744100000000 implements MigrationInterface {
    name = 'AddRideRefundFields1744100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "paystackReference" VARCHAR`);
        await queryRunner.query(`ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "refundReference" VARCHAR`);
        await queryRunner.query(`ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "refundReason" VARCHAR`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rides" DROP COLUMN IF EXISTS "refundReason"`);
        await queryRunner.query(`ALTER TABLE "rides" DROP COLUMN IF EXISTS "refundReference"`);
        await queryRunner.query(`ALTER TABLE "rides" DROP COLUMN IF EXISTS "paystackReference"`);
    }
}
