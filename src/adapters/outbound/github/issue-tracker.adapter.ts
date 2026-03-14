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
}
