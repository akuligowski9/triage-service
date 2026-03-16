import { describe, it, expect, vi } from 'vitest';
import { ProcessTriage } from '../../src/application/process-triage.js';
import type { EventStorePort } from '../../src/domain/ports/event-store.port.js';
import type { TriageEnginePort } from '../../src/domain/ports/triage-engine.port.js';
import type { TriageStorePort } from '../../src/domain/ports/triage-store.port.js';
import type { IntakeEvent } from '../../src/domain/models/event.js';
import type { TriageResult } from '../../src/domain/models/triage-result.js';

const mockEvent: IntakeEvent = {
  id: 'evt-123',
  sourceType: 'application_error',
  project: 'project-bridge',
  environment: 'development',
  message: 'GitHub analyzer failed',
  timestamp: '2026-03-14T00:00:00Z',
  receivedAt: '2026-03-14T00:00:01Z',
  status: 'pending',
  idempotencyKey: 'idem-123',
};

const mockTriageResult: TriageResult = {
  eventId: 'evt-123',
  issueType: 'bug',
  severity: 'high',
  title: 'GitHub analyzer failure on private repos',
  body: '## Bug\nThe GitHub analyzer fails when...',
  labels: ['bug', 'github'],
  triagedAt: '2026-03-14T00:00:02Z',
};

describe('ProcessTriage', () => {
  it('triages event and stores result', async () => {
    const eventStore: EventStorePort = {
      save: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockEvent),
      findByIdempotencyKey: vi.fn(),
      findAll: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      setIssueUrl: vi.fn(),
      setError: vi.fn(),
    };
    const triageEngine: TriageEnginePort = {
      triage: vi.fn().mockResolvedValue(mockTriageResult),
    };
    const triageStore: TriageStorePort = {
      save: vi.fn().mockResolvedValue(undefined),
      findByEventId: vi.fn(),
      update: vi.fn(),
    };

    const useCase = new ProcessTriage(eventStore, triageEngine, triageStore);
    const result = await useCase.execute('evt-123');

    expect(result.issueType).toBe('bug');
    expect(result.severity).toBe('high');
    expect(triageEngine.triage).toHaveBeenCalledWith(mockEvent);
    expect(triageStore.save).toHaveBeenCalledWith(mockTriageResult);
    expect(eventStore.updateStatus).toHaveBeenCalledWith('evt-123', 'triaged');
  });

  it('throws if event not found', async () => {
    const eventStore: EventStorePort = {
      save: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      findByIdempotencyKey: vi.fn(),
      findAll: vi.fn(),
      updateStatus: vi.fn(),
      setIssueUrl: vi.fn(),
      setError: vi.fn(),
    };
    const triageEngine: TriageEnginePort = { triage: vi.fn() };
    const triageStore: TriageStorePort = { save: vi.fn(), findByEventId: vi.fn(), update: vi.fn() };

    const useCase = new ProcessTriage(eventStore, triageEngine, triageStore);

    await expect(useCase.execute('nonexistent')).rejects.toThrow('Event not found');
  });
});
