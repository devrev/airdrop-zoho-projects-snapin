import { axios, ExternalSyncUnit, ExtractorEventType, processTask, serializeAxiosError } from '@devrev/ts-adaas';
import { ZohoClient } from '../zoho/client';
import { ExtractorState, ZohoGlobals, ZohoPortal, ZohoProject } from '../zoho/types';

function getZohoGlobalsFromEvent(event: any): ZohoGlobals {
  return {
    accessToken: event.payload.connection_data.key,
    devRevBaseUrl: event.execution_metadata?.devrev_endpoint,
    devOrgId: event.context?.dev_oid,
    snapInId: event.context?.snap_in_id,
  };
}

function mapProjectsToSyncUnits(portal: ZohoPortal, projects: ZohoProject[]): ExternalSyncUnit[] {
  return projects.map((project) => {
    const syncUnitId = `${portal.id_string || portal.id}_${project.id_string}`;
    return {
      id: syncUnitId,
      name: `${portal.name} - ${project.name}`,
      description: project.description || `Project in portal ${portal.name}`,
    };
  });
}

async function getPortalProjects(client: ZohoClient, portal: ZohoPortal): Promise<ZohoProject[]> {
  try {
    const projectsResponse = await client.getProjects(portal.id_string || portal.id);
    return projectsResponse.data.projects;
  } catch (error) {
    console.error(`Error fetching projects for portal ${portal.name}:`, error);
    return [];
  }
}

processTask<ExtractorState>({
  task: async ({ adapter }) => {
    const globals = getZohoGlobalsFromEvent(adapter.event);
    const client = new ZohoClient({
      accessToken: globals.accessToken,
    });

    const externalSyncUnits: ExternalSyncUnit[] = [];

    try {
      const portalsResponse = await client.getPortals();
      const portals = portalsResponse.data.portals;
      for (const portal of portals) {
        const projects = await getPortalProjects(client, portal);
        const portalSyncUnits = mapProjectsToSyncUnits(portal, projects);
        externalSyncUnits.push(...portalSyncUnits);
      }

      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
        external_sync_units: externalSyncUnits,
      });

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
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: {
        message: 'Failed to extract external sync units. Lambda timeout.',
      },
    });
  },
});
