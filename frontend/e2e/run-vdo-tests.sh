#!/bin/bash

# VDO.Ninja E2E Test Runner Script

echo "🎬 VDO.Ninja Integration Tests Runner"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse command line arguments
TEST_TYPE=${1:-all}
BROWSER=${2:-chromium}
HEADED=${3:-false}

# Function to run tests
run_tests() {
    local test_file=$1
    local test_name=$2
    
    echo -e "${YELLOW}Running: $test_name${NC}"
    
    if [ "$HEADED" = "headed" ]; then
        npx playwright test "$test_file" --project="$BROWSER" --headed
    else
        npx playwright test "$test_file" --project="$BROWSER"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        exit 1
    fi
}

# Main test execution
case $TEST_TYPE in
    lifecycle)
        run_tests "e2e/vdo-ninja-stream-lifecycle.spec.ts" "Stream Lifecycle Tests"
        ;;
    media)
        run_tests "e2e/vdo-ninja-media-controls.spec.ts" "Media Controls Tests"
        ;;
    errors)
        run_tests "e2e/vdo-ninja-error-scenarios.spec.ts" "Error Scenarios Tests"
        ;;
    cross-browser)
        run_tests "e2e/vdo-ninja-cross-browser.spec.ts" "Cross-Browser Tests"
        ;;
    all)
        echo "Running all VDO.Ninja tests..."
        run_tests "e2e/vdo-ninja-stream-lifecycle.spec.ts" "Stream Lifecycle Tests"
        run_tests "e2e/vdo-ninja-media-controls.spec.ts" "Media Controls Tests"
        run_tests "e2e/vdo-ninja-error-scenarios.spec.ts" "Error Scenarios Tests"
        run_tests "e2e/vdo-ninja-cross-browser.spec.ts" "Cross-Browser Tests"
        ;;
    smoke)
        echo "Running smoke tests..."
        npx playwright test e2e/vdo-ninja-stream-lifecycle.spec.ts \
            --grep "should start and stop stream successfully" \
            --project="$BROWSER"
        ;;
    *)
        echo "Usage: ./run-vdo-tests.sh [test-type] [browser] [headed]"
        echo ""
        echo "Test types:"
        echo "  all          - Run all tests (default)"
        echo "  lifecycle    - Run stream lifecycle tests"
        echo "  media        - Run media control tests"
        echo "  errors       - Run error scenario tests"
        echo "  cross-browser - Run cross-browser tests"
        echo "  smoke        - Run quick smoke tests"
        echo ""
        echo "Browsers:"
        echo "  chromium (default)"
        echo "  firefox"
        echo "  webkit"
        echo ""
        echo "Mode:"
        echo "  headless (default)"
        echo "  headed"
        echo ""
        echo "Examples:"
        echo "  ./run-vdo-tests.sh all chromium"
        echo "  ./run-vdo-tests.sh lifecycle firefox headed"
        echo "  ./run-vdo-tests.sh smoke"
        exit 1
        ;;
esac

echo -e "${GREEN}✨ Tests completed successfully!${NC}"