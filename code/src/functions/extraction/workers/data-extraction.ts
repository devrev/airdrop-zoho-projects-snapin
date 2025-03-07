import { ExtractorEventType, processTask, SyncMode, WorkerAdapter } from '@devrev/ts-adaas';
import {
  normalizeComment,
  normalizeIssue,
  normalizeTask,
  normalizeUser,
  ZohoClient,
  ZohoExtractorState,
  ZohoItemType,
} from '../zoho/client';
import { NormalizedItem, RepoInterface } from '../zoho/types';

// Constants
const ZOHO_PORTAL_ID = '881214965';
const ZOHO_PROJECT_ID = '2447529000000057070';

// Repos configuration
const repos: RepoInterface[] = [
  {
    itemType: ZohoItemType.ISSUES,
    normalize: normalizeZohoIssue as (record: object) => NormalizedItem,
  },
  {
    itemType: ZohoItemType.TASKS,
    normalize: normalizeZohoTask as (record: object) => NormalizedItem,
  },
  {
    itemType: ZohoItemType.COMMENTS,
    normalize: normalizeComment as (record: object) => NormalizedItem,
  },
  {
    itemType: ZohoItemType.USERS,
    normalize: normalizeZohoUser as (record: object) => NormalizedItem,
  },
];

const getItemTypesToExtract = () =>
  repos.map((repo) => ({
    name: repo.itemType,
    repoName: repo.itemType.toString(),
  }));

processTask<ZohoExtractorState>({
  task: async ({ adapter }) => {
    adapter.initializeRepos(repos);

    let stop = false;
    const itemTypesToExtract = getItemTypesToExtract();

    if (adapter.event.payload.event_context.mode === SyncMode.INCREMENTAL) {
      adapter.state.lastSyncStarted = new Date().toISOString();
      console.log('Incremental extraction, setting complete to false for all item types.');
      for (const itemTypeToExtract of itemTypesToExtract) {
        adapter.state[itemTypeToExtract.name].complete = false;
        adapter.state[itemTypeToExtract.name].page = 1;
      }
    }

    for (const itemTypeToExtract of itemTypesToExtract) {
      if (stop) break;

      if (!adapter.state[itemTypeToExtract.name].complete) {
        stop = await extractList(adapter, itemTypeToExtract);
      }
    }

    if (!stop) {
      if (adapter.state.extractedIssues.length > 0) {
        stop = await extractIssueComments(adapter);
      }

      if (!stop && adapter.state.extractedTasks.length > 0) {
        stop = await extractTaskComments(adapter);
      }
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
  adapter: WorkerAdapter<ZohoExtractorState>,
  itemTypeToExtract: { name: ZohoItemType; repoName: string }
): Promise<boolean> {
  console.log(`Extracting ${itemTypeToExtract.name}`);

  const zohoClient = new ZohoClient({
    accessToken: adapter.event.payload.connection_data.key,
    portalId: ZOHO_PORTAL_ID,
    projectId: ZOHO_PROJECT_ID,
  });

  try {
    let response;
    switch (itemTypeToExtract.name) {
      case ZohoItemType.USERS:
        response = await zohoClient.getUsers(ZOHO_PORTAL_ID, ZOHO_PROJECT_ID);
        break;
      case ZohoItemType.ISSUES:
        response = await zohoClient.getIssues(ZOHO_PORTAL_ID, ZOHO_PROJECT_ID);
        if (response.data.issues) {
          adapter.state.extractedIssues.push(...response.data.issues.map((issue) => issue.id.toString()));
        }
        break;
      case ZohoItemType.TASKS:
        response = await zohoClient.getTasks(ZOHO_PORTAL_ID, ZOHO_PROJECT_ID);
        if (response.data.tasks) {
          adapter.state.extractedTasks.push(...response.data.tasks.map((task) => task.id.toString()));
        }
        break;
    }

    if (!response || !response.data) {
      console.log(`No data found for ${itemTypeToExtract.name}`);
      adapter.state[itemTypeToExtract.name].complete = true;
      return false;
    }

    await adapter
      .getRepo(itemTypeToExtract.repoName)
      ?.push(Array.isArray(response.data) ? response.data : response.data[itemTypeToExtract.name]);

    adapter.state[itemTypeToExtract.name].complete = true;
    return false;
  } catch (error) {
    console.error(`Error extracting ${itemTypeToExtract.name}:`, error);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
    return true;
  }
}

async function extractIssueComments(adapter: WorkerAdapter<ZohoExtractorState>): Promise<boolean> {
  const zohoClient = new ZohoClient({
    accessToken: adapter.event.payload.connection_data.key,
    portalId: ZOHO_PORTAL_ID,
    projectId: ZOHO_PROJECT_ID,
  });

  while (adapter.state.extractedIssues.length > 0) {
    const issueId = adapter.state.extractedIssues[0];

    try {
      const response = await zohoClient.getIssueComments(ZOHO_PORTAL_ID, ZOHO_PROJECT_ID, issueId);
      if (response.data.comments && response.data.comments.length > 0) {
        await adapter.getRepo(ZohoItemType.COMMENTS)?.push(response.data.comments);
      }
    } catch (error) {
      console.error(`Error fetching comments for issue ${issueId}:`, error);
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
      return true;
    }

    adapter.state.extractedIssues.shift();
  }
  return false;
}

async function extractTaskComments(adapter: WorkerAdapter<ZohoExtractorState>): Promise<boolean> {
  const zohoClient = new ZohoClient({
    accessToken: adapter.event.payload.connection_data.key,
    portalId: ZOHO_PORTAL_ID,
    projectId: ZOHO_PROJECT_ID,
  });

  while (adapter.state.extractedTasks.length > 0) {
    const taskId = adapter.state.extractedTasks[0];

    try {
      const response = await zohoClient.getTaskComments(ZOHO_PORTAL_ID, ZOHO_PROJECT_ID, taskId);
      if (response.comments && response.comments.length > 0) {
        await adapter.getRepo(ZohoItemType.COMMENTS)?.push(response.comments);
      }
    } catch (error) {
      console.error(`Error fetching comments for task ${taskId}:`, error);
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
      return true;
    }

    adapter.state.extractedTasks.shift();
  }
  return false;
}
