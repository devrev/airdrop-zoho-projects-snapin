import { NormalizedItem } from '@devrev/ts-adaas';
import { ZohoIssue, ZohoIssueComment, ZohoTask, ZohoTaskComment, ZohoUser } from './types';
const DEFAULT_DATE = '1970-01-01T00:00:00Z';

export function normalizeUser(user: ZohoUser): NormalizedItem {
  return {
    id: user.id,
    created_date: new Date(DEFAULT_DATE).toISOString(),
    modified_date: new Date(DEFAULT_DATE).toISOString(),
    data: {
      name: user.name,
      email: user.email,
      profile_type: user.profile_type,
      role: user.role,
      active: user.active,
    },
  };
}
export function normalizeTask(task: ZohoTask): NormalizedItem {
  return {
    id: String(task.id_string),
    created_date: new Date(task.created_time || DEFAULT_DATE).toISOString(),
    modified_date: new Date(task.last_updated_time || DEFAULT_DATE).toISOString(),
    data: {
      name: task.name,
      description: task.description,
      status: task.status.type,
      priority: task.priority,
      created_by: task.created_by,
      percent_complete: task.percent_complete,
      completed: task.completed,
      start_date: task.start_date ? new Date(task.start_date).toISOString() : null,
      end_date: task.end_date ? new Date(task.end_date).toISOString() : null,
      html_url: task.link?.web?.url || null,
    },
  };
}

export function normalizeIssue(issue: ZohoIssue): NormalizedItem {
  return {
    id: String(issue.id_string),
    created_date: new Date(issue.created_time || DEFAULT_DATE).toISOString(),
    modified_date: new Date(issue.updated_time || DEFAULT_DATE).toISOString(),
    data: {
      title: issue.title,
      description: issue.description,
      bug_number: issue.bug_number,
      status: issue.status.type,
      reporter_id: issue.reporter_id,
      assignee_id: issue.assignee_zpuid || null,
    },
  };
}

export function normalizeIssueComment(comment: ZohoIssueComment): NormalizedItem {
  return {
    id: String(comment.comment_id),
    created_date: new Date(comment.created_time || DEFAULT_DATE).toISOString(),
    modified_date: new Date(comment.updated_time || comment.created_time || DEFAULT_DATE).toISOString(),
    data: {
      content: comment.comment,
      added_by: comment.added_by,
      parent_Issue_Id: String(comment.parent_Issue_Id),
      created_time: new Date(comment.created_time || DEFAULT_DATE).toISOString(),
      updated_time: new Date(comment.updated_time || comment.created_time || DEFAULT_DATE).toISOString(),
    },
  };
}

export function normalizeTaskComment(comment: ZohoTaskComment): NormalizedItem {
  return {
    id: String(comment.id_string || comment.id),
    created_date: new Date(comment.created_time || DEFAULT_DATE).toISOString(),
    modified_date: new Date(comment.updated_time || comment.created_time || DEFAULT_DATE).toISOString(),
    data: {
      content: comment.content,
      added_by: comment.added_by,
      parent_Task_Id: String(comment.parent_Task_Id),
      created_time: new Date(comment.created_time || DEFAULT_DATE).toISOString(),
      updated_time: new Date(comment.updated_time || comment.created_time || DEFAULT_DATE).toISOString(),
    },
  };
}
