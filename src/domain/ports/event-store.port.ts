/**
 * Port for persisting and querying intake events.
 */
import type { EventStatus, IntakeEvent } from '../models/event.js';

export interface EventStorePort {
  save(event: IntakeEvent): Promise<void>;
  findById(id: string): Promise<IntakeEvent | null>;
  findAll(status?: EventStatus): Promise<IntakeEvent[]>;
  updateStatus(id: string, status: EventStatus): Promise<void>;
  setIssueUrl(id: string, url: string): Promise<void>;
  setError(id: string, message: string): Promise<void>;
}
