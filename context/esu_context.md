# external_sync_units_extraction.ts Context

## File Name & Purpose

- **File Name**: `external_sync_units_extraction.ts`
- **Purpose**: This file is responsible for extracting external sync units from the external system during the initial import process. It facilitates the selection of specific sync units to be airdropped into the DevRev App, coordinating responses and events with the Airdrop system.

## Key Concepts & Dependencies

- **External Sync Units**:
  - An external sync unit refers to a singular data unit in an external system that can represent entities like projects, repositories, or organizational units depending on the domain model of the system.
  - Contains aggregated data objects such as contacts, users, work items, and comments.

- **Triggering Event**:
  - The extraction process is triggered by an event type `EXTRACTION_EXTERNAL_SYNC_UNITS_START` fired by Airdrop.
  - The task must emit a completion event `EXTRACTION_EXTERNAL_SYNC_UNITS_DONE` with extracted units or `EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR` on failure.

- **Dependencies**:
  - Utilizes `@devrev/ts-adaas` for task processing and event lifecycle management.
  - Interfaces with specific clients like `FigmaClient` and `FreshdeskClient` to interact with external APIs.
  - Relies on Axios for HTTP operations and error serialization (in some implementations).

## Expected Input & Output

- **Input**: Processes event data with credentials or connection information essential for accessing the respective external systems' APIs or entities directly passed by Airdrop event.
- **Output**: On successful extraction, it emits `EXTRACTION_EXTERNAL_SYNC_UNITS_DONE` with `ExternalSyncUnit` objects. On errors, it emits `EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR`.

## Code Structure

- **Implementation Pattern**:
  - **API Calls**: Some implementations initiate new API requests to fetch sync units (e.g., by utilizing `FigmaClient` or `FreshdeskClient`).
  - **Event Data Parsing**: Other implementations rely directly on data received within the triggering event from Airdrop, utilizing it to form sync units without additional API calls.

- **Example Snippet**:
  ```typescript
  processTask<ExtractorState>({
    task: async ({ adapter }) => {
      try {
        const externalSyncUnits = await fetchOrParseSyncUnits(adapter);
        await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
          external_sync_units: externalSyncUnits,
        });
      } catch (error) {
        await handleError({
          error,
          eventType: ExtractorEventType.ExtractionExternalSyncUnitsError,
          adapter,
        });
      }
    },
    onTimeout: async ({ adapter }) => {
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: 'Failed to extract external sync units. Lambda timeout.',
        },
      });
    },
  });

## Constraints & Best Practices

- **Conventions**: Follows specific event type conventions such as `EXTRACTION_EXTERNAL_SYNC_UNITS_DONE` and `EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR` for communication with Airdrop.

- **Performance & Scalability**: Ensure efficient fetching and transformation of external sync units, with handling provided for rate limits and timeouts via error handling utilities.

- **Error Handling**: Leveraging centralized utility functions (e.g., `handleError`) for consistent error management across different tasks.

- **Type Safety**: Uses TypeScript for typing safety. Interfaces like `ExternalSyncUnit` and `ExtractorState` are defined to ensure consistency in data shape and processing logic.
