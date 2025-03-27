import { ExtractorEventType, processTask, SyncMode, WorkerAdapter } from '@devrev/ts-adaas';
import { ZohoClient } from '../zoho/client';
import { getItemTypesToExtract, initialState, repos, ZohoRateLimitError } from '../zoho/helper';
import {
  ExtractorState,
  ExtractorStateBase,
  ItemType,
  ItemTypeToExtract,
  ZohoGlobals,
  ZohoIssue,
  ZohoTask,
  ZohoUser,
} from '../zoho/types';

/**
 * Get global configuration parameters from the event
 */
function getZohoGlobalsFromEvent(event: any): ZohoGlobals {
  return {
    accessToken: event.payload.connection_data.key,
    devRevBaseUrl: event.execution_metadata?.devrev_endpoint,
    devOrgId: event.context?.dev_oid,
    snapInId: event.context?.snap_in_id,
  };
}

// Type guard function to check if an object is an ExtractorStateBase
function isExtractorStateBase(obj: any): obj is ExtractorStateBase {
  return obj && typeof obj === 'object' && 'complete' in obj && 'page' in obj;
}

/**
 * Reset item states for incremental sync
 */
function resetItemStates(state: ExtractorState, itemTypes: ItemType[]) {
  for (const itemType of itemTypes) {
    const stateItem = state[itemType];
    if (stateItem && isExtractorStateBase(stateItem)) {
      stateItem.complete = false;
      stateItem.page = 1;
    }
  }
}

processTask<ExtractorState>({
  task: async ({ adapter }: { adapter: WorkerAdapter<ExtractorState> }) => {
    // Initialize repositories - make sure this is correctly initializing all repos
    adapter.initializeRepos(repos);

    // Log the item types we have in repos array for debugging
    console.log(
      'Repository item types:',
      repos.map((repo) => repo)
    );

    console.log('Adapter state:', adapter.state);

    // If state is not initialized, use the default initial state
    if (!adapter.state) {
      adapter.state = { ...initialState };
    }

    let stop = false;
    const itemTypesToExtract = getItemTypesToExtract();

    // Debug log the item types to extract
    console.log(
      'Item types to extract:',
      itemTypesToExtract.map((item) => item.name)
    );

    // Handle incremental sync mode (similar to GitHub implementation)
    if (adapter.event.payload.event_context.mode === SyncMode.INCREMENTAL) {
      adapter.state.lastSyncStarted = new Date().toISOString();
      console.log('Incremental extraction, setting complete to false for all item types.');

      // Reset each item type state (with type safety)
      for (const itemTypeToExtract of itemTypesToExtract) {
        const itemState = adapter.state[itemTypeToExtract.name];
        if (isExtractorStateBase(itemState)) {
          itemState.complete = false;
          itemState.page = 1;
        }
      }
    }

    // Get global parameters from event context
    const globals = getZohoGlobalsFromEvent(adapter.event);
    console.log('Using accessToken with length:', globals.accessToken?.length);

    // Parse sync unit identifiers
    console.log('External sync unit ID:', adapter.event.payload?.event_context?.external_sync_unit_id);
    console.log('Sync unit name:', adapter.event.payload?.event_context?.external_sync_unit_name);

    // First try the ID split approach (using underscore separator)
    let [portalId, projectId] = adapter.event.payload?.event_context?.external_sync_unit_id?.split('_') || [];

    // If that fails, try alternative approaches
    if (!portalId || !projectId) {
      // Try using the external_sync_unit_id as projectId directly
      projectId = adapter.event.payload?.event_context?.external_sync_unit_id || '';

      // Try using the name parts
      const nameParts = adapter.event.payload?.event_context?.external_sync_unit_name?.split(' - ') || [];
      if (nameParts.length >= 2) {
        console.log('Attempting to determine IDs from name parts');
        portalId = adapter.event.payload?.event_context?.external_sync_unit_id;
      }
    }

    console.log('Using portalId:', portalId);
    console.log('Using projectId:', projectId);

    if (!portalId || !projectId) {
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: {
          message: 'Portal ID or Project ID is missing in the event context.',
        },
      });
      return;
    }

    // Initialize client
    const client = new ZohoClient({
      accessToken: globals.accessToken,
      portalId,
      projectId,
    });

    console.log('Initialized Zoho client with portal ID:', client.portalId, 'and project ID:', client.projectId);

    // Validate that repositories exist for all item types
    for (const itemType of Object.values(ItemType)) {
      const repo = adapter.getRepo(itemType);
      if (!repo) {
        console.warn(`Repository for ${itemType} is not initialized!`);
      } else {
        console.log(`Repository for ${itemType} is available`);
      }
    }

    // Extract each item type (ensure we're handling all needed types)
    for (const itemTypeToExtract of itemTypesToExtract) {
      if (stop) {
        break;
      }

      const itemState = adapter.state[itemTypeToExtract.name];
      if (isExtractorStateBase(itemState) && !itemState.complete) {
        console.log(`Extracting ${itemTypeToExtract.name}...`);

        switch (itemTypeToExtract.name) {
          case ItemType.USERS:
            stop = await extractUsers(adapter, client);
            break;
          case ItemType.ISSUES:
            stop = await extractIssues(adapter, client);
            break;
          case ItemType.TASKS:
            stop = await extractTasks(adapter, client);
            break;
          default:
            console.log(`No extraction handler for item type: ${itemTypeToExtract.name}`);
        }
      } else {
        console.log(
          `Skipping ${itemTypeToExtract.name}: complete=${
            isExtractorStateBase(itemState) ? itemState.complete : 'unknown'
          }`
        );
      }
    }

    // Extract comments if we have issues or tasks
    if (!stop && adapter.state.extractedIssues && adapter.state.extractedIssues.length > 0) {
      console.log(`--- Extracting Issue Comments for ${adapter.state.extractedIssues.length} issues ---`);
      stop = await extractIssueComments(adapter, client);
    } else {
      console.log('No issues to extract comments for');
    }

    if (!stop && adapter.state.extractedTasks && adapter.state.extractedTasks.length > 0) {
      console.log(`--- Extracting Task Comments for ${adapter.state.extractedTasks.length} tasks ---`);
      stop = await extractTaskComments(adapter, client);
    } else {
      console.log('No tasks to extract comments for');
    }

    // Emit completion event if everything was processed successfully
    if (!stop) {
      await adapter.emit(ExtractorEventType.ExtractionDataDone);
    }
  },
  onTimeout: async ({ adapter }: { adapter: WorkerAdapter<ExtractorState> }) => {
    await adapter.postState();
    await adapter.emit(ExtractorEventType.ExtractionDataProgress, {
      progress: 50,
    });
  },
});

/**
 * Extract and process users
 */
async function extractUsers(adapter: WorkerAdapter<ExtractorState>, client: ZohoClient): Promise<boolean> {
  try {
    console.log('Fetching users from Zoho');
    const response = await client.getUsers(client.portalId, client.projectId);
    console.log(
      'User API response structure:',
      JSON.stringify(response?.data || {}, null, 2).substring(0, 200) + '...'
    );

    const users = response?.data?.users;

    if (!users || users.length === 0) {
      console.log('No users found');
      const userState = adapter.state[ItemType.USERS];
      if (isExtractorStateBase(userState)) {
        userState.complete = true;
      }
      return false;
    }

    console.log(`Found ${users.length} users`);

    // Push users to repository
    const repo = adapter.getRepo(ItemType.USERS);
    if (!repo) {
      console.error('Users repository not found');
      return true;
    }

    try {
      await repo.push(users);
      console.log(`Successfully pushed ${users.length} users to repository`);
    } catch (pushError) {
      console.error('Error pushing users to repository:', pushError);
      return true;
    }

    const userState = adapter.state[ItemType.USERS];
    if (isExtractorStateBase(userState)) {
      userState.complete = true;
    }
    return false;
  } catch (error) {
    if (error instanceof ZohoRateLimitError) {
      console.log(`Rate limit reached. Reset in ${error.delay} milliseconds`);
      await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
        delay: error.delay,
      });
      return true;
    }

    console.error('Error extracting users:', error);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
    return true;
  }
}

/**
 * Extract and process bugs/issues
 */
async function extractIssues(adapter: WorkerAdapter<ExtractorState>, client: ZohoClient): Promise<boolean> {
  try {
    console.log('Fetching bugs/issues from Zoho');
    const response = await client.getIssues(client.portalId, client.projectId);
    console.log(
      'Issues API response structure:',
      JSON.stringify(response?.data || {}, null, 2).substring(0, 200) + '...'
    );

    const issues = response?.data?.issues;

    if (!issues || issues.length === 0) {
      console.log('No bugs/issues found');
      const issueState = adapter.state[ItemType.ISSUES];
      if (isExtractorStateBase(issueState)) {
        issueState.complete = true;
      }
      return false;
    }

    console.log(`Found ${issues.length} bugs/issues`);

    // Log a sample issue to help with debugging
    if (issues.length > 0) {
      console.log('Sample bug/issue structure:', JSON.stringify(issues[0], null, 2));
    }

    // Push issues to repository
    const repo = adapter.getRepo(ItemType.ISSUES);
    if (!repo) {
      console.error('Issues repository not found');
      return true;
    }

    try {
      await repo.push(issues);
      console.log(`Successfully pushed ${issues.length} issues to repository`);
    } catch (pushError) {
      console.error('Error pushing issues to repository:', pushError);
      return true;
    }

    // Store issue IDs for later comment extraction
    const issueIds = issues.map((issue) => {
      const id = String(issue.id_string);
      console.log(`Extracted bug/issue ID: ${id}`);
      return id;
    });

    // Initialize extractedIssues array if it doesn't exist
    if (!adapter.state.extractedIssues) {
      adapter.state.extractedIssues = [];
    }

    adapter.state.extractedIssues = issueIds;
    console.log(`Added ${issueIds.length} bug/issue IDs to extraction queue`);

    const issueState = adapter.state[ItemType.ISSUES];
    if (isExtractorStateBase(issueState)) {
      issueState.complete = true;
    }
    return false;
  } catch (error) {
    if (error instanceof ZohoRateLimitError) {
      console.log(`Rate limit reached. Reset in ${error.delay} milliseconds`);
      await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
        delay: error.delay,
      });
      return true;
    }

    console.error('Error extracting bugs/issues:', error);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
    return true;
  }
}

/**
 * Extract and process bug/issue comments
 */
async function extractIssueComments(adapter: WorkerAdapter<ExtractorState>, client: ZohoClient): Promise<boolean> {
  try {
    // Guard against undefined extractedIssues
    if (!adapter.state.extractedIssues) {
      console.log('extractedIssues is undefined, initializing empty array');
      adapter.state.extractedIssues = [];
    }

    const issueIds = [...adapter.state.extractedIssues];
    console.log(`Processing comments for ${issueIds.length} bugs/issues`);
    adapter.state.extractedIssues = []; // Clear for next round

    let commentsPushed = 0;

    for (const issueId of issueIds) {
      try {
        const cleanIssueId = typeof issueId === 'string' ? issueId : String(issueId);
        console.log(`Fetching comments for bug/issue: ${cleanIssueId}`);

        const response = await client.getIssueComments(client.portalId, client.projectId, cleanIssueId);
        console.log(
          `Comments API response for issue ${cleanIssueId}:`,
          JSON.stringify(response?.data || {}, null, 2).substring(0, 200) + '...'
        );

        if (response?.data?.comments?.length > 0) {
          console.log(`Found ${response.data.comments.length} comments for bug/issue ${cleanIssueId}`);

          const comments = response.data.comments.map((comment) => ({
            ...comment,
            parent_Issue_Id: cleanIssueId,
          }));

          // Add additional debugging
          console.log(`Debug - Issue comment structure before pushing:`, JSON.stringify(comments[0], null, 2));

          const repo = adapter.getRepo(ItemType.ISSUE_COMMENTS);
          if (!repo) {
            console.error('Issue comments repository not found');
            continue;
          }

          try {
            await repo.push(comments);
            commentsPushed += comments.length;
            console.log(`Successfully pushed ${comments.length} comments for issue ${cleanIssueId}`);
          } catch (pushError) {
            console.error(`Error pushing comments for issue ${cleanIssueId}:`, pushError);
          }
        } else {
          console.log(`No comments found for bug/issue ${cleanIssueId}`);
        }
      } catch (error) {
        if (error instanceof ZohoRateLimitError) {
          // Put remaining IDs back in the queue
          adapter.state.extractedIssues.push(...issueIds.slice(issueIds.indexOf(issueId)));
          console.log(`Rate limit reached. Reset in ${error.delay} milliseconds`);
          await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
            delay: error.delay,
          });
          return true;
        }

        console.error(`Error fetching comments for bug/issue ${issueId}:`, error);
      }
    }

    const issueCommentsState = adapter.state[ItemType.ISSUE_COMMENTS];
    if (isExtractorStateBase(issueCommentsState)) {
      issueCommentsState.complete = true;
    }

    console.log(`Completed issue comments extraction, pushed ${commentsPushed} comments in total`);
    return false;
  } catch (error) {
    console.error('Error processing bug/issue comments:', error);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
    return true;
  }
}

/**
 * Extract and process tasks
 */
async function extractTasks(adapter: WorkerAdapter<ExtractorState>, client: ZohoClient): Promise<boolean> {
  try {
    console.log('Fetching tasks from Zoho');
    const response = await client.getTasks(client.portalId, client.projectId);
    console.log(
      'Tasks API response structure:',
      JSON.stringify(response?.data || {}, null, 2).substring(0, 200) + '...'
    );

    const tasks = response?.data?.tasks;

    if (!tasks || tasks.length === 0) {
      console.log('No tasks found');
      const taskState = adapter.state[ItemType.TASKS];
      if (isExtractorStateBase(taskState)) {
        taskState.complete = true;
      }
      return false;
    }

    console.log(`Found ${tasks.length} tasks`);

    // Push tasks to repository
    const repo = adapter.getRepo(ItemType.TASKS);
    if (!repo) {
      console.error('Tasks repository not found');
      return true;
    }

    try {
      await repo.push(tasks);
      console.log(`Successfully pushed ${tasks.length} tasks to repository`);
    } catch (pushError) {
      console.error('Error pushing tasks to repository:', pushError);
      return true;
    }

    // Store task IDs for later comment extraction
    const taskIds = tasks.map((task) => {
      const id = String(task.id_string);
      console.log(`Extracted task ID: ${id}`);
      return id;
    });

    // Initialize extractedTasks array if it doesn't exist
    if (!adapter.state.extractedTasks) {
      adapter.state.extractedTasks = [];
    }

    adapter.state.extractedTasks = taskIds;
    console.log(`Added ${taskIds.length} task IDs to extraction queue`);

    const taskState = adapter.state[ItemType.TASKS];
    if (isExtractorStateBase(taskState)) {
      taskState.complete = true;
    }
    return false;
  } catch (error) {
    if (error instanceof ZohoRateLimitError) {
      console.log(`Rate limit reached. Reset in ${error.delay} milliseconds`);
      await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
        delay: error.delay,
      });
      return true;
    }

    console.error('Error extracting tasks:', error);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
    return true;
  }
}

/**
 * Extract and process task comments
 */
async function extractTaskComments(adapter: WorkerAdapter<ExtractorState>, client: ZohoClient): Promise<boolean> {
  try {
    // Guard against undefined extractedTasks
    if (!adapter.state.extractedTasks) {
      console.log('extractedTasks is undefined, initializing empty array');
      adapter.state.extractedTasks = [];
    }

    const taskIds = [...adapter.state.extractedTasks];
    console.log(`Processing comments for ${taskIds.length} tasks`);
    adapter.state.extractedTasks = []; // Clear for next round

    let commentsPushed = 0;

    for (const taskId of taskIds) {
      try {
        const cleanTaskId = typeof taskId === 'string' ? taskId : String(taskId);
        console.log(`Fetching comments for task: ${cleanTaskId}`);

        const response = await client.getTaskComments(client.portalId, client.projectId, cleanTaskId);
        console.log(
          `Comments API response for task ${cleanTaskId}:`,
          JSON.stringify(response?.data || {}, null, 2).substring(0, 200) + '...'
        );

        if (response?.data?.comments?.length > 0) {
          console.log(`Found ${response.data.comments.length} comments for task ${cleanTaskId}`);

          const comments = response.data.comments.map((comment) => ({
            ...comment,
            parent_Task_Id: cleanTaskId,
          }));

          // Add additional debugging
          console.log(`Debug - Task comment structure before pushing:`, JSON.stringify(comments[0], null, 2));

          const repo = adapter.getRepo(ItemType.TASK_COMMENTS);
          if (!repo) {
            console.error('Task comments repository not found');
            continue;
          }

          try {
            await repo.push(comments);
            commentsPushed += comments.length;
            console.log(`Successfully pushed ${comments.length} comments for task ${cleanTaskId}`);
          } catch (pushError) {
            console.error(`Error pushing comments for task ${cleanTaskId}:`, pushError);
          }
        } else {
          console.log(`No comments found for task ${cleanTaskId}`);
        }
      } catch (error) {
        if (error instanceof ZohoRateLimitError) {
          // Put remaining IDs back in the queue
          adapter.state.extractedTasks.push(...taskIds.slice(taskIds.indexOf(taskId)));
          console.log(`Rate limit reached. Reset in ${error.delay} milliseconds`);
          await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
            delay: error.delay,
          });
          return true;
        }

        console.error(`Error fetching comments for task ${taskId}:`, error);
      }
    }

    const taskCommentsState = adapter.state[ItemType.TASK_COMMENTS];
    if (isExtractorStateBase(taskCommentsState)) {
      taskCommentsState.complete = true;
    }

    console.log(`Completed task comments extraction, pushed ${commentsPushed} comments in total`);
    return false;
  } catch (error) {
    console.error('Error processing task comments:', error);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
    return true;
  }
}
