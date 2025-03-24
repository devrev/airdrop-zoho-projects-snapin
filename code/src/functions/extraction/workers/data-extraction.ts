import { EventType, ExtractorEventType, processTask } from '@devrev/ts-adaas';

import { normalizeAttachment, normalizeIssue, normalizeUser } from '../dummy-extractor/data-normalization';

// Dummy data that originally would be fetched from an external source
const issues = [
  {
    id: 'issue-1',
    created_date: '1999-12-25T01:00:03+01:00',
    modified_date: '1999-12-25T01:00:03+01:00',
    body: '<p>This is issue 1</p>',
    creator: 'user-1',
    owner: 'user-1',
    title: 'Issue 1',
  },
  {
    id: 'issue-2',
    created_date: '1999-12-27T15:31:34+01:00',
    modified_date: '2002-04-09T01:55:31+02:00',
    body: '<p>This is issue 2</p>',
    creator: 'user-2',
    owner: 'user-2',
    title: 'Issue 2',
  },
];

const users = [
  {
    id: 'user-1',
    created_date: '1999-12-25T01:00:03+01:00',
    modified_date: '1999-12-25T01:00:03+01:00',
    data: {
      email: 'johndoe@test.com',
      name: 'John Doe',
    },
  },
  {
    id: 'user-2',
    created_date: '1999-12-27T15:31:34+01:00',
    modified_date: '2002-04-09T01:55:31+02:00',
    data: {
      email: 'janedoe@test.com',
      name: 'Jane Doe',
    },
  },
];

const attachments = [
  {
    url: 'https://app.dev.devrev-eng.ai/favicon.ico',
    id: 'attachment-1',
    file_name: 'dummy.jpg',
    author_id: 'user-1',
    parent_id: 'issue-1',
  },
  {
    url: 'https://app.dev.devrev-eng.ai/favicon.ico',
    id: 'attachment-2',
    file_name: 'dummy.ico',
    author_id: 'user-2',
    parent_id: 'issue-2',
  },
];

const repos = [
  {
    itemType: 'issues',
    normalize: normalizeIssue,
  },
  {
    itemType: 'users',
    normalize: normalizeUser,
  },
  {
    itemType: 'attachments',
    normalize: normalizeAttachment,
  },
];

processTask({
  task: async ({ adapter }) => {
    adapter.initializeRepos(repos);
<<<<<<< Updated upstream
    if (adapter.event.payload.event_type === EventType.ExtractionDataStart) {
      await adapter.getRepo('issues')?.push(issues);
      await adapter.emit(ExtractorEventType.ExtractionDataProgress, {
        progress: 50,
      });
    } else {
      await adapter.getRepo('users')?.push(users);
      await adapter.getRepo('attachments')?.push(attachments);
      await adapter.emit(ExtractorEventType.ExtractionDataDone, {
        progress: 100,
      });
=======

    adapter.state.extractedTasks = [];
    adapter.state.extractedIssues = [];

    let stop = false;

    if (adapter.event.payload.event_context.mode === SyncMode.INCREMENTAL) {
      adapter.state.lastSyncStarted = new Date().toISOString();
      console.log('Incremental extraction, setting complete to false for all item types.');
      for (const itemType of itemTypesToExtract) {
        if (itemType in adapter.state && typeof adapter.state[itemType] === 'object') {
          adapter.state[itemType].complete = false;
          adapter.state[itemType].page = 1;
        }
      }
    }

    const client = new ZohoClient({
      accessToken: adapter.event.payload.connection_data.key,
      portalId: PORTAL_ID,
      projectId: PROJECT_ID,
    });

    for (const itemType of itemTypesToExtract) {
      if (stop) break;

      if (itemType in adapter.state && !adapter.state[itemType].complete) {
        stop = await extractList(adapter, client, itemType);
      }
    }

    if (!stop && (adapter.state.extractedTasks.length > 0 || adapter.state.extractedIssues.length > 0)) {
      stop = await extractComments(adapter, client);
    }

    if (!stop) {
      await adapter.emit(ExtractorEventType.ExtractionDataDone);
>>>>>>> Stashed changes
    }
  },
  onTimeout: async ({ adapter }) => {
    await adapter.postState();
    await adapter.emit(ExtractorEventType.ExtractionDataProgress, {
      progress: 50,
    });
  },
});
<<<<<<< Updated upstream
=======

async function extractList(
  adapter: WorkerAdapter<ExtractorState>,
  client: ZohoClient,
  itemType: ItemType
): Promise<boolean> {
  console.log(`Extracting ${itemType}`);

  try {
    let items: ZohoUser[] | ZohoTask[] | ZohoIssue[];

    switch (itemType) {
      case ItemType.USERS:
        const usersResponse = await client.getUsers(PORTAL_ID, PROJECT_ID);
        items = usersResponse.data.users;
        break;
      case ItemType.TASKS:
        const tasksResponse = await client.getTasks(PORTAL_ID, PROJECT_ID);
        items = tasksResponse.data.tasks;
        break;
      case ItemType.ISSUES:
        const issuesResponse = await client.getIssues(PORTAL_ID, PROJECT_ID);
        items = issuesResponse.data.issues;
        break;
      default:
        return false;
    }

    if (!items || items.length === 0) {
      console.log(`No more data of type ${itemType} to extract. Setting state complete.`);
      if (itemType in adapter.state) {
        adapter.state[itemType].complete = true;
      }
      return false;
    }

    try {
      const repo = adapter.getRepo(itemType);
      if (!repo) {
        console.error(`Repository for ${itemType} not found`);
        await adapter.emit(ExtractorEventType.ExtractionDataError, {
          error: { message: `Repository for ${itemType} not found` },
        });
        return true;
      }
      await repo.push(items);

      if (itemType === ItemType.TASKS) {
        const tasks = items as ZohoTask[];
        adapter.state.extractedTasks = []; // Reset the array to avoid duplicates
        adapter.state.extractedTasks.push(...tasks.map((task) => String(task.id_string)));
        console.log('Extracted task IDs:', adapter.state.extractedTasks);
      } else if (itemType === ItemType.ISSUES) {
        const issues = items as ZohoIssue[];
        adapter.state.extractedIssues.push(...issues.map((issue) => issue.id));
      }

      if (itemType in adapter.state) {
        adapter.state[itemType].complete = true;
      }
      return false;
    } catch (error) {
      console.error(`Error pushing ${itemType}:`, error);
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
      return true;
    }
  } catch (error) {
    if (error instanceof ZohoRateLimitError) {
      console.log(`Rate limit reached. Reset in ${error.delay} milliseconds`);
      await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
        delay: error.delay,
      });
      return true;
    }

    console.error(`Error extracting ${itemType}:`, error);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
    return true;
  }
}

async function extractComments(adapter: WorkerAdapter<ExtractorState>, client: ZohoClient): Promise<boolean> {
  console.log('Extracting comments');

  // Extract task comments
  const taskIds = [...adapter.state.extractedTasks]; // Create a copy of task IDs
  adapter.state.extractedTasks = []; // Clear the original array immediately

  for (const taskId of taskIds) {
    try {
      console.log('Fetching comments for task:', taskId);
      const response = await client.getTaskComments(PORTAL_ID, PROJECT_ID, taskId);
      if (response.data?.comments?.length > 0) {
        const comments = response.data.comments.map((comment) => ({
          ...comment,
          parent_Task_Id: taskId, // Just pass the ID, EDM handles the reference structure
        }));
        await adapter.getRepo(ItemType.TASK_COMMENTS)?.push(comments);
      }
    } catch (error) {
      if (error instanceof ZohoRateLimitError) {
        // Put remaining tasks back in the queue
        adapter.state.extractedTasks.push(...taskIds.slice(taskIds.indexOf(taskId)));
        console.log(`Rate limit reached. Reset in ${error.delay} milliseconds`);
        await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
          delay: error.delay,
        });
        return true;
      }
      console.error(`Error fetching comments for task ${taskId}:`, error);
      // Continue with next task on error
    }
  }

  // Extract issue comments
  const issueIds = [...adapter.state.extractedIssues]; // Create a copy of issue IDs
  adapter.state.extractedIssues = []; // Clear the original array immediately

  for (const issueId of issueIds) {
    try {
      console.log('Fetching comments for issue:', issueId);
      const response = await client.getIssueComments(PORTAL_ID, PROJECT_ID, issueId);
      if (response.data?.comments?.length > 0) {
        const comments = response.data.comments.map((comment) => ({
          ...comment,
          parent_Issue_Id: issueId, // Just pass the ID, EDM handles the reference structure
        }));
        await adapter.getRepo(ItemType.ISSUE_COMMENTS)?.push(comments);
      }
    } catch (error) {
      if (error instanceof ZohoRateLimitError) {
        // Put remaining issues back in the queue
        adapter.state.extractedIssues.push(...issueIds.slice(issueIds.indexOf(issueId)));
        console.log(`Rate limit reached. Reset in ${error.delay} milliseconds`);
        await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
          delay: error.delay,
        });
        return true;
      }
      console.error(`Error fetching comments for issue ${issueId}:`, error);
      // Continue with next issue on error
    }
  }

  return false; // Changed to false since we've processed everything successfully
}
>>>>>>> Stashed changes
