/**
 * Use case: approve a triaged event and create a GitHub issue from it.
 */
import type { EventStorePort } from '../domain/ports/event-store.port.js';
import type { IssueTrackerPort } from '../domain/ports/issue-tracker.port.js';
import type { TriageStorePort } from '../domain/ports/triage-store.port.js';

export class ApproveIssue {
  constructor(
    private eventStore: EventStorePort,
    private triageStore: TriageStorePort,
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

    // Build rich issue body from structured triage output
    const sections: string[] = [triageResult.body];

    if (triageResult.reproductionSteps?.length) {
      sections.push(`\n## Steps to Reproduce\n${triageResult.reproductionSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    }

    if (triageResult.acceptanceCriteria?.length) {
      sections.push(`\n## Acceptance Criteria\n${triageResult.acceptanceCriteria.map(c => `- [ ] ${c}`).join('\n')}`);
    }

    if (event.stackTrace) {
      sections.push(`\n## Stack Trace\n\`\`\`\n${event.stackTrace}\n\`\`\``);
    }

    try {
      const result = await this.issueTracker.createIssue({
        title: triageResult.title,
        body: sections.join('\n'),
        labels: triageResult.labels,
        repository: this.targetRepo,
      });

      await this.eventStore.updateStatus(eventId, 'sent');
      await this.eventStore.setIssueUrl(eventId, result.url);

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error creating GitHub issue';
      await this.eventStore.setError(eventId, message);
      throw err;
    }
  }
}
