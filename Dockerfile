FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install curl/wget for healthcheck
RUN apk add --no-cache curl

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Environment defaults
ENV PORT=3000
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Start the application
CMD ["node", "server.js"]
