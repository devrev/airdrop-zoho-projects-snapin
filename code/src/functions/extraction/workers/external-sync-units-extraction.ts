import { ExternalSyncUnit, ExtractorEventType, processTask } from '@devrev/ts-adaas';

processTask({
  task: async ({ adapter }) => {
    try {
      const externalSyncUnits: ExternalSyncUnit[] = [
        {
          id: adapter.event.payload.connection_data.org_id,
          name: adapter.event.payload.connection_data.org_name,
          description: `zoho organization: ${adapter.event.payload.connection_data.org_name}`,
        },
      ];
      console.log('Created external sync units:', JSON.stringify(externalSyncUnits, null, 2));
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
        external_sync_units: externalSyncUnits,
      });
    } catch (error) {
      console.error('Failed to create external sync unit:', error);
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: 'Failed to extract external sync units.',
        },
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
