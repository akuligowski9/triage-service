import { Worker } from 'bullmq';
import type { ProcessTriage } from '../application/process-triage.js';
import logger from '../logger.js';

export function createTriageWorker(
  redisUrl: string,
  processTriage: ProcessTriage,
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

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err: err.message }, 'worker error');
  });

  return worker;
}
