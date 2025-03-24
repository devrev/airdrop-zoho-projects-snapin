# metadata-extraction.ts Context
## File Name & Purpose
- **File Name**: `metadata-extraction.ts`
- **Purpose**: This file manages the extraction and generation of metadata for external systems within the ADaaS project. It handles the creation of an `external_domain_metadata.json` file, representing domain structure, entities, and relationships either as static or dynamic metadata depending on the capabilities of the external system.
## Key Concepts & Dependencies
- **Metadata Extraction**:
  - The file generates structured metadata describing the external system's domain model.
  - Metadata can be static (predefined) or dynamic, where additional domain data such as custom fields are extracted at runtime.
- **Static vs Dynamic Metadata**:
  - **Static Metadata**: Used for systems that do not support custom fields; utilizes a predefined JSON that is incorporated into the metadata.
  - **Dynamic Metadata**: For systems supporting custom fields, metadata is enriched dynamically by extracting custom fields or entity statuses.
- **Triggering Event**:
  - The Airdrop system initiates metadata extraction via an `EXTRACTION_METADATA_START` event.
  - Upon completion, the task sends an `EXTRACTION_METADATA_DONE` event or `EXTRACTION_METADATA_ERROR` if an error occurs.
- **Dependencies**:
  - **Chef-CLI**: Validates the `external_domain_metadata.json` using a schema provided by DevRev.
  - **@devrev/ts-adaas**: Used for task orchestration and event management.
  - Custom libraries for handling HTTP requests and metadata transformation.
## Expected Input & Output
- **Input**: Event-driven, with configurations and credentials necessary for accessing external system APIs. If supported, dynamic information about the system, such as custom fields, will be fetched.
- **Output**: Generates an `external_domain_metadata.json` file that could either be static or dynamically enriched and is sent back upon successful extraction.
## Code Structure
- **Example Snippets**:
  ### Static Metadata Example
  ```typescript
  import { ExtractorEventType, processTask } from '@devrev/ts-adaas';
  import staticExternalDomainMetadata from '../../github/external_domain_metadata.json';
  const repos = [{ itemType: 'external_domain_metadata' }];
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
## Constraints & Best Practices
- **Conventions** : Follow event-type conventions like EXTRACTION_METADATA_DONE and EXTRACTION_METADATA_ERROR for consistency in communication with Airdrop.
- **Validation** : Utilize the chef-cli to ensure the metadata JSON complies with DevRev’s schema requirements.
- **Performance** : Optimize the fetching and processing of dynamic metadata to ensure efficiency. Use caching and batched requests when possible.
- **Type Safety** : Use TypeScript interfaces to maintain structure in JSON outputs and enforce consistency across metadata extraction.
- **Error Management** : Implement consistent error handling strategies, using utility functions like handleError to manage exceptions effectively.
Collapse









