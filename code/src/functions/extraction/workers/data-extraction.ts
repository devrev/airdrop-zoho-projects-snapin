import { ExtractorEventType, processTask, SyncMode, WorkerAdapter } from '@devrev/ts-adaas';
import { ZohoClient } from '../zoho/client';
import { initialState, repos, ZohoRateLimitError } from '../zoho/helper';
import {
  ExtractorState,
  ExtractorStateBase,
  ItemType,
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
  task: async ({ adapter }) => {
    adapter.initializeRepos(repos);

    // Initialize the state
    if (!adapter.state) {
      adapter.state = {} as ExtractorState;
    }

    // Initialize base state properties
    adapter.state.lastSyncStarted = adapter.state.lastSyncStarted || '';
    adapter.state.lastSuccessfulSyncStarted = adapter.state.lastSuccessfulSyncStarted || '';
    adapter.state.portal_id = adapter.state.portal_id || '';
    adapter.state.project_id = adapter.state.project_id || '';

    // Initialize extraction arrays
    adapter.state.extractedTasks = adapter.state.extractedTasks || [];
    adapter.state.extractedIssues = adapter.state.extractedIssues || [];

    // Explicitly initialize each item type state
    adapter.state[ItemType.USERS] = adapter.state[ItemType.USERS] || { complete: false, page: 1 };
    adapter.state[ItemType.TASKS] = adapter.state[ItemType.TASKS] || { complete: false, page: 1 };
    adapter.state[ItemType.ISSUES] = adapter.state[ItemType.ISSUES] || { complete: false, page: 1 };
    adapter.state[ItemType.TASK_COMMENTS] = adapter.state[ItemType.TASK_COMMENTS] || { complete: false, page: 1 };
    adapter.state[ItemType.ISSUE_COMMENTS] = adapter.state[ItemType.ISSUE_COMMENTS] || { complete: false, page: 1 };

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

    // Handle incremental sync mode
    if (adapter.event.payload.event_context.mode === SyncMode.INCREMENTAL) {
      adapter.state.lastSyncStarted = new Date().toISOString();
      console.log('Incremental extraction, setting complete to false for all item types.');
      resetItemStates(adapter.state, [
        ItemType.USERS,
        ItemType.ISSUES,
        ItemType.ISSUE_COMMENTS,
        ItemType.TASKS,
        ItemType.TASK_COMMENTS,
      ]);
    }

    // Initialize client
    const client = new ZohoClient({
      accessToken: globals.accessToken,
      portalId,
      projectId,
    });

    console.log('Initialized Zoho client with portal ID:', client.portalId, 'and project ID:', client.projectId);

    // Sequential extraction in the specified order
    let stop = false;

    // 1. Extract Users
    if (!stop) {
      console.log('--- STEP 1: Extracting Users ---');
      stop = await extractUsers(adapter, client);
    }

    // 2. Extract Bugs/Issues
    if (!stop) {
      console.log('--- STEP 2: Extracting Bugs/Issues ---');
      stop = await extractIssues(adapter, client);
    }

    // 3. Extract Bug/Issue Comments
    if (!stop && adapter.state.extractedIssues.length > 0) {
      console.log('--- STEP 3: Extracting Bug/Issue Comments ---');
      stop = await extractIssueComments(adapter, client);
    }

    // 4. Extract Tasks
    if (!stop) {
      console.log('--- STEP 4: Extracting Tasks ---');
      stop = await extractTasks(adapter, client);
    }

    // 5. Extract Task Comments
    if (!stop && adapter.state.extractedTasks.length > 0) {
      console.log('--- STEP 5: Extracting Task Comments ---');
      stop = await extractTaskComments(adapter, client);
    }

    // Emit completion event if everything was processed successfully
    if (!stop) {
      await adapter.emit(ExtractorEventType.ExtractionDataDone);
    }
  },
  onTimeout: async ({ adapter }) => {
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
    const users = response.data.users;

    if (!users || users.length === 0) {
      console.log('No users found');
      adapter.state[ItemType.USERS].complete = true;
      return false;
    }

    console.log(`Found ${users.length} users`);

    // Push users to repository
    const repo = adapter.getRepo(ItemType.USERS);
    if (!repo) {
      console.error('Users repository not found');
      return true;
    }

    await repo.push(users);
    adapter.state[ItemType.USERS].complete = true;
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
    const issues = response.data.issues;

    if (!issues || issues.length === 0) {
      console.log('No bugs/issues found');
      adapter.state[ItemType.ISSUES].complete = true;
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

    await repo.push(issues);

    // Store issue IDs for later comment extraction
    const issueIds = issues.map((issue) => {
      const id = String(issue.id_string);
      console.log(`Extracted bug/issue ID: ${id}`);
      return id;
    });

    adapter.state.extractedIssues = issueIds;
    console.log(`Added ${issueIds.length} bug/issue IDs to extraction queue`);

    adapter.state[ItemType.ISSUES].complete = true;
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
    const issueIds = [...adapter.state.extractedIssues];
    console.log(`Processing comments for ${issueIds.length} bugs/issues`);
    adapter.state.extractedIssues = []; // Clear for next round

    for (const issueId of issueIds) {
      try {
        const cleanIssueId = typeof issueId === 'string' ? issueId : String(issueId);
        console.log(`Fetching comments for bug/issue: ${cleanIssueId}`);

        const response = await client.getIssueComments(client.portalId, client.projectId, cleanIssueId);
        if (response.data?.comments?.length > 0) {
          console.log(`Found ${response.data.comments.length} comments for bug/issue ${cleanIssueId}`);

          const comments = response.data.comments.map((comment) => ({
            ...comment,
            parent_Issue_Id: cleanIssueId,
          }));

          await adapter.getRepo(ItemType.ISSUE_COMMENTS)?.push(comments);
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

    adapter.state[ItemType.ISSUE_COMMENTS].complete = true;
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
    const tasks = response.data.tasks;

    if (!tasks || tasks.length === 0) {
      console.log('No tasks found');
      adapter.state[ItemType.TASKS].complete = true;
      return false;
    }

    console.log(`Found ${tasks.length} tasks`);

    // Push tasks to repository
    const repo = adapter.getRepo(ItemType.TASKS);
    if (!repo) {
      console.error('Tasks repository not found');
      return true;
    }

    await repo.push(tasks);

    // Store task IDs for later comment extraction
    const taskIds = tasks.map((task) => {
      const id = String(task.id_string);
      console.log(`Extracted task ID: ${id}`);
      return id;
    });

    adapter.state.extractedTasks = taskIds;
    console.log(`Added ${taskIds.length} task IDs to extraction queue`);

    adapter.state[ItemType.TASKS].complete = true;
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
    const taskIds = [...adapter.state.extractedTasks];
    console.log(`Processing comments for ${taskIds.length} tasks`);
    adapter.state.extractedTasks = []; // Clear for next round

    for (const taskId of taskIds) {
      try {
        const cleanTaskId = typeof taskId === 'string' ? taskId : String(taskId);
        console.log(`Fetching comments for task: ${cleanTaskId}`);

        const response = await client.getTaskComments(client.portalId, client.projectId, cleanTaskId);
        if (response.data?.comments?.length > 0) {
          console.log(`Found ${response.data.comments.length} comments for task ${cleanTaskId}`);

          const comments = response.data.comments.map((comment) => ({
            ...comment,
            parent_Task_Id: cleanTaskId,
          }));

          await adapter.getRepo(ItemType.TASK_COMMENTS)?.push(comments);
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

    adapter.state[ItemType.TASK_COMMENTS].complete = true;
    return false;
  } catch (error) {
    console.error('Error processing task comments:', error);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
    return true;
  }
}
