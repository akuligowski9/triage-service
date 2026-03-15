/**
 * Port for persisting and retrieving AI-generated triage results.
 */
import type { TriageResult } from '../models/triage-result.js';

export interface TriageStorePort {
  save(result: TriageResult): Promise<void>;
  findByEventId(eventId: string): Promise<TriageResult | null>;
  update(eventId: string, fields: Partial<Pick<TriageResult, 'title' | 'body' | 'severity' | 'labels' | 'reproductionSteps' | 'acceptanceCriteria'>>): Promise<void>;
}
