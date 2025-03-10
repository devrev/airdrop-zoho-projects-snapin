import { ExtractorEventType, processTask, WorkerAdapter, SyncMode } from '@devrev/ts-adaas';

import { GithubClient, MAX_ISSUES_PER_PAGE } from '../../github/client';
import { getItemTypesToExtract, repos, RateLimitError } from '../../github/helper';
import { ExtractorState, ItemType, ItemTypeToExtract } from '../../github/types';

processTask<ExtractorState>({
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
      if (stop) {
        break;
      }
      
      if (!adapter.state[itemTypeToExtract.name].complete) {
        stop = await extractList(adapter, itemTypeToExtract); 
      }
    }
    
    if (!stop && adapter.state.extractedIssues.length > 0) {
      stop = await extractComments(adapter);
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
  itemTypeToExtract: ItemTypeToExtract
): Promise<boolean> {
  console.log(`Extracting ${itemTypeToExtract.name}`);
  
  const githubClient = new GithubClient(
    adapter.event.payload.connection_data.key
  );

  const orgName = adapter.event.payload.connection_data.org_name;
  const repoName = adapter.event.payload.event_context.external_sync_unit_name;   
  
  let response;
  try {
    switch (itemTypeToExtract.name) {
      case ItemType.ISSUES:
        const issueResponse = await githubClient.getRepoIssues(orgName,repoName,
          {
            per_page: MAX_ISSUES_PER_PAGE,
            ...(adapter.state.lastSuccessfulSyncStarted
              ? { since: adapter.state.lastSuccessfulSyncStarted }
              : {}
            )
          }
        );
        const issuesOnly = issueResponse.data.filter(item => !item.pull_request);
        adapter.state[itemTypeToExtract.name].page = issueResponse.lastPage;
        response = { data: issuesOnly };
        break;

      case ItemType.LABELS:
        // no support for `since` in param GH API for Labels - https://docs.github.com/en/rest/reference/issues#list-labels-for-a-repository
        const labelResponse = await githubClient.getRepoLabels(orgName,repoName,{per_page: MAX_ISSUES_PER_PAGE});
        adapter.state[itemTypeToExtract.name].page = labelResponse.lastPage;
        response = { data: labelResponse.data };
        break;

      case ItemType.ASSIGNEES:
        // no support for `since` param in GH API for Assignees - https://docs.github.com/en/rest/reference/issues#list-assignees
        const assigneeResponse = await githubClient.getRepoAssignees(orgName,repoName,{per_page: MAX_ISSUES_PER_PAGE});
        adapter.state[itemTypeToExtract.name].page = assigneeResponse.lastPage;
        response = { data: assigneeResponse.data };
        break;
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.error(`Rate limit reached. Reset in ${error.delay} seconds`);
      await adapter.emit(ExtractorEventType.ExtractionDataDelay, { delay: error.delay });
      return true; 
    }

    console.error(`Error extracting ${itemTypeToExtract.name}:`, error instanceof Error ? error.message : 'Unknown error');
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { 
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    return true;  
  }

  if (!response || response.data.length === 0) {
    console.log(
      `No more data of type ${itemTypeToExtract.name} to extract. Setting state true and breaking loop.`
    );
    adapter.state[itemTypeToExtract.name].complete = true; 
    return false; 
  }

  try {
    await adapter.getRepo(itemTypeToExtract.name)?.push(response.data); 
  } catch (error) {
    console.error(`Error pushing ${itemTypeToExtract.name}:`, error instanceof Error ? error.message : 'Unknown error');
    await adapter.emit(ExtractorEventType.ExtractionDataError, {error: { 
      message: error instanceof Error ? error.message : 'Unknown error'}});
    return true;
  }  

  if (itemTypeToExtract.name === ItemType.ISSUES) {
    adapter.state.extractedIssues.push(
      ...response.data.map((issue: any) => issue.number)
    );
  }

  adapter.state[itemTypeToExtract.name].complete = true;
  return false;
} 

async function extractComments(adapter: WorkerAdapter<ExtractorState>): Promise<boolean> {
  console.log(`Extracting ${ItemType.COMMENTS}`);

  const githubClient = new GithubClient(
    adapter.event.payload.connection_data.key,
  );
  
  const orgName = adapter.event.payload.connection_data.org_name;
  const repoName = adapter.event.payload.event_context.external_sync_unit_name;
  
  while (adapter.state.extractedIssues.length > 0) {
    const issueNumber = adapter.state.extractedIssues[0];

    let commentResponse;
    try {
      commentResponse = await githubClient.getIssueComments( orgName,repoName,issueNumber,
          {
              per_page: MAX_ISSUES_PER_PAGE,
              ...(adapter.state.lastSuccessfulSyncStarted
                ? { since: adapter.state.lastSuccessfulSyncStarted }
                : {})
          }
      );
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.log(`Rate limit reached, Reset in ${error.delay} seconds`);
        await adapter.emit(ExtractorEventType.ExtractionDataDelay, { delay: error.delay });
        return true;
      }
      console.error(`Error fetching comments for issue ${issueNumber}:`,error instanceof Error ? error.message : 'Unknown error');
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: { 
          message: `Failed to fetch comments for issue ${issueNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      });
      return true;
    }

    if (commentResponse.data.length > 0) {
      try {
        await adapter.getRepo(ItemType.COMMENTS)?.push(commentResponse.data);
      } catch (error) {
        console.error(
          `Error pushing comments for issue ${issueNumber}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
        
        await adapter.emit(ExtractorEventType.ExtractionDataError, {
          error: { 
            message: `Failed to push comments for issue ${issueNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        });
        return true; 
      }
    }

    adapter.state.extractedIssues.shift();
  }
  adapter.state[ItemType.COMMENTS].complete = true;
  return false;
}
