# Interactive Test Commands for Vitest

## 1. Watch Mode (Most Interactive for Development)
```bash
npm run test
```
Press:
- `h` - Show help menu
- `a` - Run all tests
- `f` - Run only failed tests
- `p` - Filter by filename pattern
- `t` - Filter by test name pattern
- `q` - Quit

## 2. Detailed Error Output
```bash
# Run with verbose reporter
npm run test -- --reporter=verbose --run

# Run specific test file
npm run test -- src/features/user/__tests__/user.repository.spec.ts --run
```

## 3. Test Coverage
```bash
# See which lines are covered
npm run test:ci -- --coverage

# Generate HTML coverage report
npm run test:ci -- --coverage --coverage.reporter=html
# Then open coverage/index.html in browser
```

## 4. Filter Tests by Name
```bash
# Run only tests containing "username"
npm run test -- -t username --run

# Run only tests in a specific describe block
npm run test -- -t "UserRepository" --run
```

## 5. Debug Mode
```bash
# Run with more detailed output
npm run test -- --logLevel=verbose --run

# Run single test file with full details
npm run test -- src/features/user/__tests__/user.repository.spec.ts --reporter=verbose --run
```

## 6. Install Vitest UI for Browser-based Testing
```bash
npm install -D @vitest/ui
npm run test -- --ui
```
This opens a browser with:
- Visual test tree
- Real-time test results
- Detailed error messages
- Code coverage visualization
- Test history

## What Error Messages Show

When a test fails, you'll see:
1. **Test name and location**: Which test failed and where
2. **Expected vs Received**: What the test expected vs what it got
3. **Diff view**: Green (+) for expected, Red (-) for actual
4. **Stack trace**: Exact line where the assertion failed
5. **Mock call details**: If testing mock functions, shows actual calls

Example error output:
```
AssertionError: expected 'user' to be 'admin'
Expected: "admin"
Received: "user"
  at src/features/user/__tests__/user.repository.spec.ts:70:30
```

For object comparisons:
```
- "password": "wrongpassword",
+ "password": "hashedpassword",
```