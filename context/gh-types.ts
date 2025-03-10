export enum ItemType {
    ISSUES = 'issues',
    COMMENTS = 'comments',
    LABELS = 'labels',
    ASSIGNEES = 'assignees',
  }
  
  export enum ItemTypeExtractFunction {
    GET_ISSUES = 'getRepoIssues',
    GET_COMMENTS = 'getIssueComments',
    GET_LABELS = 'getRepoLabels',
    GET_ASSIGNEES = 'getRepoAssignees',
  }
  
  export interface ItemTypeToExtract {
    name: ItemType;
    functionName: ItemTypeExtractFunction;
  }
  
  type ExtractorStateBase = {
    complete: boolean;
    page: number;
  };
  
  export interface ExtractorState {
    [ItemType.ISSUES]: ExtractorStateBase;
    [ItemType.COMMENTS]: ExtractorStateBase;
    [ItemType.LABELS]: ExtractorStateBase;
    [ItemType.ASSIGNEES]: ExtractorStateBase;
    extractedIssues: number[];
    rateLimitReset?: number;
  }
  
  export interface GitHubRepo {
    id: number;
    name: string;
    description: string | null;
    open_issues_count: number;
  }
  
  export interface GitHubIssue {
    id: number;              
    number: number;          
    title: string;         
    body: string | null;           
    state: string;
    created_at: string;
    updated_at: string;
    closed_at?: string | null;
    user: GitHubUser;       
    assignees: GitHubUser[]; 
    labels: GitHubLabel[];   
    pull_request?: any;    
    url: string;      
    html_url: string;
    comments: number; 
    locked: boolean;
    closed_by?: GitHubUser | null;
    state_reason: string | null;
  }
  
  export interface GitHubUser {
    login: string;
    id: number;
    type: string;
    site_admin: boolean;
    html_url: string;
  }
  
  export interface GitHubLabel {
    id: number;
    name: string;
    color: string;
    description?: string;
    default: boolean;
    url: string;
  }
  export interface GitHubComment {
    id: number;
    body: string;
    html_url: string;
    issue_url: string;
    created_at: string;
    updated_at: string;
    user: GitHubUser;
    author_association: string;
  }
  
  export interface CreateIssueParams {
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }
  
  export interface UpdateIssueParams {
    title?: string;
    body?: string;
    state?: string;
    labels?: string[];
    assignees?: string[];
  }
  
  export interface CreateCommentParams {
    body: string;
  }
  
  export interface UpdateCommentParams {
    body: string;
  }
  
  export interface DenormalizedIssue {
    title: string;
    labels?: string[];
    body?: string;
    state?: string;
  }
  
  export interface DenormalizedComment {
    body: string;
  }
  
  export interface PagedResponse<T> {
    data: T[];
    lastPage: number;
  }
  
  export interface GitHubLoadSuccess {
    id: string;
    modifiedDate: string;
  }
  
  export interface GitHubLoadError {
    error: string;
  }
  
  export interface GitHubCreateUpdateResponse {
    id: number;
    url: string;
    updated_at: string;
  }
  
  export interface GitHubFileContentResponse {
    content: {
      name: string;
      path: string;
      sha: string;
      size: number;
      url: string;
      html_url: string;
      git_url: string;
      download_url: string;
      type: string;
    };
    commit: {
      sha: string;
      node_id: string;
      url: string;
      html_url: string;
      message: string;
    };
  }
  
  export type GitHubLoadResult = GitHubLoadSuccess | GitHubLoadError;
  
  export type LoaderState = {};
