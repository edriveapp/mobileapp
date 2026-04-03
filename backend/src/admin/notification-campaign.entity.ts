import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum CampaignRepeat {
    ONCE = 'once',
    DAILY = 'daily',
    WEEKLY = 'weekly',
    WEEKDAYS = 'weekdays',
    WEEKENDS = 'weekends',
}

export enum CampaignStatus {
    ACTIVE = 'active',
    PAUSED = 'paused',
    EXPIRED = 'expired',
}

@Entity('notification_campaigns')
export class NotificationCampaign {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ type: 'text' })
    body: string;

    @Column({ type: 'enum', enum: CampaignRepeat, default: CampaignRepeat.ONCE })
    repeat: CampaignRepeat;

    /** Which day of week (0=Sun..6=Sat) — only relevant for WEEKLY */
    @Column({ nullable: true, type: 'int' })
    dayOfWeek: number | null;

    /** HH:MM in 24h for the scheduled time */
    @Column({ default: '09:00' })
    sendTime: string;

    @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.ACTIVE })
    status: CampaignStatus;

    @Column({ nullable: true, type: 'timestamp' })
    lastSentAt: Date | null;

    @Column({ nullable: true, type: 'timestamp' })
    nextSendAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
