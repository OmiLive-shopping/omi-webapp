// This file exports the API client with mock support
import { apiClient as realApiClient } from './api-client';
import { createApiClientWithMock } from './mock-api';

// Re-export types and constants from api-client
export { 
  API_ENDPOINTS,
  type ApiResponse,
  type PaginatedResponse,
  ApiError
} from './api-client';

// Create and export the wrapped client
export const apiClient = createApiClientWithMock(realApiClient);