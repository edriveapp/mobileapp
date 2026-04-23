import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SupportMessage } from './support-message.entity';

export enum SupportTicketStatus {
    OPEN = 'open',
    IN_PROGRESS = 'in_progress',
    RESOLVED = 'resolved',
}

@Entity('support_tickets')
export class SupportTicket {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    createdByUserId: string | null;

    @Column()
    createdByRole: string;

    @Column({ nullable: true })
    createdByEmail: string | null;

    @Column()
    subject: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ nullable: true })
    category: string;

    @Column({ nullable: true })
    priority: string;

    @Column({
        type: 'enum',
        enum: SupportTicketStatus,
        default: SupportTicketStatus.OPEN,
    })
    status: SupportTicketStatus;

    @Column({ nullable: true })
    assignedToUserId: string | null;

    @Column({ nullable: true, unique: true })
    inboundMessageId: string | null;

    @OneToMany(() => SupportMessage, (message) => message.ticket, { cascade: true })
    messages: SupportMessage[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
