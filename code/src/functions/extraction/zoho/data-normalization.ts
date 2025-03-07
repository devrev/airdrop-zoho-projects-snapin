import { NormalizedItem } from '@devrev/ts-adaas';
import { ZohoComment, ZohoIssue, ZohoTask, ZohoUser } from './types';

const DEFAULT_DATE = '1970-01-01T00:00:00Z';

function transformHtmlContent(content: string | null): string | null {
  if (!content) return null;
  // Clean up Zoho's HTML content if needed
  return content
    .replace(/<div>/g, '')
    .replace(/<\/div>/g, '\n')
    .trim();
}

export function normalizeUser(user: ZohoUser): NormalizedItem {
  const id = user.id;
  // Zoho doesn't provide creation/modification dates for users
  const created_date = DEFAULT_DATE;
  const modified_date = DEFAULT_DATE;

  const data = {
    // user_id: user.id,
    name: user.name,
    email: user.email,
    profile_type: user.profile_type,
    role: user.role,
    active: user.active,
  };

  return {
    id,
    created_date,
    modified_date,
    data,
  };
}

export function normalizeIssue(issue: ZohoIssue): NormalizedItem {
  const id = issue.id;
  const created_date = issue.created_time || DEFAULT_DATE;
  const modified_date = issue.updated_time || DEFAULT_DATE;

  const data = {
    title: issue.title,
    description: [transformHtmlContent(issue.description)],
    bug_number: issue.bug_number,
    status: issue.status.type,
    status_id: issue.status.id,
    severity: issue.severity.type,
    severity_id: issue.severity.id,
    reporter_id: issue.reporter_id,
    assignee_id: issue.assignee_zpuid || null,
  };

  return {
    id,
    created_date,
    modified_date,
    data,
  };
}

export function normalizeTask(task: ZohoTask): NormalizedItem {
  const id = task.id;
  const created_date = task.created_time || DEFAULT_DATE;
  const modified_date = task.last_updated_time || DEFAULT_DATE;

  const data = {
    name: task.name,
    description: [transformHtmlContent(task.description)],
    status: task.status.type,
    status_id: task.status.id,
    status_name: task.status.name,
    priority: task.priority,
    created_by: task.created_by,
    percent_complete: task.percent_complete,
  };

  return {
    id,
    created_date,
    modified_date,
    data,
  };
}

export function normalizeComment(comment: ZohoComment): NormalizedItem {
  const id = comment.id;
  const created_date = comment.created_time || DEFAULT_DATE;
  const modified_date = comment.last_modified_time || comment.created_time || DEFAULT_DATE;

  const data = {
    content: [transformHtmlContent(comment.content)],
    added_by: comment.added_by,
  };

  return {
    id,
    created_date,
    modified_date,
    data,
  };
}
