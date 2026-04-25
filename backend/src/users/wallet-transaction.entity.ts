import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

export type WalletTransactionType =
    | 'wallet_funding'
    | 'driver_earning'
    | 'insurance_reserve'
    | 'passenger_payment'
    | 'remittance_due'
    | 'remittance_payment'
    | 'wallet_adjustment_credit'
    | 'wallet_adjustment_debit';

@Entity('wallet_transactions')
export class WalletTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    type: WalletTransactionType;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    amount: number;

    @Column({ nullable: true })
    direction: 'credit' | 'debit' | null;

    @Column({ type: 'text' })
    description: string;

    @Column({ nullable: true })
    rideId: string | null;

    @Column({ nullable: true })
    paymentReference: string | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any> | null;

    @CreateDateColumn()
    createdAt: Date;
}
