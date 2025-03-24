import { NormalizedItem } from '@devrev/ts-adaas';
import { GitHubUser, GitHubLabel, GitHubIssue, GitHubComment } from './types';
import { DEFAULT_DATE } from './helper';

function transformImageLinks(body: string | null): string | null {
  if (!body) return null;
  // Replacing all occurrences of ![alt text](url) with [alt text](url)
  return body.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[$1]($2)');
}

// Function to remove the user prefix from the body, for comments made from DR. 
function removeDevRevPrefix(body: string | null): string | null{
  if (!body) return null;
  const prefixPattern = /^_(Posted|Edited)( by .+? via| from) DevRev_:\s*/;
  return body.replace(prefixPattern, '');
}

function transformCommentBody(body: string | null): string | null {
  if (!body) return null;
  const withoutPrefix = removeDevRevPrefix(body);
  return transformImageLinks(withoutPrefix);
}

export function normalizeGitHubAssignees(user: GitHubUser): NormalizedItem {
  
  const id = user.login; 
  const created_date = DEFAULT_DATE; // GitHub API doesn't provide creation date for users, hence using default
  const modified_date = DEFAULT_DATE;
  const data = {
    user_id: user.login, 
    html_url: user.html_url,
    type: user.type,
    site_admin: user.site_admin,
  };
  return {
    id,
    created_date,
    modified_date,
    data,
  };
}

export function normalizeGitHubLabel(label: GitHubLabel): NormalizedItem {
  
  const id = label?.id?.toString();
  const created_date = DEFAULT_DATE; // GitHub API doesn't provide creation date for labels, hence using default
  const modified_date = DEFAULT_DATE;
  const data = {
    name: label.name,
    color: `#${label.color}`, 
    description: label?.description ? [label.description] : [null], 
    default: label.default,
    url: label.url 
  };
  return {
    id,
    created_date, 
    modified_date,
    data,
  };
}

export function normalizeGitHubIssues(issue: GitHubIssue): NormalizedItem {

  const id = issue.url;
  const created_date = issue.created_at || DEFAULT_DATE;
  const modified_date = issue.updated_at || DEFAULT_DATE;
  const transformedBody = transformImageLinks(issue.body);

  const data = {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    body: transformedBody ? [transformedBody] : null, 
    html_url: issue.html_url,
    locked: issue.locked,
    created_by: issue.user.login,
    labels: issue.labels.map(label => label.name),
    assignees: issue.assignees.map(assignee => assignee.login),
    closed_at: issue?.closed_at || null,
    closed_by: issue?.closed_by?.login || null,
    closing_state_reason: issue.state_reason || null,
  };
  return {
    id,
    created_date,
    modified_date,
    data,
  };
}

export function normalizeGitHubComments(comment: GitHubComment): NormalizedItem {
  
  const id = comment?.id?.toString(); 
  const created_date = comment?.created_at || DEFAULT_DATE;
  const modified_date = comment?.updated_at || DEFAULT_DATE;
  
  const data = {
    body: [ transformCommentBody(comment?.body) || null ],
    html_url: comment?.html_url || null,
    issue_url: comment?.issue_url || null,
    user_id: comment?.user?.login,
    author_association: comment?.author_association || null,
  };
  return {
    id,
    created_date,
    modified_date,
    data,
  };
}
