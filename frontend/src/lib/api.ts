// This file exports the API client
import { apiClient as realApiClient } from './api-client';

// Re-export types and constants from api-client
export { 
  API_ENDPOINTS,
  type ApiResponse,
  type PaginatedResponse,
  ApiError
} from './api-client';

// Export the client directly (mock support removed)
export const apiClient = realApiClient;