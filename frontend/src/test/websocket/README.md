# WebSocket Integration Tests and E2E Testing

This directory contains comprehensive WebSocket testing infrastructure for the OMI Live application, covering integration tests, end-to-end user scenarios, performance benchmarks, and error recovery validation.

## Overview

The WebSocket testing system validates the real-time features of the OMI Live platform, including:
- Stream lifecycle management (join/leave operations)
- Real-time chat functionality
- Connection health monitoring and auto-recovery
- Error recovery and graceful degradation
- Multi-user concurrent interactions
- Performance under load conditions

## Test Infrastructure

### Core Components

#### WebSocketTestServer (`websocket-test-server.ts`)
A mock WebSocket server that simulates the backend Socket.IO behavior for testing purposes.

**Features:**
- Socket.IO server simulation with namespaces
- Stream management (join/leave, member tracking)
- Chat message broadcasting and history
- Connection health monitoring (ping/pong)
- Rate limiting simulation
- Event logging and debugging
- Configurable server behavior

**Usage:**
```typescript
const server = new WebSocketTestServer();
const port = await server.start();
const serverUrl = `http://localhost:${port}`;
// ... run tests
await server.stop();
```

#### WebSocketTestClient (`websocket-test-client.ts`)
A specialized client for interacting with the mock WebSocket server, abstracting `socket.io-client` for testing.

**Features:**
- Connection management with authentication
- Stream operations (join/leave)
- Chat message sending/receiving
- Connection health monitoring (ping measurements)
- Event logging and history tracking
- Error simulation and recovery testing

**Usage:**
```typescript
const client = new WebSocketTestClient(serverUrl);
await client.connect({ auth: { userId: 'test', username: 'TestUser', role: 'viewer' } });
await client.joinStream('test-stream');
await client.sendChatMessage('test-stream', 'Hello World!');
client.disconnect();
```

## Test Suites

### 1. Stream Lifecycle Integration Tests (`stream-lifecycle.integration.spec.ts`)

Tests the core stream management functionality over WebSockets.

**Test Categories:**
- **Stream Authentication**: Verifies user authentication during stream operations
- **Stream Join/Leave Operations**: Tests stream membership management
- **Stream Status Updates**: Validates real-time status synchronization
- **Viewer Count Management**: Ensures accurate viewer count tracking
- **Stream State Synchronization**: Tests consistency across multiple clients

**Key Scenarios:**
- Basic stream joining and leaving
- Multiple users joining the same stream
- Viewer count updates in real-time
- Stream state consistency across clients
- Error handling for invalid stream operations

### 2. Chat Functionality Integration Tests (`chat-functionality.integration.spec.ts`)

Validates the real-time chat system functionality.

**Test Categories:**
- **Message Broadcasting**: Tests real-time message delivery
- **Chat History**: Validates message persistence and retrieval
- **User-specific Events**: Tests user join/leave notifications
- **Message Validation**: Ensures proper message formatting and validation
- **Multi-room Chat**: Tests isolated chat rooms per stream

**Key Scenarios:**
- Real-time message sending and receiving
- Chat history management
- User presence notifications
- Message validation and sanitization
- Multiple concurrent chat rooms

### 3. End-to-End User Scenarios (`e2e-user-scenarios.spec.ts`)

Simulates complete user journeys involving WebSocket interactions.

**Test Categories:**
- **Complete User Workflows**: Full user journey from connection to disconnection
- **Multi-step Interactions**: Complex scenarios involving multiple operations
- **Cross-feature Integration**: Tests interactions between different features
- **Real-world Usage Patterns**: Simulates actual user behavior patterns

**Key Scenarios:**
- New user joining a live stream and participating in chat
- Stream host managing viewers and moderating chat
- User switching between multiple streams
- Connection recovery during active streaming
- Collaborative streaming scenarios

### 4. Multi-User Concurrent Tests (`multi-user-concurrent.spec.ts`)

Tests system behavior with multiple simultaneous users and concurrent operations.

**Test Categories:**
- **Concurrent Connections**: Multiple users connecting simultaneously
- **Scalability Testing**: Performance with increasing user counts
- **Resource Management**: Server resource usage under load
- **State Consistency**: Data consistency with concurrent operations
- **Race Condition Prevention**: Tests for potential race conditions

**Key Scenarios:**
- Multiple users joining streams simultaneously
- High-volume concurrent chat activity
- Simultaneous stream operations (join/leave)
- Load testing with realistic user patterns
- Resource cleanup and memory management

### 5. Performance and Load Tests (`performance-load.spec.ts`)

Comprehensive performance testing covering various load conditions and performance metrics.

**Test Categories:**

#### Connection Performance
- **Rapid Connection Establishment**: Tests ability to handle many connections quickly
- **Sustained Connection Performance**: Performance monitoring over time
- **Connection Latency**: Ping/pong response time measurements

#### Message Throughput Performance
- **High-Volume Chat Throughput**: Tests message processing under load
- **Burst Message Patterns**: Performance with sudden message spikes
- **Message Broadcasting Efficiency**: Real-time delivery performance

#### Stream Management Performance
- **Rapid Join/Leave Operations**: Stream operation performance under load
- **Multi-Stream Scaling**: Performance with multiple concurrent streams
- **Resource Optimization**: Server resource usage optimization

#### Memory and Resource Performance
- **Long-Running Connection Management**: Memory leak detection
- **Resource Cleanup**: Proper cleanup of disconnected clients
- **Server Resource Monitoring**: CPU and memory usage under load

#### Network Condition Simulation
- **Network Stress Testing**: Performance under adverse network conditions
- **Connection Recovery Performance**: Recovery time measurements
- **Degraded Network Simulation**: Behavior with poor connectivity

**Performance Benchmarks:**
- Average connection time < 500ms
- Maximum connection time < 2 seconds
- Average ping latency < 100ms
- Message throughput > 50 messages/second
- Success rate > 80% under load
- Operations/second > 100 for stream management

### 6. Error Recovery Integration Tests (`error-recovery.integration.spec.ts`)

Validates the WebSocket error recovery and graceful degradation system implemented in Task #38.

**Test Categories:**
- **Connection Failure Recovery**: Tests automatic reconnection mechanisms
- **Error Classification**: Validates proper error categorization and handling
- **Circuit Breaker Functionality**: Tests circuit breaker pattern implementation
- **Offline Queue Management**: Validates message queuing during disconnections
- **Graceful Degradation**: Tests fallback mode functionality
- **Token Refresh Integration**: Validates authentication token refresh during recovery

**Key Scenarios:**
- Network disconnection and auto-recovery
- Server downtime handling and reconnection
- Authentication token expiration and refresh
- Message queuing and replay after reconnection
- Circuit breaker activation and recovery
- Fallback mode transitions (Basic, Minimal, Offline)
- Error reporting and monitoring integration

## Running Tests

### Prerequisites

Ensure you have the required dependencies installed:
```bash
cd frontend
pnpm install
```

### Test Commands

#### All WebSocket Tests
```bash
pnpm test:websocket
```

#### Specific Test Categories
```bash
# Unit tests for WebSocket components
pnpm test:websocket:unit

# Integration tests for real-time features
pnpm test:websocket:integration

# Performance and load testing
pnpm test:websocket:performance

# End-to-end user scenarios
pnpm test:websocket:e2e

# Smoke tests for CI/CD
pnpm test:websocket:smoke

# Performance benchmarking
pnpm test:websocket:benchmark
```

#### Individual Test Files
```bash
# Stream lifecycle tests
pnpm vitest src/test/websocket/__tests__/stream-lifecycle.integration.spec.ts

# Chat functionality tests
pnpm vitest src/test/websocket/__tests__/chat-functionality.integration.spec.ts

# Performance tests
pnpm vitest src/test/websocket/__tests__/performance-load.spec.ts

# Error recovery tests
pnpm vitest src/test/websocket/__tests__/error-recovery.integration.spec.ts
```

### CI/CD Integration

The tests are integrated into the GitHub Actions workflow (`.github/workflows/websocket-tests.yml`) with:

- **Matrix Strategy**: Tests run in parallel across different categories
- **Service Dependencies**: PostgreSQL and Redis services for full integration
- **Performance Benchmarking**: Automated benchmarking on main branch
- **Test Artifacts**: Coverage reports and test results uploaded
- **Smoke Tests**: Quick validation after main test suite completion

#### Workflow Triggers
- Push to `main` or `develop` branches
- Pull requests affecting WebSocket-related code
- Manual workflow dispatch for ad-hoc testing

#### Test Environment
- Node.js 18
- PostgreSQL 15 with test database
- Redis 7 for caching and session management
- Isolated test environment with proper cleanup

## Test Configuration

### Environment Variables

Tests use environment-specific configuration:

```bash
# Test database (automatically set in CI)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/omi_test

# Redis connection (automatically set in CI)
REDIS_URL=redis://localhost:6379

# API endpoint for smoke tests
VITE_API_URL=http://localhost:3001
```

### Vitest Configuration

WebSocket tests use custom Vitest configuration:

```typescript
// vitest.config.ts extensions for WebSocket testing
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    testTimeout: 30000, // Extended timeout for WebSocket operations
    hookTimeout: 10000, // Extended hook timeout for server setup/teardown
  }
});
```

## Performance Benchmarks and Metrics

### Connection Performance Targets
- **Connection Establishment**: < 500ms average, < 2s maximum
- **Ping Latency**: < 100ms average under normal load
- **Connection Success Rate**: > 95% under normal conditions, > 80% under stress

### Message Performance Targets
- **Chat Message Throughput**: > 50 messages/second
- **Message Broadcasting**: < 100ms delivery time
- **Message Success Rate**: > 90% under normal load, > 70% under stress

### Scalability Targets
- **Concurrent Connections**: Support 100+ simultaneous connections
- **Multi-Stream Performance**: 10+ concurrent streams with 5+ users each
- **Resource Usage**: Stable memory usage over extended periods

### Load Testing Scenarios
- **Light Load**: 10-25 concurrent users
- **Medium Load**: 25-50 concurrent users  
- **Heavy Load**: 50-100+ concurrent users
- **Stress Testing**: Beyond capacity limits to test degradation

## Troubleshooting

### Common Issues

#### Test Timeouts
- **Cause**: WebSocket operations taking longer than expected
- **Solution**: Increase test timeout or check server performance
- **Debug**: Enable verbose logging to identify slow operations

#### Connection Failures
- **Cause**: Port conflicts or server startup issues
- **Solution**: Ensure ports are available and proper cleanup
- **Debug**: Check server logs and connection state

#### Memory Leaks
- **Cause**: Improper cleanup of WebSocket connections
- **Solution**: Verify all clients disconnect in test cleanup
- **Debug**: Monitor memory usage during long-running tests

#### Flaky Tests
- **Cause**: Race conditions or timing issues
- **Solution**: Add proper wait conditions and synchronization
- **Debug**: Run tests multiple times to identify patterns

### Debugging Tips

#### Enable Verbose Logging
```typescript
// In test files, enable detailed logging
const server = new WebSocketTestServer({ debug: true });
const client = new WebSocketTestClient(serverUrl, { debug: true });
```

#### Inspect Event Logs
```typescript
// Check client event history
const eventLog = client.getEventLog();
console.log('Client events:', eventLog);

// Check server state
const connections = server.getConnectionCount();
const streamMembers = server.getStreamMembers('stream-id');
```

#### Monitor Performance
```typescript
// Track performance metrics
const startTime = Date.now();
await client.joinStream('test-stream');
const joinTime = Date.now() - startTime;
console.log(`Join operation took ${joinTime}ms`);
```

## Contributing

### Adding New Tests

1. **Identify Test Category**: Determine if it's integration, performance, or E2E
2. **Choose Appropriate File**: Add to existing file or create new category
3. **Follow Naming Convention**: Use descriptive test names with clear scenarios
4. **Include Performance Expectations**: Add timing and success rate assertions
5. **Ensure Proper Cleanup**: Always disconnect clients and stop servers
6. **Add Documentation**: Update this README with new test scenarios

### Test Structure Guidelines

```typescript
describe('Feature Category', () => {
  let server: WebSocketTestServer;
  let serverUrl: string;

  beforeAll(async () => {
    server = new WebSocketTestServer();
    const port = await server.start();
    serverUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Specific Feature', () => {
    it('should behave correctly under normal conditions', async () => {
      // Setup
      const client = new WebSocketTestClient(serverUrl);
      
      try {
        // Test implementation
        await client.connect({ auth: { userId: 'test', username: 'Test', role: 'viewer' } });
        
        // Assertions
        expect(client.getConnectionStatus()).toBe(true);
        
      } finally {
        // Cleanup
        client.disconnect();
      }
    });
  });
});
```

### Performance Test Guidelines

- **Set Clear Benchmarks**: Define expected performance thresholds
- **Measure Consistently**: Use consistent measurement approaches
- **Test Various Conditions**: Include normal, stressed, and edge case scenarios
- **Log Performance Data**: Output useful metrics for analysis
- **Validate Expectations**: Assert performance meets requirements

### Error Recovery Test Guidelines

- **Test All Error Types**: Cover network, authentication, and application errors
- **Validate Recovery Mechanisms**: Ensure proper reconnection and state restoration
- **Test Fallback Modes**: Verify graceful degradation functionality
- **Measure Recovery Times**: Assert acceptable recovery performance
- **Test User Experience**: Validate user-facing error handling and notifications

## Maintenance

### Regular Tasks

- **Review Performance Benchmarks**: Monitor for performance regressions
- **Update Test Data**: Keep test scenarios relevant to current features
- **Cleanup Test Infrastructure**: Remove obsolete test code and dependencies
- **Monitor CI/CD Performance**: Optimize test execution times
- **Update Documentation**: Keep README and code comments current

### Monitoring

- **CI/CD Success Rates**: Track test reliability in automated runs
- **Performance Trends**: Monitor benchmark results over time
- **Coverage Metrics**: Ensure adequate test coverage for WebSocket features
- **Error Patterns**: Identify common failure modes and improve testing

This comprehensive WebSocket testing infrastructure ensures the reliability, performance, and user experience quality of the OMI Live real-time features.
