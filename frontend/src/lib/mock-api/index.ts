import { MockApiAdapter } from './mock-api-adapter';

// Export mock adapter
export { MockApiAdapter } from './mock-api-adapter';
export { mockDataStore } from './mock-data';

// Create a function to wrap the API client
export function createApiClientWithMock(realApiClient: any) {
  const mockAdapter = new MockApiAdapter();
  
  // Return a proxy that switches between real and mock
  return new Proxy({}, {
    get(target, prop) {
      const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true';
      const client = useMockApi ? mockAdapter : realApiClient;
      
      // Log on first access
      if (prop === 'get' && import.meta.env.DEV) {
        console.log(
          `🔌 Using ${useMockApi ? 'MOCK' : 'REAL'} API`,
          '\n💡 Toggle with VITE_USE_MOCK_API=true/false in .env'
        );
      }
      
      return client[prop];
    }
  });
}