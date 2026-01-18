# Use Node.js 20 LTS with Alpine
FROM node:20-alpine

# Install ffmpeg for Alpine Linux
RUN apk add --no-cache ffmpeg

# Create temp directories for video processing
RUN mkdir -p /tmp/uploads /tmp/audio && \
    chmod 777 /tmp/uploads /tmp/audio

# ... rest stays the same

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Install dev dependencies temporarily to build
RUN npm install --only=development

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose the port your app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]