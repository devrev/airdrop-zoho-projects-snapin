import { axios, ExternalSyncUnit, ExtractorEventType, processTask, serializeAxiosError } from '@devrev/ts-adaas';
import { ZohoClient } from '../zoho/client';
import { ExtractorState } from '../zoho/types';

processTask<ExtractorState>({
  task: async ({ adapter }) => {
    console.log('Starting external sync units extraction...');

    const client = new ZohoClient({
      accessToken: adapter.event.payload.connection_data.key,
    });
    console.log('Initialized Zoho client with access token');

    const externalSyncUnits: ExternalSyncUnit[] = [];

    try {
      // First get all portals
      console.log('Fetching portals...');
      const portalsResponse = await client.getPortals();
      const portals = portalsResponse.data.portals;
      console.log('Fetched portals:', JSON.stringify(portals, null, 2));

      // For each portal, get its projects
      for (const portal of portals) {
        console.log(`Fetching projects for portal ${portal.id_string || portal.id} (${portal.name})...`);
        const projectsResponse = await client.getProjects(portal.id_string || portal.id);
        const projects = projectsResponse.data.projects;
        console.log(`Found ${projects.length} projects in portal ${portal.name}:`, JSON.stringify(projects, null, 2));

        // Map each project to an ExternalSyncUnit
        const portalProjects = projects.map((project) => ({
          id: `${portal.id_string || portal.id}:${project.id_string}`,
          name: `${portal.name} / ${project.name}`,
          description: project.description || `Project in portal ${portal.name}`,
        }));
        console.log('Mapped portal projects to sync units:', JSON.stringify(portalProjects, null, 2));

        externalSyncUnits.push(...portalProjects);
      }

      console.log('Final external sync units to emit:', JSON.stringify(externalSyncUnits, null, 2));

      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
        external_sync_units: externalSyncUnits,
      });
      console.log('Successfully emitted external sync units');
    } catch (error: any) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
      });

      if (axios.isAxiosError(error)) {
        console.error('Failed to get Zoho portals/projects as external sync units', serializeAxiosError(error));
      } else {
        console.error('Failed to get Zoho portals/projects as external sync units', error);
      }

      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: 'Failed to extract external sync units.',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.log('External sync units extraction timed out');
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: {
        message: 'Failed to extract external sync units. Lambda timeout.',
      },
    });
  },
});
