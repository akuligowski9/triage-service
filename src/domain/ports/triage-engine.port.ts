/**
 * Port for the AI triage engine that classifies events into structured results.
 */
import type { IntakeEvent } from '../models/event.js';
import type { TriageResult } from '../models/triage-result.js';

export interface TriageEnginePort {
  triage(event: IntakeEvent): Promise<TriageResult>;
}
