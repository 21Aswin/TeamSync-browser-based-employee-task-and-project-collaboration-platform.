#!/bin/sh
set -e

# If external DB_HOST is provided and not localhost/127.0.0.1, skip internal MariaDB
if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "localhost" ] && [ "$DB_HOST" != "127.0.0.1" ]; then
  echo "[ENTRYPOINT] Using external MySQL at $DB_HOST:$DB_PORT"
else
  echo "[ENTRYPOINT] Starting built-in MariaDB/MySQL inside container..."
  mkdir -p /run/mysqld /var/lib/mysql
  chown -R mysql:mysql /run/mysqld /var/lib/mysql

  if [ ! -d "/var/lib/mysql/mysql" ]; then
    echo "[ENTRYPOINT] Initializing MariaDB data directory..."
    mariadb-install-db --user=mysql --datadir=/var/lib/mysql --auth-root-authentication-method=normal > /dev/null 2>&1
  fi

  echo "[ENTRYPOINT] Launching mariadbd daemon..."
  /usr/bin/mariadbd --user=mysql --datadir=/var/lib/mysql --bind-address=0.0.0.0 --skip-networking=0 --skip-grant-tables --skip-name-resolve &
  
  echo "[ENTRYPOINT] Waiting for MySQL server to start..."
  until /usr/bin/mariadb-admin ping -h 127.0.0.1 --silent; do
    sleep 1
  done
  echo "[ENTRYPOINT] MySQL started successfully."

  /usr/bin/mariadb -h 127.0.0.1 -u root -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME:-teamsync_db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" || true
fi

export DB_HOST=${DB_HOST:-127.0.0.1}

echo "[ENTRYPOINT] Running migrations..."
node src/database/migrate.js

echo "[ENTRYPOINT] Running seeds..."
node src/database/seed.js

echo "[ENTRYPOINT] Starting TeamSync on port ${PORT:-3000}..."
exec node server.js
