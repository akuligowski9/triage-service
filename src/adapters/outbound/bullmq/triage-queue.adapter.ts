/**
 * BullMQ adapter for enqueuing triage jobs into Redis.
 */
import { Queue } from 'bullmq';
import type { TriageQueuePort } from '../../../domain/ports/triage-queue.port.js';

export class BullMQTriageQueue implements TriageQueuePort {
  private queue: Queue;

  constructor(redisUrl: string) {
    const url = new URL(redisUrl);
    this.queue = new Queue('triage-jobs', {
      connection: {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }

  async enqueue(eventId: string): Promise<void> {
    await this.queue.add('triage', { eventId });
  }
}
