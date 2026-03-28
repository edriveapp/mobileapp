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

    @Column()
    createdByUserId: string;

    @Column()
    createdByRole: string;

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

    @OneToMany(() => SupportMessage, (message) => message.ticket, { cascade: true })
    messages: SupportMessage[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
