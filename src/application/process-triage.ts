/**
 * Use case: process an event through the AI triage engine and persist the result.
 */
import type { EventStorePort } from '../domain/ports/event-store.port.js';
import type { TriageEnginePort } from '../domain/ports/triage-engine.port.js';
import type { TriageStorePort } from '../domain/ports/triage-store.port.js';
import type { TriageResult } from '../domain/models/triage-result.js';

export class ProcessTriage {
  constructor(
    private eventStore: EventStorePort,
    private triageEngine: TriageEnginePort,
    private triageStore: TriageStorePort,
  ) {}

  async execute(eventId: string): Promise<TriageResult> {
    const event = await this.eventStore.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const result = await this.triageEngine.triage(event);
    await this.triageStore.save(result);
    await this.eventStore.updateStatus(eventId, 'triaged');

    return result;
  }
}
