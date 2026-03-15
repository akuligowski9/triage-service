/**
 * Use case: accept a raw event, persist it, and enqueue it for AI triage.
 */
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
}

export class IngestEvent {
  constructor(
    private eventStore: EventStorePort,
    private triageQueue: TriageQueuePort,
  ) {}

  async execute(input: IngestEventInput): Promise<IntakeEvent> {
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
    };

    await this.eventStore.save(event);
    await this.triageQueue.enqueue(event.id);

    return event;
  }
}
