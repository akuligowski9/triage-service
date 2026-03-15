import { describe, it, expect, vi } from 'vitest';
import { IngestEvent } from '../../src/application/ingest-event.js';
import type { EventStorePort } from '../../src/domain/ports/event-store.port.js';
import type { TriageQueuePort } from '../../src/domain/ports/triage-queue.port.js';

function createMocks() {
  const eventStore: EventStorePort = {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findByIdempotencyKey: vi.fn().mockResolvedValue(null),
    findAll: vi.fn(),
    updateStatus: vi.fn(),
    setIssueUrl: vi.fn(),
    setError: vi.fn(),
  };
  const triageQueue: TriageQueuePort = {
    enqueue: vi.fn().mockResolvedValue(undefined),
  };
  return { eventStore, triageQueue };
}

describe('IngestEvent', () => {
  it('stores event and enqueues triage job', async () => {
    const { eventStore, triageQueue } = createMocks();
    const useCase = new IngestEvent(eventStore, triageQueue);

    const result = await useCase.execute({
      sourceType: 'application_error',
      project: 'project-bridge',
      message: 'Something broke',
    });

    expect(result.status).toBe('pending');
    expect(result.sourceType).toBe('application_error');
    expect(result.project).toBe('project-bridge');
    expect(result.id).toBeDefined();
    expect(eventStore.save).toHaveBeenCalledOnce();
    expect(triageQueue.enqueue).toHaveBeenCalledWith(result.id);
  });

  it('defaults environment to development', async () => {
    const { eventStore, triageQueue } = createMocks();
    const useCase = new IngestEvent(eventStore, triageQueue);

    const result = await useCase.execute({
      sourceType: 'developer_note',
      project: 'test-project',
      message: 'Add validation logic',
    });

    expect(result.environment).toBe('development');
  });

  it('returns existing event for duplicate idempotency key', async () => {
    const existingEvent = {
      id: 'evt-existing',
      sourceType: 'application_error' as const,
      project: 'project-bridge',
      environment: 'development',
      message: 'Something broke',
      timestamp: '2026-03-14T00:00:00Z',
      receivedAt: '2026-03-14T00:00:01Z',
      status: 'pending' as const,
      fingerprint: 'abc123',
      idempotencyKey: 'custom-key-1',
    };

    const { eventStore, triageQueue } = createMocks();
    (eventStore.findByIdempotencyKey as ReturnType<typeof vi.fn>).mockResolvedValue(existingEvent);

    const useCase = new IngestEvent(eventStore, triageQueue);
    const result = await useCase.execute({
      sourceType: 'application_error',
      project: 'project-bridge',
      message: 'Something broke',
      idempotencyKey: 'custom-key-1',
    });

    expect(result.id).toBe('evt-existing');
    expect(eventStore.save).not.toHaveBeenCalled();
    expect(triageQueue.enqueue).not.toHaveBeenCalled();
  });

  it('accepts all three source types', async () => {
    const { eventStore, triageQueue } = createMocks();
    const useCase = new IngestEvent(eventStore, triageQueue);

    for (const sourceType of ['application_error', 'validation_warning', 'developer_note'] as const) {
      const result = await useCase.execute({
        sourceType,
        project: 'test',
        message: 'test message',
      });
      expect(result.sourceType).toBe(sourceType);
    }
  });
});
