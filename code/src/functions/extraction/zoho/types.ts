export interface ExtractorState {
  users: {
    complete: boolean;
    page: number;
  };
  tasks: {
    complete: boolean;
    page: number;
  };
  issues: {
    complete: boolean;
    page: number;
  };
  comments: {
    complete: boolean;
    page: number;
  };
  portal_id?: string;
  project_id?: string;
  lastSyncStarted: string;
  lastSuccessfulSyncStarted: string;
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

export interface ZohoIssue {
  id: string;
  title: string;
  description: string;
  bug_number: string;
  status: {
    type: string;
    id: string;
  };
  severity: {
    type: string;
    id: string;
  };
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
  id: string | number;
  id_string: string;
  name: string;
  description: string;
  key: string;
  status: ZohoTaskStatus;
  priority: string;
  created_time: string;
  created_time_format: string;
  created_time_long: number;
  last_updated_time: string;
  last_updated_time_format: string;
  last_updated_time_long: number;
  created_by: string;
  created_by_email: string;
  created_by_full_name: string;
  created_by_zpuid: string;
  created_person: string;
  percent_complete: string;
  completed: boolean;
  details: ZohoTaskDetails;
  tasklist: ZohoTaskList;
  link: ZohoTaskLink;
  start_date: string;
  start_date_format: string;
  start_date_long: number;
  end_date: string;
  end_date_format: string;
  end_date_long: number;
  duration: string;
  duration_type: string;
  work: string;
  work_type: string;
  work_form: string;
  log_hours: ZohoTaskLogHours;
  isparent: boolean;
  subtasks: boolean;
  is_comment_added: boolean;
  is_forum_associated: boolean;
  is_docs_assocoated: boolean;
  is_reminder_set: boolean;
  is_recurrence_set: boolean;
  task_duration_as_work: boolean;
  billingtype: string;
  order_sequence: number;
  milestone_id: string;
  task_followers?: {
    FOLUSERS: string;
    FOLLOWERSIZE: number;
    FOLLOWERS: any[];
  };
  GROUP_NAME?: {
    ASSOCIATED_TEAMS: {
      [key: string]: string;
    };
    ASSOCIATED_TEAMS_COUNT: number;
    IS_TEAM_UNASSIGNED: boolean;
  };
}

export interface ZohoComment {
  id: string;
  content: string;
  created_time: string;
  added_by: string;
  last_modified_time?: string;
}

export interface ZohoAPIResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export enum ItemType {
  USERS = 'users',
  TASKS = 'tasks',
  ISSUES = 'issues',
  COMMENTS = 'comments',
}

export interface ItemTypeToExtract {
  name: ItemType;
  normalize: (item: any) => any;
}

export interface ExtractorState {
  [ItemType.USERS]: { complete: boolean; page: number };
  [ItemType.TASKS]: { complete: boolean; page: number };
  [ItemType.ISSUES]: { complete: boolean; page: number };
  [ItemType.COMMENTS]: { complete: boolean; page: number };
  lastSyncStarted: string;
  lastSuccessfulSyncStarted: string;
  extractedTasks: string[];
  extractedIssues: string[];
}
