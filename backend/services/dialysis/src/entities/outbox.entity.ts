import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Transactional outbox: written in the same transaction as the state change,
// published asynchronously by OutboxRelay.
@Entity({ schema: 'dialysis', name: 'outbox' })
@Index(['publishedAt', 'createdAt'])
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string;

  @Column()
  aggregateId: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
