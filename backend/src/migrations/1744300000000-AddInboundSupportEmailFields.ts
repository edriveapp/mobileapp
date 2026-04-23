import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInboundSupportEmailFields1744300000000 implements MigrationInterface {
    name = 'AddInboundSupportEmailFields1744300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "createdByUserId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD COLUMN "createdByEmail" VARCHAR`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD COLUMN "inboundMessageId" VARCHAR`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD CONSTRAINT "UQ_support_tickets_inboundMessageId" UNIQUE ("inboundMessageId")`);

        await queryRunner.query(`ALTER TABLE "support_messages" ALTER COLUMN "senderId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "support_messages" ADD COLUMN "senderEmail" VARCHAR`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "support_messages" DROP COLUMN "senderEmail"`);
        await queryRunner.query(`ALTER TABLE "support_messages" ALTER COLUMN "senderId" SET NOT NULL`);

        await queryRunner.query(`ALTER TABLE "support_tickets" DROP CONSTRAINT "UQ_support_tickets_inboundMessageId"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "inboundMessageId"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "createdByEmail"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "createdByUserId" SET NOT NULL`);
    }
}
