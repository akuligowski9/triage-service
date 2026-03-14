import type { EventStorePort } from '../domain/ports/event-store.port.js';
import type { IssueTrackerPort } from '../domain/ports/issue-tracker.port.js';
import type { PostgresTriageStore } from '../adapters/outbound/postgres/triage-store.adapter.js';

export class ApproveIssue {
  constructor(
    private eventStore: EventStorePort,
    private triageStore: PostgresTriageStore,
    private issueTracker: IssueTrackerPort,
    private targetRepo: string,
  ) {}

  async execute(eventId: string): Promise<{ url: string; number: number }> {
    const event = await this.eventStore.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.status !== 'triaged') {
      throw new Error(`Cannot approve event with status "${event.status}". Must be "triaged".`);
    }

    const triageResult = await this.triageStore.findByEventId(eventId);
    if (!triageResult) {
      throw new Error('Triage result not found');
    }

    const result = await this.issueTracker.createIssue({
      title: triageResult.title,
      body: triageResult.body,
      labels: triageResult.labels,
      repository: this.targetRepo,
    });

    await this.eventStore.updateStatus(eventId, 'sent');

    return result;
  }
}
