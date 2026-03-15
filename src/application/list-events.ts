/**
 * Use case: list events with their associated triage results.
 */
import type { EventStatus, IntakeEvent } from '../domain/models/event.js';
import type { EventStorePort } from '../domain/ports/event-store.port.js';
import type { TriageStorePort } from '../domain/ports/triage-store.port.js';
import type { TriageResult } from '../domain/models/triage-result.js';

export interface EventWithTriage extends IntakeEvent {
  triageResult?: TriageResult;
}

export class ListEvents {
  constructor(
    private eventStore: EventStorePort,
    private triageStore: TriageStorePort,
  ) {}

  async execute(status?: EventStatus): Promise<EventWithTriage[]> {
    const events = await this.eventStore.findAll(status);
    const results: EventWithTriage[] = [];

    for (const event of events) {
      const triageResult = await this.triageStore.findByEventId(event.id);
      results.push({ ...event, triageResult: triageResult ?? undefined });
    }

    return results;
  }

  async findById(id: string): Promise<EventWithTriage | null> {
    const event = await this.eventStore.findById(id);
    if (!event) return null;

    const triageResult = await this.triageStore.findByEventId(event.id);
    return { ...event, triageResult: triageResult ?? undefined };
  }
}
