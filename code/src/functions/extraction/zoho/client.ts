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

  async getPortals(): Promise<ZohoAPIResponse<{ portals: ZohoPortal[] }>> {
    try {
      console.log('Making request to /portals/');
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

  async getUsers(portalId: string, projectId: string): Promise<ZohoAPIResponse<{ users: ZohoUser[] }>> {
    try {
      const response = await this.client.get(`/portal/${portalId}/projects/${projectId}/users/`);
      console.log('Div logs Users API response:', JSON.stringify(response.data, null, 2));
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

  async getIssues(portalId: string, projectId: string): Promise<ZohoAPIResponse<{ issues: ZohoIssue[] }>> {
    try {
      const response = await this.client.get(`/portal/${portalId}/projects/${projectId}/bugs/`);
      console.log('Div logs Bugs API response:', JSON.stringify(response.data, null, 2));
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
      console.log('Div logs Tasks API response:', JSON.stringify(response.data, null, 2));
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
    try {
      console.log(`Fetching comments for bug (issue) with ID: ${issueId}`);
      const response = await this.client.get(`/portal/${portalId}/projects/${projectId}/bugs/${issueId}/comments/`);
      console.log('Div logs Bug comments response:', JSON.stringify(response.data, null, 2));
      return response;
    } catch (error) {
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
      const response = await this.client.get(`/portal/${portalId}/projects/${projectId}/tasks/${taskId}/comments/`);
      console.log('Div logs taskCommentsResponse in client.ts', JSON.stringify(response.data, null, 2));
      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw handleZohoError(error as AxiosError);
      }
      throw error;
    }
  }
}
