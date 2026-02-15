import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('saved_places')
export class SavedPlace {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: string;

    @Column()
    label: string; // "Home", "Work", or custom

    @Column()
    address: string;

    @Column({ type: 'float' })
    lat: number;

    @Column({ type: 'float' })
    lon: number;

    @Column({ default: 'location-outline' })
    icon: string; // Ionicons name

    @CreateDateColumn()
    createdAt: Date;
}
