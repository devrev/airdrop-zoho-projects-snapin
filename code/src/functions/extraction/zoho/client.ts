import axios, { AxiosError, AxiosInstance } from 'axios';
import { handleZohoError } from './helper';
import { ZohoAPIResponse, ZohoComment, ZohoIssue, ZohoPortal, ZohoProject, ZohoTask, ZohoUser } from './types';

export interface ZohoConfig {
  accessToken: string;
  portalId?: string;
  projectId?: string;
  baseUrl?: string;
}

export const ZOHO_API_BASE = 'https://projectsapi.zoho.com/restapi';
export const MAX_ITEMS_PER_PAGE = 100;

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

  constructor(config: ZohoConfig) {
    this.config = config;
    console.log('limbo access token:', config.accessToken);
    this.client = axios.create({
      baseURL: config.baseUrl || ZOHO_API_BASE,
      headers: {
        Authorization: `Zoho-oauthtoken ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // async getPortals(): Promise<ZohoAPIResponse<{ portals: ZohoPortal[] }>> {
  //   try {
  //     const response = await this.client.get('/portals/');
  //     return response.data;
  //   } catch (error) {
  //     if (error instanceof Error) {
  //       throw handleZohoError(error as AxiosError);
  //     }
  //     throw error;
  //   }
  // }

  // async getProjects(portalId?: string): Promise<ZohoAPIResponse<{ projects: ZohoProject[] }>> {
  //   const usePortalId = portalId || this.config.portalId;
  //   if (!usePortalId) {
  //     throw new Error('Portal ID is required');
  //   }
  //   try {
  //     const response = await this.client.get(`/portal/${usePortalId}/projects/`);
  //     return response.data;
  //   } catch (error) {
  //     if (error instanceof Error) {
  //       throw handleZohoError(error as AxiosError);
  //     }
  //     throw error;
  //   }
  // }

  async getUsers(portalId: string, projectId: string): Promise<{ users: ZohoUser[] }> {
    try {
      const response = await this.client.get(`/portal/${portalId}/projects/${projectId}/users/`);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw handleZohoError(error as AxiosError);
      }
      throw error;
    }
  }

  // Update getIssues method to handle 'bugs' response
  async getIssues(portalId: string, projectId: string): Promise<ZohoAPIResponse<{ issues: ZohoIssue[] }>> {
    try {
      const response = await this.client.get(`/portal/${portalId}/projects/${projectId}/issues/`);
      return {
        data: {
          issues: response.data.bugs || [], // Map bugs to issues
        },
        status: response.status,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw handleZohoError(error as AxiosError);
      }
      throw error;
    }
  }

  async getTasks(portalId: string, projectId: string): Promise<ZohoAPIResponse<{ tasks: ZohoTask[] }>> {
    try {
      const response = await this.client.get(`/portal/${portalId}/projects/${projectId}/tasks/`);
      console.log('DLOGG tasksResponse in client.ts', JSON.stringify(response.data, null, 2));
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
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
    const response = await this.client.get(`/portal/${portalId}/projects/${projectId}/issues/${issueId}/comments/`);
    return response;
  }

  async getTaskComments(
    portalId: string,
    projectId: string,
    taskId: string
  ): Promise<ZohoAPIResponse<{ comments: ZohoComment[] }>> {
    try {
      const response = await this.client.get(`/portal/${portalId}/projects/${projectId}/tasks/${taskId}/comments/`);
      console.log('taskCommentsResponse in client.ts', JSON.stringify(response.data, null, 2));
      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw handleZohoError(error as AxiosError);
      }
      throw error;
    }
  }
}
