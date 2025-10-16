# Single stage - run TypeScript directly with tsx
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma/

# Install all dependencies (including tsx)
RUN npm ci
RUN npx prisma generate

# Copy all source code
COPY . .

# Add Cloud SQL proxy
ADD https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 /cloud_sql_proxy
RUN chmod +x /cloud_sql_proxy

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start with tsx (Better Auth v1.3.27 might have fixed crypto issue)
CMD ["npx", "tsx", "src/server.ts"]