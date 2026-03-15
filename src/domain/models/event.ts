/**
 * Core domain model for intake events flowing through the triage pipeline.
 */
export type EventSourceType = 'application_error' | 'validation_warning' | 'developer_note';

export type EventStatus = 'pending' | 'triaged' | 'approved' | 'sent' | 'failed' | 'dismissed';

export interface IntakeEvent {
  id: string;
  sourceType: EventSourceType;
  project: string;
  environment: string;
  message: string;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  receivedAt: string;
  status: EventStatus;
  fingerprint: string;
  issueUrl?: string;
  errorMessage?: string;
}
