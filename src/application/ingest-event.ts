/**
 * Use case: accept a raw event, persist it, and enqueue it for AI triage.
 */
import { createHash } from 'crypto';
import { v4 as uuid } from 'uuid';
import type { IntakeEvent, EventSourceType } from '../domain/models/event.js';
import type { EventStorePort } from '../domain/ports/event-store.port.js';
import type { TriageQueuePort } from '../domain/ports/triage-queue.port.js';
import { buildFingerprint } from '../domain/fingerprint.js';

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
    // Idempotency: caller can supply a key, or we derive one from the payload.
    // This prevents duplicate *business events*, distinct from fingerprinting
    // which groups recurring *failure types*.
    const idempotencyKey = input.idempotencyKey
      ?? createHash('sha256')
          .update([input.sourceType, input.project, input.message, input.timestamp ?? ''].join('|'))
          .digest('hex')
          .slice(0, 32);

    const existing = await this.eventStore.findByIdempotencyKey(idempotencyKey);
    if (existing) return existing;

    const stage = input.metadata?.stage as string | undefined;

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
      fingerprint: buildFingerprint({
        project: input.project,
        sourceType: input.sourceType,
        message: input.message,
        stage,
      }),
      idempotencyKey,
    };

    await this.eventStore.save(event);
    await this.triageQueue.enqueue(event.id);

    return event;
  }
}
