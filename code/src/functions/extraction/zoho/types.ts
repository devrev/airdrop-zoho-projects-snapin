export enum ItemType {
  USERS = 'users',
  TASKS = 'tasks',
  ISSUES = 'issues',
  TASK_COMMENTS = 'task_comments',
  ISSUE_COMMENTS = 'issue_comments',
}

export enum ItemTypeExtractFunction {
  GET_USERS = 'getUsers',
  GET_TASKS = 'getTasks',
  GET_ISSUES = 'getIssues',
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
  [ItemType.USERS]: ExtractorStateBase;
  [ItemType.TASKS]: ExtractorStateBase;
  [ItemType.ISSUES]: ExtractorStateBase;
  [ItemType.TASK_COMMENTS]: ExtractorStateBase;
  [ItemType.ISSUE_COMMENTS]: ExtractorStateBase;
  extractedTasks: string[];
  extractedIssues: string[];
  lastSyncStarted: string;
  lastSuccessfulSyncStarted: string;
  portal_id: string;
  project_id: string;
}

export interface ZohoConfig {
  accessToken: string;
  portalId: string;
  projectId: string;
  baseUrl?: string;
}

export interface ZohoPortal {
  id: string;
  name: string;
  description?: string;
  project_count?: number;
}

export interface ZohoProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_date: string;
  owner_name: string;
}

export interface ZohoUser {
  id: string;
  name: string;
  email: string;
  profile_type: string;
  role: string;
  active: boolean;
}

export interface ZohoStatus {
  type: string;
  id: string;
  name?: string;
}

export interface ZohoSeverity {
  type: string;
  id: string;
}

export interface ZohoIssue {
  id: string;
  title: string;
  description: string;
  bug_number: string;
  status: ZohoStatus;
  severity: ZohoSeverity;
  created_time: string;
  updated_time: string;
  reporter_id: string;
  assignee_zpuid?: string;
}

export interface ZohoTaskOwner {
  zpuid: string;
  full_name: string;
  work: string;
  name: string;
  last_name: string;
  id: string;
  first_name: string;
  email: string;
}

export interface ZohoTaskDetails {
  owners: ZohoTaskOwner[];
}

export interface ZohoTaskStatus {
  name: string;
  id: string;
  type: string;
  color_code: string;
}

export interface ZohoTaskList {
  name: string;
  id_string: string;
  id: string;
}

export interface ZohoTaskLink {
  timesheet: { url: string };
  web: { url: string };
  self: { url: string };
}

export interface ZohoTaskLogHours {
  non_billable_hours: string;
  billable_hours: string;
}

export interface ZohoTask {
  id: string;
  id_string: string;
  name: string;
  description: string;
  status: ZohoTaskStatus;
  priority: string;
  created_time: string;
  last_updated_time: string;
  created_by: string;
  percent_complete: string;
  details: ZohoTaskDetails;
  tasklist: ZohoTaskList;
  link: ZohoTaskLink;
  log_hours: ZohoTaskLogHours;
  start_date: string;
  end_date: string;
  duration: string;
  duration_type: string;
  completed: boolean;
  key: string;
}

export interface ZohoComment {
  id: string;
  content: string;
  created_time: string;
  updated_time?: string;
  added_by: string;
  parent_Issue_Id ?: {
    reference: {
      refers_to: {
        '#record:issues': string;
      };
    };
  };
  parent_Task_Id?: {
    reference: {
      refers_to: {
        '#record:tasks': string;
      };
    };
  };
}

export interface ZohoAPIResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PagedResponse<T> {
  data: T[];
  lastPage: number;
}

export interface CreateCommentParams {
  content: string;
}

export interface UpdateCommentParams {
  content: string;
}

export interface CreateTaskParams {
  name: string;
  description?: string;
  status?: string;
  priority?: string;
}

export interface UpdateTaskParams {
  name?: string;
  description?: string;
  status?: string;
  priority?: string;
}

export interface CreateIssueParams {
  title: string;
  description?: string;
  severity?: string;
}

export interface UpdateIssueParams {
  title?: string;
  description?: string;
  status?: string;
  severity?: string;
}
