import { describe, it, expect, vi } from 'vitest';
import { ApproveIssue } from '../../src/application/approve-issue.js';
import type { EventStorePort } from '../../src/domain/ports/event-store.port.js';
import type { IssueTrackerPort } from '../../src/domain/ports/issue-tracker.port.js';
import type { IntakeEvent } from '../../src/domain/models/event.js';
import type { TriageResult } from '../../src/domain/models/triage-result.js';

const triagedEvent: IntakeEvent = {
  id: 'evt-456',
  sourceType: 'application_error',
  project: 'project-bridge',
  environment: 'development',
  message: 'Something broke',
  timestamp: '2026-03-14T00:00:00Z',
  receivedAt: '2026-03-14T00:00:01Z',
  status: 'triaged',
};

const mockTriageResult: TriageResult = {
  eventId: 'evt-456',
  issueType: 'bug',
  severity: 'high',
  title: 'Fix broken thing',
  body: 'Details here',
  labels: ['bug'],
  confidence: 0.9,
  triagedAt: '2026-03-14T00:00:02Z',
};

describe('ApproveIssue', () => {
  it('creates issue and updates event status to sent', async () => {
    const eventStore: EventStorePort = {
      save: vi.fn(),
      findById: vi.fn().mockResolvedValue(triagedEvent),
      findAll: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    };
    const triageStore = {
      save: vi.fn(),
      findByEventId: vi.fn().mockResolvedValue(mockTriageResult),
    };
    const issueTracker: IssueTrackerPort = {
      createIssue: vi.fn().mockResolvedValue({ url: 'https://github.com/test/issues/1', number: 1 }),
    };

    const useCase = new ApproveIssue(eventStore, triageStore, issueTracker, 'owner/repo');
    const result = await useCase.execute('evt-456');

    expect(result.url).toBe('https://github.com/test/issues/1');
    expect(result.number).toBe(1);
    expect(issueTracker.createIssue).toHaveBeenCalledWith({
      title: 'Fix broken thing',
      body: 'Details here',
      labels: ['bug'],
      repository: 'owner/repo',
    });
    expect(eventStore.updateStatus).toHaveBeenCalledWith('evt-456', 'sent');
  });

  it('rejects non-triaged events', async () => {
    const pendingEvent = { ...triagedEvent, status: 'pending' as const };
    const eventStore: EventStorePort = {
      save: vi.fn(),
      findById: vi.fn().mockResolvedValue(pendingEvent),
      findAll: vi.fn(),
      updateStatus: vi.fn(),
    };
    const triageStore = { save: vi.fn(), findByEventId: vi.fn() };
    const issueTracker: IssueTrackerPort = { createIssue: vi.fn() };

    const useCase = new ApproveIssue(eventStore, triageStore, issueTracker, 'owner/repo');

    await expect(useCase.execute('evt-456')).rejects.toThrow('Cannot approve');
  });

  it('throws if event not found', async () => {
    const eventStore: EventStorePort = {
      save: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      findAll: vi.fn(),
      updateStatus: vi.fn(),
    };
    const triageStore = { save: vi.fn(), findByEventId: vi.fn() };
    const issueTracker: IssueTrackerPort = { createIssue: vi.fn() };

    const useCase = new ApproveIssue(eventStore, triageStore, issueTracker, 'owner/repo');

    await expect(useCase.execute('nonexistent')).rejects.toThrow('Event not found');
  });
});
