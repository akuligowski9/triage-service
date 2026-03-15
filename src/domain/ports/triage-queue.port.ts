/**
 * Port for enqueuing events for asynchronous triage processing.
 */
export interface TriageQueuePort {
  enqueue(eventId: string): Promise<void>;
}
