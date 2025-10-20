# Multi-stage build - compile TypeScript then run compiled JS
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN rm -rf dist && npx tsc --project tsconfig.build.json && npx tsc-alias -p tsconfig.build.json

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Generate Prisma client
RUN npx prisma generate

# Copy compiled JavaScript from builder
COPY --from=builder /app/dist ./dist

# Add Cloud SQL proxy
ADD https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 /cloud_sql_proxy
RUN chmod +x /cloud_sql_proxy

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start with compiled JavaScript
CMD ["node", "dist/server.js"]
