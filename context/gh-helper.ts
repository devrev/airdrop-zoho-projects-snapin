import { RepoInterface, NormalizedItem } from '@devrev/ts-adaas';
import {
  normalizeGitHubAssignees,
  normalizeGitHubLabel,
  normalizeGitHubIssues,
  normalizeGitHubComments,
} from './data-normalization';

import {
    ExtractorState,
    ItemType,
    ItemTypeExtractFunction,
    ItemTypeToExtract,
  } from './types';

export const DEFAULT_DATE = '1970-01-01T00:00:00Z';

export const repos: RepoInterface[] = [
  {
    itemType: ItemType.ISSUES,
    normalize: normalizeGitHubIssues as (record: object) => NormalizedItem,
  },
  {
    itemType: ItemType.COMMENTS,
    normalize: normalizeGitHubComments as (record: object) => NormalizedItem,
  },
  {
    itemType: ItemType.LABELS,
    normalize: normalizeGitHubLabel as (record: object) => NormalizedItem,
  },
  {
    itemType: ItemType.ASSIGNEES,
    normalize: normalizeGitHubAssignees as (record: object) => NormalizedItem,
  },
];

export const initialState: ExtractorState = {
    issues: {
      complete: false,
      page: 1
    },
    comments: {
      complete: false,
      page: 1,
    },
    labels: {
      complete: false,
      page: 1,
    },
    assignees: {
      complete: false,
      page: 1,
    },
    extractedIssues: [],
};

export function getItemTypesToExtract(): ItemTypeToExtract[] {
    return [
      {
        name: ItemType.LABELS,
        functionName: ItemTypeExtractFunction.GET_LABELS,
      },
      {
        name: ItemType.ASSIGNEES,
        functionName: ItemTypeExtractFunction.GET_ASSIGNEES,
      },
      {
        name: ItemType.ISSUES,
        functionName: ItemTypeExtractFunction.GET_ISSUES,
      }
    ];
  }

export class RateLimitError extends Error {
  constructor(public delay: number) {
    super(`Rate limit exceeded. Need to wait ${delay} seconds`);
    this.name = 'RateLimitError';
  }
}
