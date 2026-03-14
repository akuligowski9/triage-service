export interface TriageQueuePort {
  enqueue(eventId: string): Promise<void>;
}
