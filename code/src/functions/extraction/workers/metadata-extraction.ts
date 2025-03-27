import { ExtractorEventType, processTask } from '@devrev/ts-adaas';
import externalDomainMetadata from '../zoho/external_domain_metadata.json'; // Constants
const EXTERNAL_DOMAIN_METADATA = 'external_domain_metadata';

const repos = [
  {
    itemType: EXTERNAL_DOMAIN_METADATA,
  },
];

processTask({
  task: async ({ adapter }) => {
    try {
      adapter.initializeRepos(repos);
      await adapter.getRepo(EXTERNAL_DOMAIN_METADATA)?.push([externalDomainMetadata]);
      await adapter.emit(ExtractorEventType.ExtractionMetadataDone);
    } catch (error: any) {
      await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
        error: {
          message: `Failed to extract Zoho metadata: ${error.message}`,
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    // Handle timeout scenarios
    await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
      error: {
        message: 'Failed to extract Zoho metadata. Lambda timeout.',
      },
    });
  },
});
