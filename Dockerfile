# Ideation Agent Docker Configuration
# Multi-stage build for optimal production image size

# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy frontend source code
COPY src/frontend ./src/frontend
COPY webpack.config.js ./
COPY .env.example ./.env

# Build the frontend
RUN npm run build

# Stage 2: Production server
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ideation -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy backend source code
COPY src/backend ./src/backend

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/build ./build

# Create necessary directories
RUN mkdir -p logs data && \
    chown -R ideation:nodejs /app

# Switch to non-root user
USER ideation

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "src/backend/server.js"] 