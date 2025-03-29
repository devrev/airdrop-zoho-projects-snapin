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
export const MAX_REQUESTS_PER_WINDOW = 100;
export const RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000; 

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

  public getApiCallCount(): number {
    return this.totalRequestsMade;
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

  private async trackRequest(): Promise<void> {
    const now = Date.now();

    if (this.lastRateLimitResetTime > 0) {
      const timeElapsed = now - this.lastRateLimitResetTime;

      if (timeElapsed < RATE_LIMIT_WINDOW_MS) {
        const remainingLockTime = RATE_LIMIT_WINDOW_MS - timeElapsed;
        throw new ZohoRateLimitError(remainingLockTime);
      } else {
        this.lastRateLimitResetTime = 0;
        this.requestTimestamps = [];
        this.requestCount = 0;
      }
    }
  
    if (this.requestCount >= MAX_REQUESTS_PER_WINDOW) {
      this.lastRateLimitResetTime = now;
      throw new ZohoRateLimitError(RATE_LIMIT_WINDOW_MS);
    }

    this.requestTimestamps.push(now);
    this.requestCount++;
    this.totalRequestsMade++;
  }

  private async fetchAllPages<T, R>(
    fetchFunction: (page: number, perPage: number) => Promise<AxiosResponse<R>>,
    dataExtractor: (response: R) => T[]
  ): Promise<PagedResponse<T>> {
    const allData: T[] = [];
    let currentPage = 1;
    let hasMoreData = true;

    while (hasMoreData) {
      try {
        await this.trackRequest();
        const response = await fetchFunction(currentPage, MAX_ITEMS_PER_PAGE);

        if (!response.data) {
          console.error('No data in response:', response);
          throw new Error('No data received from Zoho API');
        }

        const items = dataExtractor(response.data);

        if (!items || !Array.isArray(items)) {
          console.error('Invalid data format extracted:', items);
          throw new Error('Failed to extract array data from Zoho API response');
        }
        allData.push(...items);
        hasMoreData = items.length === MAX_ITEMS_PER_PAGE;
        if (hasMoreData) {
          currentPage++;
        }
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

    return {
      data: allData,
      lastPage: currentPage,
    };
  }

  async getPortals(): Promise<ZohoAPIResponse<{ portals: ZohoPortal[] }>> {
    try {
      await this.trackRequest();
      const response = await this.client.get('/portals/');
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      console.error('Error in fetching portals:', error);
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
      await this.trackRequest();
      const response = await this.client.get(`/portal/${usePortalId}/projects/`);
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
      await this.trackRequest();
      const response = await this.client.get(`/portal/${portalId}/projects/${projectId}/bugs/${issueId}/comments/`);
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
