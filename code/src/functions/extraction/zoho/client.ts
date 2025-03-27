import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { handleZohoError, ZohoRateLimitError } from './helper';
import {
  PagedResponse,
  ZohoAPIResponse,
  ZohoComment,
  ZohoIssue,
  ZohoPortal,
  ZohoProject,
  ZohoTask,
  ZohoUser,
} from './types';

export interface ZohoConfig {
  accessToken: string;
  portalId?: string;
  projectId?: string;
  baseUrl?: string;
}

export const ZOHO_API_BASE = 'https://projectsapi.zoho.com/restapi';
export const MAX_ITEMS_PER_PAGE = 100;
// Rate limiting constants
export const MAX_REQUESTS_PER_WINDOW = 100;
export const RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes in milliseconds

export enum ZohoItemType {
  ISSUES = 'issues',
  TASKS = 'tasks',
  USERS = 'users',
  COMMENTS = 'comments',
}

export interface ZohoExtractorState {
  lastSyncStarted?: string;
  lastSuccessfulSyncStarted?: string;
  extractedIssues: string[];
  extractedTasks: string[];
  [ZohoItemType.ISSUES]: {
    complete: boolean;
    page: number;
  };
  [ZohoItemType.TASKS]: {
    complete: boolean;
    page: number;
  };
  [ZohoItemType.USERS]: {
    complete: boolean;
    page: number;
  };
  [ZohoItemType.COMMENTS]: {
    complete: boolean;
    page: number;
  };
}

export interface ZohoItemTypeToExtract {
  name: ZohoItemType;
  repoName: string;
}

export class ZohoClient {
  private client: AxiosInstance;
  private config: ZohoConfig;
  private requestCount: number = 0;
  private requestTimestamps: number[] = [];
  private lastRateLimitResetTime: number = 0;
  private totalRequestsMade: number = 0;

  constructor(config: ZohoConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || ZOHO_API_BASE,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  get portalId(): string {
    if (!this.config.portalId) {
      throw new Error('Portal ID is not set');
    }
    return this.config.portalId;
  }

  get projectId(): string {
    if (!this.config.projectId) {
      throw new Error('Project ID is not set');
    }
    return this.config.projectId;
  }

  // Method to track API requests and manage rate limiting
  private async trackRequest(): Promise<void> {
    const now = Date.now();

    // Check if we're in a rate-limit lock period
    if (this.lastRateLimitResetTime > 0) {
      const timeElapsed = now - this.lastRateLimitResetTime;

      // If we're in the rate limited period and it's been less than 2 minutes, throw error
      if (timeElapsed < RATE_LIMIT_WINDOW_MS) {
        const remainingLockTime = RATE_LIMIT_WINDOW_MS - timeElapsed;
        console.log(
          `Still in rate limit cool-down period. Need to wait ${remainingLockTime}ms before resuming requests.`
        );
        throw new ZohoRateLimitError(remainingLockTime);
      } else {
        // Reset the lock if the cool-down period has passed
        console.log('Rate limit cool-down period has ended. Resetting counter.');
        this.lastRateLimitResetTime = 0;
        this.requestTimestamps = [];
        this.requestCount = 0;
      }
    }

    // Check if we've reached exactly 100 requests
    if (this.requestCount >= MAX_REQUESTS_PER_WINDOW) {
      // If we've hit 100 requests, enforce a 2-minute wait period
      console.log(`Made ${this.requestCount} API requests. Enforcing 2-minute cool-down period.`);
      this.lastRateLimitResetTime = now;
      throw new ZohoRateLimitError(RATE_LIMIT_WINDOW_MS);
    }

    // Add current timestamp to the list and increment counter
    this.requestTimestamps.push(now);
    this.requestCount++;
    this.totalRequestsMade++;

    // Log every 10 requests to monitor progress
    if (this.requestCount % 10 === 0) {
      console.log(
        `Made ${this.requestCount}/${MAX_REQUESTS_PER_WINDOW} API requests in current window. Total API calls: ${this.totalRequestsMade}`
      );
    }
  }

  // Generic method to handle paginated requests similar to GitHub implementation
  private async fetchAllPages<T, R>(
    fetchFunction: (page: number, perPage: number) => Promise<AxiosResponse<R>>,
    dataExtractor: (response: R) => T[]
  ): Promise<PagedResponse<T>> {
    const allData: T[] = [];
    let currentPage = 1;
    let hasMoreData = true;

    while (hasMoreData) {
      try {
        // Track this request for rate limiting
        await this.trackRequest();

        // Make the API call
        const response = await fetchFunction(currentPage, MAX_ITEMS_PER_PAGE);

        if (!response.data) {
          console.error('No data in response:', response);
          throw new Error('No data received from Zoho API');
        }

        // Extract the data using the provided extractor function
        const items = dataExtractor(response.data);

        if (!items || !Array.isArray(items)) {
          console.error('Invalid data format extracted:', items);
          throw new Error('Failed to extract array data from Zoho API response');
        }

        allData.push(...items);

        // Check if there's more data to fetch
        hasMoreData = items.length === MAX_ITEMS_PER_PAGE;

        if (hasMoreData) {
          currentPage++;
        }
      } catch (error) {
        // If it's a rate limit error, rethrow it to be handled by the caller
        if (error instanceof ZohoRateLimitError) {
          throw error;
        }

        // For other errors, pass to the Zoho error handler
        if (error instanceof Error) {
          throw handleZohoError(error as AxiosError);
        }
        throw error;
      }
    }

    return {
      data: allData,
      lastPage: currentPage,
    };
  }

  async getPortals(): Promise<ZohoAPIResponse<{ portals: ZohoPortal[] }>> {
    try {
      console.log('Making request to /portals/');
      await this.trackRequest();
      const response = await this.client.get('/portals/');
      console.log('Portals API response:', JSON.stringify(response.data, null, 2));
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      console.error('Error in getPortals:', error);
      if (error instanceof Error) {
        throw handleZohoError(error as AxiosError);
      }
      throw error;
    }
  }

  async getProjects(portalId?: string): Promise<ZohoAPIResponse<{ projects: ZohoProject[] }>> {
    const usePortalId = portalId || this.config.portalId;
    if (!usePortalId) {
      throw new Error('Portal ID is required');
    }
    try {
      console.log(`Making request to /portal/${usePortalId}/projects/`);
      await this.trackRequest();
      const response = await this.client.get(`/portal/${usePortalId}/projects/`);
      console.log('Projects API response:', JSON.stringify(response.data, null, 2));
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      console.error('Error in getProjects:', error);
      if (error instanceof Error) {
        throw handleZohoError(error as AxiosError);
      }
      throw error;
    }
  }

  async getUsers(portalId: string, projectId: string): Promise<PagedResponse<ZohoUser>> {
    try {
      return this.fetchAllPages<ZohoUser, { users: ZohoUser[] }>(
        (page, perPage) =>
          this.client.get(`/portal/${portalId}/projects/${projectId}/users/`, {
            params: {
              index: (page - 1) * perPage,
              range: perPage,
            },
          }),
        (response) => response.users || []
      );
    } catch (error) {
      if (error instanceof ZohoRateLimitError) {
        throw error;
      }
      if (error instanceof Error) {
        throw handleZohoError(error as AxiosError);
      }
      throw error;
    }
  }

  async getIssues(portalId: string, projectId: string): Promise<PagedResponse<ZohoIssue>> {
    try {
      return this.fetchAllPages<ZohoIssue, { bugs: ZohoIssue[] }>(
        (page, perPage) =>
          this.client.get(`/portal/${portalId}/projects/${projectId}/bugs/`, {
            params: {
              index: (page - 1) * perPage,
              range: perPage,
            },
          }),
        (response) => response.bugs || []
      );
    } catch (error) {
      if (error instanceof ZohoRateLimitError) {
        throw error;
      }
      if (error instanceof Error) {
        throw handleZohoError(error as AxiosError);
      }
      throw error;
    }
  }

  async getTasks(portalId: string, projectId: string): Promise<PagedResponse<ZohoTask>> {
    try {
      return this.fetchAllPages<ZohoTask, { tasks: ZohoTask[] }>(
        (page, perPage) =>
          this.client.get(`/portal/${portalId}/projects/${projectId}/tasks/`, {
            params: {
              index: (page - 1) * perPage,
              range: perPage,
            },
          }),
        (response) => response.tasks || []
      );
    } catch (error) {
      if (error instanceof ZohoRateLimitError) {
        throw error;
      }
      if (error instanceof Error) {
        throw handleZohoError(error as AxiosError);
      }
      throw error;
    }
  }

  async getIssueComments(
    portalId: string,
    projectId: string,
    issueId: string
  ): Promise<ZohoAPIResponse<{ comments: ZohoComment[] }>> {
    try {
      console.log(`Fetching comments for bug (issue) with ID: ${issueId}`);
      await this.trackRequest();
      const response = await this.client.get(`/portal/${portalId}/projects/${projectId}/bugs/${issueId}/comments/`);
      console.log('Div logs Bug comments response:', JSON.stringify(response.data, null, 2));
      return response;
    } catch (error) {
      if (error instanceof ZohoRateLimitError) {
        throw error;
      }
      if (error instanceof Error) {
        throw handleZohoError(error as AxiosError);
      }
      throw error;
    }
  }

  async getTaskComments(
    portalId: string,
    projectId: string,
    taskId: string
  ): Promise<ZohoAPIResponse<{ comments: ZohoComment[] }>> {
    try {
      await this.trackRequest();
      const response = await this.client.get(`/portal/${portalId}/projects/${projectId}/tasks/${taskId}/comments/`);
      console.log('Div logs taskCommentsResponse in client.ts', JSON.stringify(response.data, null, 2));
      return response;
    } catch (error) {
      if (error instanceof ZohoRateLimitError) {
        throw error;
      }
      if (error instanceof Error) {
        throw handleZohoError(error as AxiosError);
      }
      throw error;
    }
  }
}
