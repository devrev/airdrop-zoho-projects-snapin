import { AxiosError } from 'axios';
import { ExtractorState } from './types';

export class ZohoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZohoError';
  }
}

export class ZohoRateLimitError extends ZohoError {
  delay: number;

  constructor(delay: number) {
    super('Rate limit exceeded');
    this.name = 'ZohoRateLimitError';
    this.delay = delay;
  }
}

export const handleZohoError = (error: AxiosError): never => {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as any;

    if (status === 429) {
      // Rate limit exceeded
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
      throw new ZohoRateLimitError(retryAfter * 1000); // Convert to milliseconds
    }

    throw new ZohoError(data.message || `Zoho API error: ${status} - ${JSON.stringify(data)}`);
  }

  if (error.request) {
    throw new ZohoError('No response received from Zoho API');
  }

  throw new ZohoError(`Error setting up request: ${error.message}`);
};

export const initialState: ExtractorState = {
  users: {
    complete: false,
    page: 1,
  },
  tasks: {
    complete: false,
    page: 1,
  },
  issues: {
    complete: false,
    page: 1,
  },
  comments: {
    complete: false,
    page: 1,
  },
  lastSyncStarted: '',
  lastSuccessfulSyncStarted: '',
  portal_id: '',
  project_id: '',
};
