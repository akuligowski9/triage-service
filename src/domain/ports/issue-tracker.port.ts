/**
 * Port for creating issues in an external issue tracker (e.g. GitHub).
 */
import type { Issue } from '../models/issue.js';

export interface IssueTrackerPort {
  createIssue(issue: Issue): Promise<{ url: string; number: number }>;
}
