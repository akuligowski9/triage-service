/**
 * Domain model for AI-generated triage output attached to an intake event.
 */
export interface TriageResult {
  eventId: string;
  issueType: 'bug' | 'task' | 'improvement' | 'question';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  body: string;
  labels: string[];
  component?: string;
  reproductionSteps?: string[];
  acceptanceCriteria?: string[];
  triagedAt: string;
}
