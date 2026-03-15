/**
 * Domain model representing a GitHub issue to be created from a triage result.
 */
export interface Issue {
  title: string;
  body: string;
  labels: string[];
  repository: string;
}
