import { Worker } from 'bullmq';
import type { ProcessTriage } from '../application/process-triage.js';

export function createTriageWorker(
  redisUrl: string,
  processTriage: ProcessTriage,
): Worker {
  const url = new URL(redisUrl);

  const worker = new Worker(
    'triage-jobs',
    async (job) => {
      const { eventId } = job.data as { eventId: string };
      console.log(`[worker] Processing triage for event ${eventId}`);

      const result = await processTriage.execute(eventId);
      console.log(`[worker] Triaged event ${eventId}: ${result.severity} ${result.issueType} — "${result.title}"`);
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
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[worker] Worker error:', err.message);
  });

  return worker;
}
