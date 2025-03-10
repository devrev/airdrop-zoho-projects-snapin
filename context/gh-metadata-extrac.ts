import { ExtractorEventType, processTask } from '@devrev/ts-adaas';
import staticExternalDomainMetadata from '../../github/external_domain_metadata.json';

const EXTERNAL_DOMAIN_METADATA = 'external_domain_metadata';

const repos = [
  {
    itemType: EXTERNAL_DOMAIN_METADATA,
  },
];

processTask({
  task: async ({ adapter }) => {
    adapter.initializeRepos(repos);
    await adapter.getRepo('external_domain_metadata')?.push([staticExternalDomainMetadata]);
    await adapter.emit(ExtractorEventType.ExtractionMetadataDone);
    
  },
  onTimeout: async ({ adapter }) => {
    await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
      error: { message: 'Failed to extract metadata. Lambda timeout.' },
    });
  },
});
