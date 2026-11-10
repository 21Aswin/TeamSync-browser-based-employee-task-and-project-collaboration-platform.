FROM node:20-alpine

# Install curl and embedded MariaDB/MySQL
RUN apk add --no-cache curl mariadb mariadb-client

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Ensure entrypoint script is executable
RUN chmod +x docker-entrypoint.sh

# Expose server port
EXPOSE 3000

# Environment defaults
ENV PORT=3000
ENV NODE_ENV=production
ENV DB_HOST=127.0.0.1
ENV DB_PORT=3306
ENV DB_USER=root
ENV DB_PASSWORD=""
ENV DB_NAME=teamsync_db
ENV JWT_SECRET=teamsync_super_secret_jwt_key_2026_production_auto
ENV JWT_EXPIRES_IN=24h
ENV COOKIE_SECURE=false

# Start using entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]
