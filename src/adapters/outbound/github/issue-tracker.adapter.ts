/**
 * GitHub adapter for creating issues and fetching labels via the Octokit SDK.
 */
import { Octokit } from '@octokit/rest';
import type { IssueTrackerPort } from '../../../domain/ports/issue-tracker.port.js';
import type { Issue } from '../../../domain/models/issue.js';

export class GitHubIssueAdapter implements IssueTrackerPort {
  private client: Octokit;

  constructor(token: string) {
    this.client = new Octokit({ auth: token });
  }

  async createIssue(issue: Issue): Promise<{ url: string; number: number }> {
    const [owner, repo] = issue.repository.split('/');

    const { data } = await this.client.issues.create({
      owner,
      repo,
      title: issue.title,
      body: issue.body,
      labels: issue.labels,
    });

    return { url: data.html_url, number: data.number };
  }

  async listLabels(repository: string): Promise<{ name: string; color: string }[]> {
    const [owner, repo] = repository.split('/');
    const { data } = await this.client.issues.listLabelsForRepo({ owner, repo, per_page: 100 });
    return data.map(l => ({ name: l.name, color: l.color ?? 'ededed' }));
  }
}
