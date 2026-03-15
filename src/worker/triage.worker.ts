/**
 * BullMQ worker that processes triage jobs from the Redis queue.
 * Each job invokes the ProcessTriage use case for a single event.
 */
import { Worker } from 'bullmq';
import type { ProcessTriage } from '../application/process-triage.js';
import type { EventStorePort } from '../domain/ports/event-store.port.js';
import logger from '../logger.js';

export function createTriageWorker(
  redisUrl: string,
  processTriage: ProcessTriage,
  eventStore: EventStorePort,
): Worker {
  const url = new URL(redisUrl);

  const worker = new Worker(
    'triage-jobs',
    async (job) => {
      const { eventId } = job.data as { eventId: string };
      logger.info({ eventId }, 'processing triage for event');

      const result = await processTriage.execute(eventId);
      logger.info(
        { eventId, severity: result.severity, issueType: result.issueType, title: result.title },
        'triage complete',
      );
    },
    {
      connection: {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
      },
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 60_000,
      },
    },
  );

  worker.on('failed', async (job, err) => {
    const eventId = job?.data?.eventId;
    const attemptsUsed = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts?.attempts ?? 3;

    logger.error({ jobId: job?.id, eventId, attempt: attemptsUsed, err: err.message }, 'job failed');

    // Set event to failed after final retry
    if (eventId && attemptsUsed >= maxAttempts) {
      await eventStore.setError(eventId, `Triage failed after ${attemptsUsed} attempts: ${err.message}`);
      logger.warn({ eventId }, 'event marked as failed after all retries exhausted');
    }
  });

  worker.on('error', (err) => {
    logger.error({ err: err.message }, 'worker error');
  });

  return worker;
}
