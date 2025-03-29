import { ExtractorEventType, processTask, SyncMode, WorkerAdapter } from '@devrev/ts-adaas';
import { ZohoClient } from '../zoho/client';
import { getItemTypesToExtract, initialState, repos, ZohoRateLimitError } from '../zoho/helper';
import {
  ExtractorState,
  ExtractorStateBase,
  ItemType,
  ZohoGlobals,
} from '../zoho/types';

function getZohoGlobalsFromEvent(event: any): ZohoGlobals {
  return {
    accessToken: event.payload.connection_data.key,
    devRevBaseUrl: event.execution_metadata?.devrev_endpoint,
    devOrgId: event.context?.dev_oid,
    snapInId: event.context?.snap_in_id,
  };
}

function isExtractorStateBase(obj: any): obj is ExtractorStateBase {
  return obj && typeof obj === 'object' && 'complete' in obj && 'page' in obj;
}

processTask<ExtractorState>({
  task: async ({ adapter }: { adapter: WorkerAdapter<ExtractorState> }) => {
    // Initialize repositories - make sure this is correctly initializing all repos
    adapter.initializeRepos(repos); 

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
    console.log('Sync unit name:', adapter.event.payload?.event_context?.external_sync_unit_name);

    // First try the ID split approach (using underscore separator)
    let [portalId, projectId] = adapter.event.payload?.event_context?.external_sync_unit_id?.split('_') || [];

    // If that fails, try alternative approaches
    if (!portalId || !projectId) {
      projectId = adapter.event.payload?.event_context?.external_sync_unit_id || '';

      const nameParts = adapter.event.payload?.event_context?.external_sync_unit_name?.split(' - ') || [];
      if (nameParts.length >= 2) {
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

    const client = new ZohoClient({
      accessToken: globals.accessToken,
      portalId,
      projectId,
    });

    // Extract each item type (ensure we're handling all needed types)
    for (const itemTypeToExtract of itemTypesToExtract) {
      if (stop) {
        break;
      }

      const itemState = adapter.state[itemTypeToExtract.name];
      if (isExtractorStateBase(itemState) && !itemState.complete) {
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

async function extractUsers(adapter: WorkerAdapter<ExtractorState>, client: ZohoClient): Promise<boolean> {
  try {
    const response = await client.getUsers(client.portalId, client.projectId);
    const users = response?.data;

    if (!users || users.length === 0) {
      const userState = adapter.state[ItemType.USERS];
      if (isExtractorStateBase(userState)) {
        userState.complete = true;
      }
      return false;
    }

    console.log(`Found ${users.length} users`);

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
      console.log(
        `Rate limit reached in extractUsers: Made 100 API requests. Waiting ${
          error.delay / 1000
        } seconds before continuing.`
      );
      console.log(`API call count at rate limit: ${client.getApiCallCount ? client.getApiCallCount() : 'unknown'}`);
      console.log(`Timestamp before delay: ${new Date().toISOString()}`);
      await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
        delay: error.delay,
      });
      console.log(`Timestamp after delay event: ${new Date().toISOString()}`);
      return true;
    }

    console.error('Error extracting users:', error);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
    return true;
  }
}

async function extractIssues(adapter: WorkerAdapter<ExtractorState>, client: ZohoClient): Promise<boolean> {
  try {
    const response = await client.getIssues(client.portalId, client.projectId);
    const issues = response?.data;

    if (!issues || issues.length === 0) {
      const issueState = adapter.state[ItemType.ISSUES];
      if (isExtractorStateBase(issueState)) {
        issueState.complete = true;
      }
      return false;
    }

    console.log(`Found ${issues.length} bugs/issues across ${response.lastPage} pages`);

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

    const issueIds = issues.map((issue) => {
      const id = String(issue.id_string);
      console.log(`Extracted bug/issue ID: ${id}`);
      return id;
    });

    if (!adapter.state.extractedIssues) {
      adapter.state.extractedIssues = [];
    }

    adapter.state.extractedIssues = issueIds;

    const issueState = adapter.state[ItemType.ISSUES];
    if (isExtractorStateBase(issueState)) {
      issueState.page = response.lastPage;
      issueState.complete = true;
    }
    return false;
  } catch (error) {
    if (error instanceof ZohoRateLimitError) {
      console.log(
        `Rate limit reached in extractIssues: Made 100 API requests. Waiting ${
          error.delay / 1000
        } seconds before continuing.`
      );
      console.log(`API call count at rate limit: ${client.getApiCallCount ? client.getApiCallCount() : 'unknown'}`);
      console.log(`Timestamp before delay: ${new Date().toISOString()}`);

      await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
        delay: error.delay,
      });
      console.log(`Timestamp after delay event: ${new Date().toISOString()}`);
      return true;
    }

    console.error('Error extracting bugs/issues:', error);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
    return true;
  }
}

async function extractIssueComments(adapter: WorkerAdapter<ExtractorState>, client: ZohoClient): Promise<boolean> {
  try {
    if (!adapter.state.extractedIssues) {
      adapter.state.extractedIssues = [];
    }

    const issueIds = [...adapter.state.extractedIssues];
    console.log(`Starting to process comments for ${issueIds.length} bugs/issues`);
    adapter.state.extractedIssues = [];

    let totalCommentsPushed = 0;
    let totalProcessed = 0;
    let batchNumber = 1;

    while (totalProcessed < issueIds.length) {
      const currentApiCalls = client.getApiCallCount ? client.getApiCallCount() : 0;
      console.log(`--- Processing batch ${batchNumber} of issue comments. Current API calls: ${currentApiCalls} ---`);

      const safeApiCallsRemaining = Math.max(0, 90 - currentApiCalls);

      if (safeApiCallsRemaining < 10) {
        console.log(`Already at ${currentApiCalls} API calls, waiting 2 minutes before next batch`);
        await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000));
        batchNumber++;
        continue; 
      }

      const batchSize = safeApiCallsRemaining;
      const endIndex = Math.min(totalProcessed + batchSize, issueIds.length);
      const batchIds = issueIds.slice(totalProcessed, endIndex);
      let batchCommentsPushed = 0;
      let batchApiCalls = 0;

      for (const issueId of batchIds) {
        const cleanIssueId = typeof issueId === 'string' ? issueId : String(issueId);
        try {
          const apiCallsBefore = client.getApiCallCount ? client.getApiCallCount() : 0;
          const response = await client.getIssueComments(client.portalId, client.projectId, cleanIssueId);
          const apiCallsAfter = client.getApiCallCount ? client.getApiCallCount() : 0;
          batchApiCalls += apiCallsAfter - apiCallsBefore;

          if (response?.data?.comments?.length > 0) {
            const comments = response.data.comments.map((comment) => ({
              ...comment,
              parent_Issue_Id: cleanIssueId,
            }));

            const repo = adapter.getRepo(ItemType.ISSUE_COMMENTS);
            if (repo) {
              await repo.push(comments);
              batchCommentsPushed += comments.length;
            } else {
              console.error('Issue comments repository not found');
            }
          } else {
            // Do nothing
          }

          if (client.getApiCallCount && client.getApiCallCount() >= 85) {
            console.log(`Approaching API call limit (${client.getApiCallCount()}), stopping batch early`);
            break;
          }
        } catch (error) {
          console.error(`Error processing comments for issue ${issueId}:`, error);

          // If we hit a rate limit despite our precautions, save state and exit
          if (error instanceof ZohoRateLimitError) {
            console.log(`Rate limit reached despite precautions. Saving state and stopping.`);
            adapter.state.extractedIssues = issueIds.slice(totalProcessed);
            return true;
          }
        }
      }

      totalProcessed += batchIds.length;
      totalCommentsPushed += batchCommentsPushed;

      console.log(`Completed batch ${batchNumber}. Pushed ${batchCommentsPushed} comments in this batch.`);
      console.log(
        `Total progress: ${totalProcessed}/${issueIds.length} issues processed (${Math.floor(
          (totalProcessed / issueIds.length) * 100
        )}%)`
      );

      if (totalProcessed < issueIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000));
      }

      batchNumber++;
    }

    console.log(`Completed all issue comment extraction. Total comments pushed: ${totalCommentsPushed}`);

    const issueCommentsState = adapter.state[ItemType.ISSUE_COMMENTS];
    if (isExtractorStateBase(issueCommentsState)) {
      issueCommentsState.complete = true;
    }

    return false; 
  } catch (error) {
    console.error('Error in issue comments extraction:', error);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
    return true; 
  }
}

async function extractTasks(adapter: WorkerAdapter<ExtractorState>, client: ZohoClient): Promise<boolean> {
  try {
    console.log('Fetching tasks from Zoho - API call #', client.getApiCallCount ? client.getApiCallCount() : 'unknown');
    const response = await client.getTasks(client.portalId, client.projectId);
    const tasks = response?.data;

    if (!tasks || tasks.length === 0) {
      console.log('No tasks found');
      const taskState = adapter.state[ItemType.TASKS];
      if (isExtractorStateBase(taskState)) {
        taskState.complete = true;
      }
      return false;
    }

    console.log(`Found ${tasks.length} tasks across ${response.lastPage} pages`);

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

    const taskIds = tasks.map((task) => {
      const id = String(task.id_string);
      console.log(`Extracted task ID: ${id}`);
      return id;
    });

    if (!adapter.state.extractedTasks) {
      adapter.state.extractedTasks = [];
    }
    adapter.state.extractedTasks = taskIds;
    
    const taskState = adapter.state[ItemType.TASKS];

    if (isExtractorStateBase(taskState)) {
      taskState.page = response.lastPage;
      taskState.complete = true;
    }
    return false;
  } catch (error) {
    if (error instanceof ZohoRateLimitError) {
      console.log(
        `Rate limit reached in extractTasks: Made 100 API requests. Waiting ${
          error.delay / 1000
        } seconds before continuing.`
      );
      await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
        delay: error.delay,
      });
      console.log(`Timestamp after delay event: ${new Date().toISOString()}`);
      return true;
    }

    console.error('Error extracting tasks:', error);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
    return true;
  }
}

async function extractTaskComments(adapter: WorkerAdapter<ExtractorState>, client: ZohoClient): Promise<boolean> {
  try {
    if (!adapter.state.extractedTasks) {
      adapter.state.extractedTasks = [];
    }

    const taskIds = [...adapter.state.extractedTasks];
    console.log(`Starting to process comments for ${taskIds.length} tasks`);

    adapter.state.extractedTasks = [];

    let totalCommentsPushed = 0;
    let totalProcessed = 0;
    let batchNumber = 1;

    while (totalProcessed < taskIds.length) {
      const currentApiCalls = client.getApiCallCount ? client.getApiCallCount() : 0;
      console.log(`--- Processing batch ${batchNumber} of task comments. Current API calls: ${currentApiCalls} ---`);

      const safeApiCallsRemaining = Math.max(0, 90 - currentApiCalls);

      if (safeApiCallsRemaining < 10) {
        console.log(`Already at ${currentApiCalls} API calls, waiting 2 minutes before next batch`);
        await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000));
        batchNumber++;
        continue; 
      }

      const batchSize = safeApiCallsRemaining;
      const endIndex = Math.min(totalProcessed + batchSize, taskIds.length);
      const batchIds = taskIds.slice(totalProcessed, endIndex);
      let batchCommentsPushed = 0;
      let batchApiCalls = 0;

      for (const taskId of batchIds) {
        const cleanTaskId = typeof taskId === 'string' ? taskId : String(taskId);
        try {
          const apiCallsBefore = client.getApiCallCount ? client.getApiCallCount() : 0;
          const response = await client.getTaskComments(client.portalId, client.projectId, cleanTaskId);
          const apiCallsAfter = client.getApiCallCount ? client.getApiCallCount() : 0;
          batchApiCalls += apiCallsAfter - apiCallsBefore;

          if (response?.data?.comments?.length > 0) {
            const comments = response.data.comments.map((comment) => ({
              ...comment,
              parent_Task_Id: cleanTaskId,
            }));
            const repo = adapter.getRepo(ItemType.TASK_COMMENTS);
            if (repo) {
              await repo.push(comments);
              batchCommentsPushed += comments.length;
              console.log(`Successfully pushed ${comments.length} comments for task ${cleanTaskId}`);
            } else {
              console.error('Task comments repository not found');
            }
          } else {
            console.log(`No comments found for task ${cleanTaskId}`);
          }

          if (client.getApiCallCount && client.getApiCallCount() >= 85) {
            console.log(`Approaching API call limit (${client.getApiCallCount()}), stopping batch early`);
            break;
          }
        } catch (error) {
          console.error(`Error processing comments for task ${taskId}:`, error);

          if (error instanceof ZohoRateLimitError) {
            console.log(`Rate limit reached despite precautions. Saving state and stopping.`);
            adapter.state.extractedTasks = taskIds.slice(totalProcessed);
            return true;
          }
        }
      }

      totalProcessed += batchIds.length;
      totalCommentsPushed += batchCommentsPushed;

      console.log(`Completed batch ${batchNumber}. Pushed ${batchCommentsPushed} comments in this batch.`);
      console.log(
        `Total progress: ${totalProcessed}/${taskIds.length} tasks processed (${Math.floor(
          (totalProcessed / taskIds.length) * 100
        )}%)`
      );

      if (totalProcessed < taskIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000));
      }
      batchNumber++;
    }

    console.log(`Completed all task comment extraction. Total comments pushed: ${totalCommentsPushed}`);

    const taskCommentsState = adapter.state[ItemType.TASK_COMMENTS];
    if (isExtractorStateBase(taskCommentsState)) {
      taskCommentsState.complete = true;
    }

    return false; 
  } catch (error) {
    console.error('Error in task comments extraction:', error);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
    return true; 
  }
}
