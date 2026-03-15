/**
 * PostgreSQL adapter for persisting and retrieving triage results.
 * Implements TriageStorePort for hexagonal architecture compliance.
 */
import type { Knex } from 'knex';
import type { TriageResult } from '../../../domain/models/triage-result.js';
import type { TriageStorePort } from '../../../domain/ports/triage-store.port.js';

interface TriageRow {
  id: string;
  event_id: string;
  issue_type: string;
  severity: string;
  title: string;
  body: string;
  labels: string[];
  component: string | null;
  reproduction_steps: string[];
  acceptance_criteria: string[];
  triaged_at: Date;
}

function rowToResult(row: TriageRow): TriageResult {
  return {
    eventId: row.event_id,
    issueType: row.issue_type as TriageResult['issueType'],
    severity: row.severity as TriageResult['severity'],
    title: row.title,
    body: row.body,
    labels: row.labels,
    component: row.component ?? undefined,
    reproductionSteps: row.reproduction_steps,
    acceptanceCriteria: row.acceptance_criteria,
    triagedAt: row.triaged_at.toISOString(),
  };
}

export class PostgresTriageStore implements TriageStorePort {
  constructor(private db: Knex) {}

  async save(result: TriageResult): Promise<void> {
    await this.db('triage_results').insert({
      event_id: result.eventId,
      issue_type: result.issueType,
      severity: result.severity,
      title: result.title,
      body: result.body,
      labels: JSON.stringify(result.labels),
      component: result.component ?? null,
      reproduction_steps: JSON.stringify(result.reproductionSteps ?? []),
      acceptance_criteria: JSON.stringify(result.acceptanceCriteria ?? []),
      triaged_at: result.triagedAt,
    });
  }

  async findByEventId(eventId: string): Promise<TriageResult | null> {
    const row = await this.db('triage_results').where({ event_id: eventId }).first();
    return row ? rowToResult(row) : null;
  }

  async update(eventId: string, fields: Partial<Pick<TriageResult, 'title' | 'body' | 'severity' | 'labels' | 'reproductionSteps' | 'acceptanceCriteria'>>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (fields.title !== undefined) update.title = fields.title;
    if (fields.body !== undefined) update.body = fields.body;
    if (fields.severity !== undefined) update.severity = fields.severity;
    if (fields.labels !== undefined) update.labels = JSON.stringify(fields.labels);
    if (fields.reproductionSteps !== undefined) update.reproduction_steps = JSON.stringify(fields.reproductionSteps);
    if (fields.acceptanceCriteria !== undefined) update.acceptance_criteria = JSON.stringify(fields.acceptanceCriteria);
    await this.db('triage_results').where({ event_id: eventId }).update(update);
  }
}
