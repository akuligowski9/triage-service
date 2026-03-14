import type { Knex } from 'knex';
import type { TriageResult } from '../../../domain/models/triage-result.js';

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
  confidence: string;
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
    confidence: parseFloat(row.confidence),
    triagedAt: row.triaged_at.toISOString(),
  };
}

export class PostgresTriageStore {
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
      confidence: result.confidence,
      triaged_at: result.triagedAt,
    });
  }

  async findByEventId(eventId: string): Promise<TriageResult | null> {
    const row = await this.db('triage_results').where({ event_id: eventId }).first();
    return row ? rowToResult(row) : null;
  }
}
