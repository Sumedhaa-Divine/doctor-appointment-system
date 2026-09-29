import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { Queue } from 'bull';
import { DataSource } from 'typeorm';
import { OutboxEvent } from '../entities/outbox.entity';

export const DIALYSIS_EVENTS_QUEUE = 'dialysis-events';

/**
 * Publishes committed outbox rows to the event bus (Bull/Redis today; swap for Kafka later
 * without touching the domain code). Delivery is at-least-once, so consumers de-duplicate
 * on eventId / idempotencyKey.
 */
@Injectable()
export class OutboxRelay {
  private readonly logger = new Logger(OutboxRelay.name);
  private running = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectQueue(DIALYSIS_EVENTS_QUEUE) private readonly queue: Queue,
  ) {}

  @Interval(1000)
  async relay() {
    if (this.running) return;
    this.running = true;
    try {
      await this.dataSource.transaction(async (em) => {
        // SKIP LOCKED lets several replicas relay concurrently without double-publishing a batch
        const batch: OutboxEvent[] = await em
          .createQueryBuilder(OutboxEvent, 'o')
          .where('o.publishedAt IS NULL')
          .orderBy('o.createdAt', 'ASC')
          .limit(100)
          .setLock('pessimistic_write')
          .setOnLocked('skip_locked')
          .getMany();

        for (const evt of batch) {
          try {
            await this.queue.add(evt.type, evt.payload, { jobId: evt.id, attempts: 5, backoff: 2000 });
            evt.publishedAt = new Date();
          } catch (err) {
            evt.attempts += 1;
            this.logger.warn(`Publish failed for ${evt.id}: ${(err as Error).message}`);
          }
          await em.save(evt);
        }
      });
    } finally {
      this.running = false;
    }
  }
}
