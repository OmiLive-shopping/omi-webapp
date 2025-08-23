# VDO.Ninja Integration Tests

Comprehensive end-to-end test suite for VDO.Ninja streaming integration.

## Test Coverage

### 1. Stream Lifecycle Tests (`vdo-ninja-stream-lifecycle.spec.ts`)
- Stream start/stop functionality
- Pause/resume operations
- Viewer join/leave events
- Connection state changes
- Stream statistics display
- State persistence across page refreshes
- Command queueing when offline
- Stream quality changes
- Rapid state change handling
- Stream duration tracking

### 2. Media Controls Tests (`vdo-ninja-media-controls.spec.ts`)
- Audio controls (mute/unmute, volume, gain, noise suppression, echo cancellation)
- Video controls (hide/show, effects, virtual backgrounds, quality settings)
- Screen sharing (start/stop, quality adjustment, system audio)
- Recording controls (start/stop, pause/resume, download, settings)
- Camera and microphone selection
- Multiple simultaneous media changes

### 3. Error Scenarios Tests (`vdo-ninja-error-scenarios.spec.ts`)
- Connection errors (initial failure, timeout, mid-stream disconnection, network degradation)
- Permission errors (camera, microphone, screen share)
- Device errors (no camera, camera busy, device disconnection)
- Capacity errors (room full, bandwidth exceeded)
- Recovery and retry logic with exponential backoff
- Error logging and reporting

### 4. Cross-Browser Tests (`vdo-ninja-cross-browser.spec.ts`)
- Desktop browsers (Chrome, Firefox, Safari)
- Mobile browsers (iOS Safari, Android Chrome)
- Tablet browsers (iPad)
- Browser feature detection
- Performance metrics across browsers
- Memory management

## Running Tests

### Quick Start
```bash
# Run all VDO.Ninja tests
pnpm test:vdo

# Run specific test suite
pnpm test:vdo:lifecycle    # Stream lifecycle tests
pnpm test:vdo:media        # Media controls tests
pnpm test:vdo:errors       # Error scenarios tests
pnpm test:vdo:cross        # Cross-browser tests

# Run smoke tests (quick validation)
pnpm test:vdo:smoke
```

### Browser-Specific Tests
```bash
# Chrome only
pnpm test:vdo:chrome

# Firefox only
pnpm test:vdo:firefox

# Safari/WebKit only
pnpm test:vdo:safari

# Mobile browsers
pnpm test:vdo:mobile
```

### Interactive Testing
```bash
# Run with UI mode (interactive test runner)
pnpm test:vdo:ui

# Run in headed mode (see browser)
pnpm test:vdo:headed

# Debug mode
npx playwright test e2e/vdo-ninja-stream-lifecycle.spec.ts --debug
```

### Test Reports
```bash
# Generate HTML report
pnpm test:vdo:report

# View report after tests
npx playwright show-report
```

## Test Structure

### Mock Setup
The tests use a comprehensive VDO.Ninja mock (`fixtures/vdo-ninja-mocks.ts`) that:
- Intercepts postMessage communication
- Simulates VDO.Ninja responses
- Enables event simulation
- Tracks command history
- Supports network condition simulation

### Test Data Attributes
All tests rely on `data-testid` attributes in the UI components:

#### Essential Test IDs
- `start-stream-btn` - Start streaming button
- `stop-stream-btn` - Stop streaming button
- `stream-status` - Stream status indicator
- `mute-audio-btn` - Audio mute toggle
- `hide-video-btn` - Video hide toggle
- `volume-slider` - Volume control
- `viewer-count` - Active viewer count
- `error-message` - Error display area
- `connection-status` - Connection state indicator

## Prerequisites

### Installation
```bash
# Install Playwright and browsers
pnpm add -D @playwright/test
npx playwright install
```

### Development Server
Tests expect the app to run on `http://localhost:5173`. The Playwright config automatically starts the dev server if not running.

## Writing New Tests

### Test Template
```typescript
import { test, expect } from '@playwright/test';
import { VdoNinjaMock } from './fixtures/vdo-ninja-mocks';

test.describe('New Feature', () => {
  test('should do something', async ({ page }) => {
    // Setup
    await page.goto('/vdo-ninja-test');
    const vdoMock = new VdoNinjaMock(page);
    await vdoMock.initialize();
    
    // Action
    await page.click('[data-testid="your-button"]');
    
    // Assertion
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Adding Mock Handlers
```typescript
// Add custom handler for new command
vdoMock.addHandler('custom-command', (msg) => ({
  response: 'custom-response',
  data: msg.value
}));

// Simulate custom event
await vdoMock.simulateEvent({
  action: 'custom-event',
  data: 'test'
});
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: pnpm install
      - run: npx playwright install
      - run: pnpm test:vdo
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Debugging Failed Tests

### View Test Traces
```bash
# Run with trace on
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Screenshots on Failure
Tests automatically capture screenshots on failure. Find them in:
- `test-results/` directory
- HTML report

### Debug Selectors
```bash
# Test selectors in browser console
npx playwright codegen http://localhost:5173/vdo-ninja-test
```

## Performance Benchmarks

Expected performance metrics:
- Stream start time: < 2 seconds
- Command response time: < 100ms
- UI update latency: < 50ms
- Memory usage: < 150MB baseline
- CPU usage: < 30% during streaming

## Known Limitations

1. **WebKit/Safari**: Limited screen sharing support
2. **Mobile browsers**: Reduced quality defaults for bandwidth
3. **Firefox**: Some experimental WebRTC features unavailable
4. **Network simulation**: Limited to basic conditions (good/poor/offline)

## Troubleshooting

### Common Issues

1. **Tests timeout**: Increase timeout in playwright.config.ts
2. **Browser not installed**: Run `npx playwright install`
3. **Port conflict**: Ensure port 5173 is available
4. **Permission prompts**: Tests assume permissions are granted

### Environment Variables
```bash
# Run tests with custom base URL
PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm test:vdo

# Enable debug logs
DEBUG=pw:api pnpm test:vdo
```

## Contributing

When adding new VDO.Ninja features:
1. Add corresponding test coverage
2. Update test IDs in components
3. Add mock handlers if needed
4. Run full test suite before PR
5. Update this documentation

## Resources

- [Playwright Documentation](https://playwright.dev)
- [VDO.Ninja API Docs](https://docs.vdo.ninja)
- [WebRTC Testing Best Practices](https://webrtc.org/testing)