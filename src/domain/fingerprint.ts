/**
 * Derives a stable failure key from an event's defining characteristics.
 * Used for grouping recurring failures, not for business identity.
 *
 * Normalization rules:
 * - Strip UUIDs, timestamps, numeric IDs, and request IDs from messages
 * - Collapse whitespace so formatting differences don't split groups
 * - Lowercase everything for case-insensitive grouping
 * - Include project, source type, and pipeline stage (if present)
 *
 * Two events with the same fingerprint represent the same *kind* of failure.
 * Two events with the same event ID represent the same *instance*.
 */
import { createHash } from 'crypto';

const NOISE_PATTERNS = [
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, // UUIDs
  /\b\d{10,13}\b/g,                                                    // Unix timestamps
  /\b\d{4}-\d{2}-\d{2}T[\d:.]+Z?\b/g,                                 // ISO timestamps
  /\b(?:id|req|ref|trace)[=:\s]*\S+/gi,                                // request/trace IDs
  /\b\d+\b/g,                                                          // remaining numeric IDs
];

function normalize(message: string): string {
  let normalized = message;
  for (const pattern of NOISE_PATTERNS) {
    normalized = normalized.replace(pattern, '*');
  }
  return normalized.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function buildFingerprint(fields: {
  project: string;
  sourceType: string;
  message: string;
  stage?: string;
}): string {
  const parts = [
    fields.project,
    fields.sourceType,
    fields.stage ?? 'unknown',
    normalize(fields.message),
  ];

  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}
