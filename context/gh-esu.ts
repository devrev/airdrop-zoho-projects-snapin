import { ExternalSyncUnit, ExtractorEventType, processTask } from '@devrev/ts-adaas';
import { GithubClient, MAX_ISSUES_PER_PAGE } from '../../github/client';
import { ExtractorState, GitHubRepo } from '../../github/types';
import { RateLimitError } from '../../github/helper'; 

processTask<ExtractorState>({ 
  task: async ({ adapter }) => {
    const githubclient = new GithubClient(
      adapter.event.payload.connection_data.key
    );

    const org_name = adapter.event.payload.connection_data.org_name;
    const repos: GitHubRepo[] = [];
    let page = 1; 
    let repoResponse;

    try{
      repoResponse = await githubclient.getOrgRepos(org_name, { page, per_page: MAX_ISSUES_PER_PAGE });
    } catch (error) {
      if (error instanceof RateLimitError) {
        await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
          delay: error.delay
        });
        return;
      }
    
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to get Repository details:', errorMessage);
      
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: `Failed to fetch repository details: ${errorMessage}`
        }
      });
      return;
    }  
      
    repos.push(...(repoResponse.data));

    const externalSyncUnits: ExternalSyncUnit[] = repos.map((repo) => ({
      id: repo.id.toString(),
      name: repo.name,
      description: repo.description || repo.name,
      item_count: repo.open_issues_count,
      item_type: "open issues",
    }));
      
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
      external_sync_units: externalSyncUnits,
    });
  },

  onTimeout: async ({ adapter }) => {
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: {
        message: 'Failed to extract external sync units. Lambda timeout.',
      },
    });
  },
});
