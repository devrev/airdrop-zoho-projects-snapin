import { ExtractorEventType, processTask, SyncMode, WorkerAdapter } from '@devrev/ts-adaas';
import { ZohoClient } from './client';
import { getItemTypesToExtract, repos, ZohoRateLimitError } from './helper';
import {
  ExtractorState,
  ItemType,
  ItemTypeToExtract,
  ZohoAPIResponse,
  ZohoConfig,
  ZohoIssue,
  ZohoTask,
  ZohoUser,
} from './types';

processTask<ExtractorState>({
  task: async ({ adapter }) => {
    adapter.initializeRepos(repos);

    let stop = false;
    const itemTypesToExtract = getItemTypesToExtract();

    if (adapter.event.payload.event_context.mode === SyncMode.INCREMENTAL) {
      adapter.state.lastSyncStarted = new Date().toISOString();
      console.log('Incremental extraction, setting complete to false for all item types.');
      for (const itemTypeToExtract of itemTypesToExtract) {
        const itemType = itemTypeToExtract.name as keyof ExtractorState;
        adapter.state[itemType].complete = false;
        adapter.state[itemType].page = 1;
      }
    }

    const config: ZohoConfig = {
      accessToken: adapter.event.payload.connection_data.key,
      portalId: adapter.state.portal_id,
      projectId: adapter.state.project_id,
    };
    const client = new ZohoClient(config);

    for (const itemTypeToExtract of itemTypesToExtract) {
      if (stop) break;

      if (!adapter.state[itemTypeToExtract.name].complete) {
        stop = await extractList(adapter, client, itemTypeToExtract);
      }
    }

    if (!stop && (adapter.state.extractedTasks.length > 0 || adapter.state.extractedIssues.length > 0)) {
      stop = await extractComments(adapter, client);
    }

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

async function extractList(
  adapter: WorkerAdapter<ExtractorState>,
  client: ZohoClient,
  itemTypeToExtract: ItemTypeToExtract
): Promise<boolean> {
  console.log(`Extracting ${itemTypeToExtract.name}`);

  try {
    let response: ZohoAPIResponse<any>;

    switch (itemTypeToExtract.name) {
      case ItemType.USERS:
        response = await client.getUsers();
        break;
      case ItemType.TASKS:
        response = await client.getTasks();
        break;
      case ItemType.ISSUES:
        response = await client.getIssues();
        break;
      default:
        return false;
    }

    const items = response.data;
    if (!items || (Array.isArray(items) && items.length === 0)) {
      console.log(`No more data of type ${itemTypeToExtract.name} to extract. Setting state complete.`);
      adapter.state[itemTypeToExtract.name].complete = true;
      return false;
    }

    try {
      await adapter.getRepo(itemTypeToExtract.name)?.push(Array.isArray(items) ? items : [items]);
    } catch (error) {
      console.error(`Error pushing ${itemTypeToExtract.name}:`, error);
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
      return true;
    }

    if (itemTypeToExtract.name === ItemType.TASKS) {
      const tasks = Array.isArray(items) ? items : [items];
      adapter.state.extractedTasks.push(...tasks.map((task) => String(task.id)));
    } else if (itemTypeToExtract.name === ItemType.ISSUES) {
      const issues = Array.isArray(items) ? items : [items];
      adapter.state.extractedIssues.push(...issues.map((issue) => issue.id));
    }

    adapter.state[itemTypeToExtract.name].complete = true;
    return false;
  } catch (error) {
    if (error instanceof ZohoRateLimitError) {
      console.log(`Rate limit reached. Reset in ${error.delay} milliseconds`);
      await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
        delay: error.delay,
      });
      return true;
    }

    console.error(`Error extracting ${itemTypeToExtract.name}:`, error);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
    return true;
  }
}

async function extractComments(adapter: WorkerAdapter<ExtractorState>, client: ZohoClient): Promise<boolean> {
  console.log('Extracting comments');

  // Extract task comments
  while (adapter.state.extractedTasks.length > 0) {
    const taskId = adapter.state.extractedTasks[0];
    try {
      const response = await client.getTaskComments(taskId);
      if (response.data.comments && response.data.comments.length > 0) {
        await adapter.getRepo(ItemType.COMMENTS)?.push(response.data.comments);
      }
      adapter.state.extractedTasks.shift();
    } catch (error) {
      if (error instanceof ZohoRateLimitError) {
        console.log(`Rate limit reached. Reset in ${error.delay} milliseconds`);
        await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
          delay: error.delay,
        });
        return true;
      }
      console.error(`Error fetching comments for task ${taskId}:`, error);
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
      return true;
    }
  }

  // Extract issue comments
  while (adapter.state.extractedIssues.length > 0) {
    const issueId = adapter.state.extractedIssues[0];
    try {
      const response = await client.getIssueComments(issueId);
      if (response.data.comments && response.data.comments.length > 0) {
        await adapter.getRepo(ItemType.COMMENTS)?.push(response.data.comments);
      }
      adapter.state.extractedIssues.shift();
    } catch (error) {
      if (error instanceof ZohoRateLimitError) {
        console.log(`Rate limit reached. Reset in ${error.delay} milliseconds`);
        await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
          delay: error.delay,
        });
        return true;
      }
      console.error(`Error fetching comments for issue ${issueId}:`, error);
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
      return true;
    }
  }

  adapter.state[ItemType.COMMENTS].complete = true;
  return false;
}
