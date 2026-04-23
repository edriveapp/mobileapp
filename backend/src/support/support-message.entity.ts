import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SupportTicket } from './support-ticket.entity';

@Entity('support_messages')
export class SupportMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    ticketId: string;

    @ManyToOne(() => SupportTicket, (ticket) => ticket.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ticketId' })
    ticket: SupportTicket;

    @Column({ nullable: true })
    senderId: string | null;

    @Column()
    senderRole: string;

    @Column({ nullable: true })
    senderEmail: string | null;

    @Column({ type: 'text' })
    text: string;

    @CreateDateColumn()
    createdAt: Date;
}
