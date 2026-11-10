# TeamSync - Production Deployment Guide 🚀

This document provides step-by-step instructions for deploying the **TeamSync** platform across various cloud providers and hosting environments.

---

## Architecture Overview
- **Backend:** Node.js (v18+) with Express
- **Real-time Engine:** Socket.IO with server-side authorization
- **Database:** MySQL 8.0+
- **Frontend:** Vanilla HTML5 / Modern CSS / Vanilla JavaScript (served directly via Express static & PHP template fallback handler)

---

## 🛠️ Required Environment Variables

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Listening port for the Express HTTP & WebSocket server | `3000` (or dynamically assigned by PaaS, e.g. `$PORT`) |
| `NODE_ENV` | Runtime environment mode | `production` |
| `DB_HOST` | MySQL hostname or cloud connection string | `mysql` or `junction.proxy.rlwy.net` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL username | `teamsync_user` |
| `DB_PASSWORD` | MySQL password | `your_secure_password` |
| `DB_NAME` | MySQL database name | `teamsync_db` |
| `JWT_SECRET` | Secret cryptographic key for signing JWT tokens | `min_32_characters_random_hex_string` |
| `JWT_EXPIRES_IN` | Session token lifespan | `24h` |
| `COOKIE_SECURE` | Set `true` if serving over HTTPS in production | `true` |
| `CLIENT_URL` | Public domain URL for CORS policy | `https://your-domain.com` |

---

## Option 1: Deploy on Railway (Recommended & Easiest) 🌟

Railway provides 1-click managed MySQL databases and automatic continuous deployment from GitHub with full WebSocket support.

### Steps:
1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** > **Provision MySQL**.
3. In the same project, click **New** > **GitHub Repo** > Select `21Aswin/TeamSync-browser-based-employee-task-and-project-collaboration-platform..git`.
4. Go to your web service's **Variables** tab and click **Add Reference** to link the MySQL variables:
   - `DB_HOST` = `${{MySQL.MYSQLHOST}}`
   - `DB_PORT` = `${{MySQL.MYSQLPORT}}`
   - `DB_USER` = `${{MySQL.MYSQLUSER}}`
   - `DB_PASSWORD` = `${{MySQL.MYSQLPASSWORD}}`
   - `DB_NAME` = `${{MySQL.MYSQLDATABASE}}`
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (Generate any secure 32+ character random string)
   - `JWT_EXPIRES_IN` = `24h`
   - `COOKIE_SECURE` = `true`
5. Under service **Settings** > **Build & Deploy**:
   - Build Command: `npm install`
   - Start Command: `node src/database/migrate.js && node src/database/seed.js && npm start`
6. Click **Generate Domain** under Networking to get your live `https://teamsync-production.up.railway.app` URL.

---

## Option 2: Deploy on Render.com ☁️

1. Create a free account on [render.com](https://render.com).
2. Create a free MySQL database on [Aiven.io](https://aiven.io) or [Clever Cloud](https://www.clever-cloud.com) (or use TiDB Serverless / Supabase).
3. In Render, select **New +** > **Web Service** > Connect your GitHub repository.
4. Set:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/database/migrate.js && node src/database/seed.js && npm start`
5. Add the database credentials into the **Environment Variables** section.
6. Click **Deploy Web Service**.

---

## Option 3: Deploy with Docker Compose (VPS / AWS EC2 / DigitalOcean) 🐳

The repository includes a ready-to-use `docker-compose.yml` that orchestrates both MySQL 8.0 and TeamSync:

```bash
# 1. Clone repository on the server
git clone https://github.com/21Aswin/TeamSync-browser-based-employee-task-and-project-collaboration-platform..git
cd TeamSync-browser-based-employee-task-and-project-collaboration-platform.

# 2. Start all containers in detached mode
docker compose up -d --build

# 3. Check logs to confirm migrations, seed data, and server start
docker compose logs -f app
```

Your app will be live at `http://your_server_ip:3000`.

---

## Option 4: Instant Public Demo URL via Local Tunnel (No setup needed) ⚡

If you want to immediately showcase the app running on your machine to a client, examiner, or friend without setting up cloud accounts:

```bash
# Using Cloudflare Tunnel (Quickest & Free HTTPS)
npx cloudflared tunnel --url http://localhost:3000

# OR using LocalTunnel
npx localtunnel --port 3000
```
This generates a temporary public HTTPS URL accessible from any phone or computer across the world.
