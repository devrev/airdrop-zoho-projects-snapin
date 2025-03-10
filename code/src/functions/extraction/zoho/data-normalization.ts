import { NormalizedItem } from '@devrev/ts-adaas';
import { ZohoComment, ZohoIssue, ZohoTask, ZohoUser } from './types';

const DEFAULT_DATE = '1970-01-01T00:00:00Z';

function transformHtmlContent(content: string | null): string | null {
  if (!content) return null;
  return content
    .replace(/<div>/g, '')
    .replace(/<\/div>/g, '\n')
    .trim();
}

export function normalizeUser(user: ZohoUser): NormalizedItem {
  return {
    id: user.id,
    created_date: DEFAULT_DATE,
    modified_date: DEFAULT_DATE,
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
    created_date: task.created_time || DEFAULT_DATE,
    modified_date: task.last_updated_time || DEFAULT_DATE,
    data: {
      name: task.name,
      description: [transformHtmlContent(task.description)],
      status: task.status.type,
      status_id: task.status.id,
      priority: task.priority,
      created_by: task.created_by,
      percent_complete: task.percent_complete,
    },
  };
}

export function normalizeIssue(issue: ZohoIssue): NormalizedItem {
  return {
    id: issue.id,
    created_date: issue.created_time || DEFAULT_DATE,
    modified_date: issue.updated_time || DEFAULT_DATE,
    data: {
      title: issue.title,
      description: [transformHtmlContent(issue.description)],
      bug_number: issue.bug_number,
      status: issue.status.type,
      reporter_id: issue.reporter_id,
      assignee_id: issue.assignee_zpuid || null,
    },
  };
}

export function normalizeComment(comment: ZohoComment): NormalizedItem {
  return {
    id: comment.id,
    created_date: comment.created_time || DEFAULT_DATE,
    modified_date: comment.last_modified_time || comment.created_time || DEFAULT_DATE,
    data: {
      content: [transformHtmlContent(comment.content)],
      added_by: comment.added_by,
    },
  };
}
