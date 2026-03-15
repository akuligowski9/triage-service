/**
 * PostgreSQL adapter for persisting and querying intake events.
 * Maps between domain models and database rows (snake_case).
 */
import type { Knex } from 'knex';
import type { EventStatus, IntakeEvent } from '../../../domain/models/event.js';
import type { EventStorePort } from '../../../domain/ports/event-store.port.js';

interface EventRow {
  id: string;
  source_type: string;
  project: string;
  environment: string;
  message: string;
  stack_trace: string | null;
  metadata: Record<string, unknown>;
  timestamp: Date;
  received_at: Date;
  status: string;
  idempotency_key: string;
  issue_url: string | null;
  error_message: string | null;
  created_at: Date;
}

function rowToEvent(row: EventRow): IntakeEvent {
  return {
    id: row.id,
    sourceType: row.source_type as IntakeEvent['sourceType'],
    project: row.project,
    environment: row.environment,
    message: row.message,
    stackTrace: row.stack_trace ?? undefined,
    metadata: row.metadata,
    timestamp: row.timestamp.toISOString(),
    receivedAt: row.received_at.toISOString(),
    status: row.status as EventStatus,
    idempotencyKey: row.idempotency_key,
    issueUrl: row.issue_url ?? undefined,
    errorMessage: row.error_message ?? undefined,
  };
}

export class PostgresEventStore implements EventStorePort {
  constructor(private db: Knex) {}

  async save(event: IntakeEvent): Promise<void> {
    await this.db('events').insert({
      id: event.id,
      source_type: event.sourceType,
      project: event.project,
      environment: event.environment,
      message: event.message,
      stack_trace: event.stackTrace ?? null,
      metadata: JSON.stringify(event.metadata ?? {}),
      timestamp: event.timestamp,
      received_at: event.receivedAt,
      status: event.status,
      idempotency_key: event.idempotencyKey,
    });
  }

  async findById(id: string): Promise<IntakeEvent | null> {
    const row = await this.db('events').where({ id }).first();
    return row ? rowToEvent(row) : null;
  }

  async findByIdempotencyKey(key: string): Promise<IntakeEvent | null> {
    const row = await this.db('events').where({ idempotency_key: key }).first();
    return row ? rowToEvent(row) : null;
  }

  async findAll(status?: EventStatus): Promise<IntakeEvent[]> {
    const query = this.db('events').orderBy('received_at', 'desc');
    if (status) {
      query.where({ status });
    }
    const rows = await query;
    return rows.map(rowToEvent);
  }

  async updateStatus(id: string, status: EventStatus): Promise<void> {
    await this.db('events').where({ id }).update({ status });
  }

  async setIssueUrl(id: string, url: string): Promise<void> {
    await this.db('events').where({ id }).update({ issue_url: url });
  }

  async setError(id: string, message: string): Promise<void> {
    await this.db('events').where({ id }).update({ status: 'failed', error_message: message });
  }
}
