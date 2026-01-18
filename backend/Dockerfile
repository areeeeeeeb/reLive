# Use Node.js 18 LTS with Debian
FROM node:18-bullseye

# Install ffmpeg and clean up to reduce image size
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Create temp directories for video processing
RUN mkdir -p /tmp/uploads /tmp/audio && \
    chmod 777 /tmp/uploads /tmp/audio

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