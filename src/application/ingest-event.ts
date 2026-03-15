/**
 * Use case: accept a raw event, persist it, and enqueue it for AI triage.
 */
import { createHash } from 'crypto';
import { v4 as uuid } from 'uuid';
import type { IntakeEvent, EventSourceType } from '../domain/models/event.js';
import type { EventStorePort } from '../domain/ports/event-store.port.js';
import type { TriageQueuePort } from '../domain/ports/triage-queue.port.js';

export interface IngestEventInput {
  sourceType: EventSourceType;
  project: string;
  environment?: string;
  message: string;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
  idempotencyKey?: string;
}

export class IngestEvent {
  constructor(
    private eventStore: EventStorePort,
    private triageQueue: TriageQueuePort,
  ) {}

  async execute(input: IngestEventInput): Promise<IntakeEvent> {
    // Idempotency: caller can supply a key, or we derive one from the payload
    // bucketed by hour. Prevents duplicate processing from network retries while
    // still accepting the same genuine error re-occurring in a later window.
    const hourBucket = input.timestamp
      ? input.timestamp.slice(0, 13)                    // "2026-03-14T12" from ISO
      : new Date().toISOString().slice(0, 13);

    const idempotencyKey = input.idempotencyKey
      ?? createHash('sha256')
          .update([input.sourceType, input.project, input.message, hourBucket].join('|'))
          .digest('hex')
          .slice(0, 32);

    const existing = await this.eventStore.findByIdempotencyKey(idempotencyKey);
    if (existing) return existing;

    const event: IntakeEvent = {
      id: uuid(),
      sourceType: input.sourceType,
      project: input.project,
      environment: input.environment ?? 'development',
      message: input.message,
      stackTrace: input.stackTrace,
      metadata: input.metadata,
      timestamp: input.timestamp ?? new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      status: 'pending',
      idempotencyKey,
    };

    await this.eventStore.save(event);
    await this.triageQueue.enqueue(event.id);

    return event;
  }
}
