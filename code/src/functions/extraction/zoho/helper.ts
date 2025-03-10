import { NormalizedItem, RepoInterface } from '@devrev/ts-adaas';
import { AxiosError } from 'axios';
import { normalizeComment, normalizeIssue, normalizeTask, normalizeUser } from './data-normalization';
import { ExtractorState, ItemType } from './types';

export const DEFAULT_DATE = '1970-01-01T00:00:00Z';

export class ZohoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZohoError';
  }
}

export class ZohoRateLimitError extends ZohoError {
  delay: number;

  constructor(delay: number) {
    super('Rate limit exceeded');
    this.name = 'ZohoRateLimitError';
    this.delay = delay;
  }
}

export const handleZohoError = (error: AxiosError): never => {
  if (error.response) {
    const status = error.response.status;
    if (status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
      throw new ZohoRateLimitError(retryAfter * 1000);
    }
    throw new ZohoError(`Zoho API error: ${status}`);
  }
  throw new ZohoError(error.message);
};

export const repos: RepoInterface[] = [
  {
    itemType: ItemType.USERS,
    normalize: normalizeUser as (record: object) => NormalizedItem,
  },
  {
    itemType: ItemType.TASKS,
    normalize: normalizeTask as (record: object) => NormalizedItem,
  },
  {
    itemType: ItemType.ISSUES,
    normalize: normalizeIssue as (record: object) => NormalizedItem,
  },
  {
    itemType: ItemType.COMMENTS,
    normalize: normalizeComment as (record: object) => NormalizedItem,
  },
];

export const initialState: ExtractorState = {
  users: {
    complete: false,
    page: 1,
  },
  tasks: {
    complete: false,
    page: 1,
  },
  issues: {
    complete: false,
    page: 1,
  },
  comments: {
    complete: false,
    page: 1,
  },
  lastSyncStarted: '',
  lastSuccessfulSyncStarted: '',
  portal_id: '',
  project_id: '',
  extractedTasks: [],
  extractedIssues: [],
};
