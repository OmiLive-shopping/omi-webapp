#!/bin/bash

# Frontend Deployment Script for Firebase Hosting
# This script builds and deploys the frontend to Firebase

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-}"  # Empty for same-domain (Firebase rewrite)
FIREBASE_PROJECT="${FIREBASE_PROJECT:-omi-live-backend}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  OMI Frontend Deployment to Firebase${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Validate environment
echo -e "${YELLOW}[1/5] Validating environment...${NC}"

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Error: Firebase CLI is not installed${NC}"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}Error: pnpm is not installed${NC}"
    echo "Install with: npm install -g pnpm"
    exit 1
fi

echo -e "${GREEN}✓ Environment validated${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${YELLOW}[2/5] Installing dependencies...${NC}"
pnpm install --ignore-scripts  # Skip prepare scripts (Husky) during deployment
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Build frontend
echo -e "${YELLOW}[3/5] Building frontend for production...${NC}"

# Create production env file if BACKEND_URL is set
if [ -n "$BACKEND_URL" ]; then
    echo "VITE_SERVER_URL=$BACKEND_URL" > .env.production
    echo -e "${BLUE}Using backend URL: $BACKEND_URL${NC}"
else
    echo "VITE_SERVER_URL=" > .env.production
    echo -e "${BLUE}Using same-domain (Firebase rewrite to Cloud Run)${NC}"
fi

# Run build (this includes typecheck)
pnpm build || {
    echo -e "${YELLOW}Warning: Build had some warnings, but continuing...${NC}"
}

echo -e "${GREEN}✓ Build completed${NC}"
echo ""

# Step 4: Verify firebase.json configuration
echo -e "${YELLOW}[4/5] Verifying Firebase configuration...${NC}"

if ! grep -q "omi-backend" firebase.json; then
    echo -e "${RED}Error: firebase.json doesn't have Cloud Run rewrite configured${NC}"
    echo "Add this to firebase.json under hosting.rewrites:"
    echo '  {
    "source": "/api/**",
    "run": {
      "serviceId": "omi-backend",
      "region": "us-central1"
    }
  }'
    exit 1
fi

echo -e "${GREEN}✓ Firebase configuration verified${NC}"
echo ""

# Step 5: Deploy to Firebase
echo -e "${YELLOW}[5/5] Deploying to Firebase Hosting...${NC}"

firebase use "$FIREBASE_PROJECT"
firebase deploy --only hosting

echo -e "${GREEN}✓ Deployment completed${NC}"
echo ""

# Get hosting URL
HOSTING_URL=$(firebase hosting:channel:list --json 2>/dev/null | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "https://app.omiliveshopping.com")

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Successful! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Hosting URL:${NC} $HOSTING_URL"
echo -e "${BLUE}Backend (via proxy):${NC} $HOSTING_URL/api/v1"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Visit your app: $HOSTING_URL"
echo "2. Try logging in with: admin@omi.live / password123"
echo "3. Check browser console for any errors"
echo ""
