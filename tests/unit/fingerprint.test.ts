import { describe, it, expect } from 'vitest';
import { buildFingerprint } from '../../src/domain/fingerprint.js';

describe('buildFingerprint', () => {
  it('produces the same fingerprint for equivalent errors with different IDs', () => {
    const fp1 = buildFingerprint({
      project: 'project-bridge',
      sourceType: 'application_error',
      message: "GitHub API 422: Label 'bug-123' not found",
      stage: 'github_analyzer',
    });

    const fp2 = buildFingerprint({
      project: 'project-bridge',
      sourceType: 'application_error',
      message: "GitHub API 422: Label 'bug-456' not found",
      stage: 'github_analyzer',
    });

    expect(fp1).toBe(fp2);
  });

  it('produces different fingerprints for different failure types', () => {
    const fp1 = buildFingerprint({
      project: 'project-bridge',
      sourceType: 'application_error',
      message: 'GitHub API 422: Label not found',
      stage: 'github_analyzer',
    });

    const fp2 = buildFingerprint({
      project: 'project-bridge',
      sourceType: 'application_error',
      message: 'Connection timeout after 30s',
      stage: 'ai_context',
    });

    expect(fp1).not.toBe(fp2);
  });

  it('strips UUIDs from messages', () => {
    const fp1 = buildFingerprint({
      project: 'test',
      sourceType: 'application_error',
      message: 'Failed to process event a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    });

    const fp2 = buildFingerprint({
      project: 'test',
      sourceType: 'application_error',
      message: 'Failed to process event ffffffff-ffff-ffff-ffff-ffffffffffff',
    });

    expect(fp1).toBe(fp2);
  });

  it('returns a 16-char hex string', () => {
    const fp = buildFingerprint({
      project: 'test',
      sourceType: 'application_error',
      message: 'something broke',
    });

    expect(fp).toMatch(/^[0-9a-f]{16}$/);
  });
});
