/**
 * Request-scoped context using AsyncLocalStorage.
 * Provides a correlation ID that flows through the entire request
 * lifecycle without explicit parameter passing.
 */
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
