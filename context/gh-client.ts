import axios, { AxiosResponse } from 'axios';
import {
  CreateCommentParams,
  CreateIssueParams,
  GitHubComment,
  GitHubRepo,
  UpdateCommentParams,
  UpdateIssueParams,
} from './types';
import {
  GitHubIssue,
  GitHubLabel,
  GitHubUser,
  PagedResponse,
  GitHubCreateUpdateResponse,
  GitHubFileContentResponse,
} from './types';
import { RateLimitError } from './helper';

const defaultHeaders = {
  accept: 'application/vnd.github+json, text/plain, */*',
  'content-type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
};

export const MAX_ISSUES_PER_PAGE = 100;
export const API_BASE = 'https://api.github.com/';

export const API_ENDPOINTS = {
  ORG_REPOS: (org: string) => `orgs/${org}/repos`,
  REPO_ASSIGNEES: (org: string, repo: string) => `repos/${org}/${repo}/assignees`,
  REPO_LABELS: (org: string, repo: string) => `repos/${org}/${repo}/labels`,
  REPO_ISSUES: (org: string, repo: string) => `repos/${org}/${repo}/issues`,
  REPO_ISSUE: (org: string, repo: string, issue_number: number) =>
    `repos/${org}/${repo}/issues/${issue_number}`,
  REPO_ISSUE_COMMENTS: (org: string, repo: string, issue_number: number) =>
    `repos/${org}/${repo}/issues/${issue_number}/comments`,
  REPO_COMMENT: (org: string, repo: string, commentId: number) =>
    `repos/${org}/${repo}/issues/comments/${commentId}`,
  CREATE_OR_UPDATE_FILE: (org: string, repo: string, path: string) =>
    `repos/${org}/${repo}/contents/${path}`,
};

export class GithubClient {
  private apitoken: string;

  constructor(apitoken: string) {
    this.apitoken = apitoken;
  }

  private getHeaders(): Record<string, string> {
    return {
      ...defaultHeaders,
      Authorization: `Bearer ${this.apitoken}`,
    };
  }

  private handleAxiosError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || 'Unknown GitHub API error';
      throw new Error(`GitHub API error: ${status} - ${message}`);
    }
    throw error;
  }

  private async fetchAllPages<T>(
    fetchFunction: (page: number) => Promise<AxiosResponse<T[]>>
  ): Promise<PagedResponse<T>> {
    const allData: T[] = [];
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      let response;
      try {
        response = await fetchFunction(currentPage);
      } catch (error) {
        this.handleAxiosError(error);
      }

      if (!response.data) {
        console.error('No data in response:', response);
        throw new Error('No data received from GitHub API');
      }

      const remaining = parseInt(response.headers['x-ratelimit-remaining'] || '0', 10);
      if (remaining === 0) {
        const reset = parseInt(response.headers['x-ratelimit-reset'] || '0', 10);
        const delay = Math.max(0, reset - Math.floor(Date.now() / 1000));
        throw new RateLimitError(delay);
      }

      allData.push(...response.data);
      const linkHeader = response.headers['link'] || response.headers['Link'] || '';
      hasNextPage = linkHeader.includes('rel="next"');

      if (hasNextPage) {
        currentPage++;
      }
    }

    return {
      data: allData,
      lastPage: currentPage,
    };
  }

  async getOrgRepos(org: string, params?: any): Promise<PagedResponse<GitHubRepo>> {
    const url = API_BASE + API_ENDPOINTS.ORG_REPOS(org);
    return this.fetchAllPages<GitHubRepo>((currentPage) =>
      axios.get(url, {
        headers: this.getHeaders(),
        params: { ...params, per_page: MAX_ISSUES_PER_PAGE, page: currentPage },
      })
    );
  }

  async getRepoAssignees(
    org: string,
    repo: string,
    params?: any
  ): Promise<PagedResponse<GitHubUser>> {
    const url = API_BASE + API_ENDPOINTS.REPO_ASSIGNEES(org, repo);
    return this.fetchAllPages<GitHubUser>((currentPage) =>
      axios.get(url, {
        headers: this.getHeaders(),
        params: { ...params, per_page: MAX_ISSUES_PER_PAGE, page: currentPage },
      })
    );
  }

  async getRepoIssues(
    org: string,
    repo: string,
    params?: any
  ): Promise<PagedResponse<GitHubIssue>> {
    const url = API_BASE + API_ENDPOINTS.REPO_ISSUES(org, repo);
    return this.fetchAllPages<GitHubIssue>((currentPage) =>
      axios.get(url, {
        headers: this.getHeaders(),
        params: { ...params, state: 'all', per_page: MAX_ISSUES_PER_PAGE, page: currentPage },
      })
    );
  }

  async getRepoLabels(
    org: string,
    repo: string,
    params?: { page?: number; per_page?: number }
  ): Promise<PagedResponse<GitHubLabel>> {
    const url = API_BASE + API_ENDPOINTS.REPO_LABELS(org, repo);
    return this.fetchAllPages<GitHubLabel>((currentPage) =>
      axios.get(url, {
        headers: this.getHeaders(),
        params: { ...params, per_page: MAX_ISSUES_PER_PAGE, page: currentPage },
      })
    );
  }

  async getIssueComments(
    org: string,
    repo: string,
    issueNumber: number,
    params?: {
      per_page?: number;
      since?: string;
    }
  ): Promise<PagedResponse<GitHubComment>> {
    const url = API_BASE + API_ENDPOINTS.REPO_ISSUE_COMMENTS(org, repo, issueNumber);
    return this.fetchAllPages<GitHubComment>((currentPage) =>
      axios.get(url, {
        headers: this.getHeaders(),
        params: { ...params, per_page: MAX_ISSUES_PER_PAGE, page: currentPage },
      })
    );
  }

  private async makeGitHubRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>
  ): Promise<T> {
    try {
      const response = await requestFn();
      return response.data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  async createIssue(
    org: string,
    repo: string,
    data: CreateIssueParams
  ): Promise<GitHubCreateUpdateResponse> {
    const url = API_BASE + API_ENDPOINTS.REPO_ISSUES(org, repo);
    return this.makeGitHubRequest(() =>
      axios.post(url, data, { headers: this.getHeaders() })
    );
  }

  async getIssue(
    org: string,
    repo: string,
    issueNumber: number,
  ): Promise<GitHubIssue> {
    const url = API_BASE + API_ENDPOINTS.REPO_ISSUE(org, repo, issueNumber);
    return this.makeGitHubRequest(() => axios.get(url, { headers: this.getHeaders() }));
  }

  async getComment(
    org: string,
    repo: string,
    commentId: number,
  ): Promise<GitHubComment> { 
    const url = API_BASE + API_ENDPOINTS.REPO_COMMENT(org, repo, commentId);
    return this.makeGitHubRequest(() => axios.get(url, { headers: this.getHeaders() }));
  }

  async updateIssue(
    org: string,
    repo: string,
    issueNumber: number,
    data: UpdateIssueParams,
    params?: any
  ): Promise<GitHubCreateUpdateResponse> {
    const url = API_BASE + API_ENDPOINTS.REPO_ISSUE(org, repo, issueNumber);
    return this.makeGitHubRequest(() =>
      axios.patch(url, data, { headers: this.getHeaders(), params: { ...params } })
    );
  }

  async createComment(
    org: string,
    repo: string,
    issueNumber: number,
    data: CreateCommentParams,
    params?: any
  ): Promise<GitHubCreateUpdateResponse> {
    const url = API_BASE + API_ENDPOINTS.REPO_ISSUE_COMMENTS(org, repo, issueNumber);
    return this.makeGitHubRequest(() =>
      axios.post(url, data, { headers: this.getHeaders(), params: { ...params } })
    );
  }

  async updateComment(
    org: string,
    repo: string,
    commentId: number,
    data: UpdateCommentParams,
    params?: any
  ): Promise<GitHubCreateUpdateResponse> {
    const url = API_BASE + API_ENDPOINTS.REPO_COMMENT(org, repo, commentId);
    return this.makeGitHubRequest(() =>
      axios.patch(url, data, { headers: this.getHeaders(), params: { ...params } })
    );
  }

  // To commit the attachments to the repo - via contents API 
  async createOrUpdateFile(
    org: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string
  ): Promise<GitHubFileContentResponse> {
    const url = API_BASE + API_ENDPOINTS.CREATE_OR_UPDATE_FILE(org, repo, path);
    return this.makeGitHubRequest(() =>
      axios.put(
        url,
        { message, content, branch },
        { headers: this.getHeaders() }
      )
    );
  }
}
