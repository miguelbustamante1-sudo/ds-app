# How to Run ds-app Locally

## Prerequisites

Make sure you have the following installed:

- **Rancher Desktop** — download and install from [rancherdesktop.io](https://docs.rancherdesktop.io/getting-started/installation/)

> **Note:** Docker Desktop is **not** supported. Use Rancher Desktop instead.

### Configure Rancher Desktop

After installing, you must configure Rancher Desktop to provide the `docker` command:

1. Open **Rancher Desktop**
2. Go to **Preferences** (gear icon) > **Container Engine**
3. Select **dockerd (moby)** — do **not** use `containerd`
4. Go to **Preferences** > **Application** > **Path Management** and make sure it is **enabled** (this adds `docker` to your terminal PATH)
5. Click **Apply** and wait for the VM to restart
6. **Restart your terminal**, then verify:

```bash
docker --version
docker compose version
```

Both commands should print version info. If `docker` is still not found, close and reopen your terminal.

That's it — Node.js is **not** required on your machine. Everything runs inside containers.

## 1. Clone the Repository

```bash
git clone <repo-url>
cd ds-app
```

## 2. Create Your `.env.local`

`.env.local` is **not committed to the repository** — each team member must create their own copy. Create the file at the root of `ds-app/` and paste the template below, then fill in the two marked values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ds_app_local
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5433
DB_NAME=ds_app_local
NODE_ENV=development
PORT=3000
APP_ORIGIN=http://localhost:3000
DEV_USER_PASSWORD=devpassword
JWT_SECRET=your_jwt_secret_key_here
DEV_USERNAME=your@email.com         # ← set this to your email
VITE_DEV_USERNAME=your@email.com    # ← same email as above
VITE_ENABLE_DEV_LOGIN=true
```

**`DEV_USERNAME` and `VITE_DEV_USERNAME` must be the same email address.** The setup script reads `DEV_USERNAME` to seed your dev user into the database and will fail early if it is missing or still set to the placeholder.

> **Note:** The `DATABASE_URL`, `DB_HOST`, and `DB_PORT` values above are for reference only. When running in containers, `docker-compose.local.yml` overrides these to use the internal Docker network (`postgres-local:5432`).

## 3. Run the Setup Script

```bash
bash scripts/setup-local-db.sh
```

This single command does everything:
1. Starts a local PostgreSQL 16 container and creates the required schemas (`ds`, `sec`, `com`, `es`, `di`)
2. Runs `prisma db push` to create all tables based on `prisma/schema.prisma`
3. Seeds the database with reference data and your dev user — email is read automatically from `DEV_USERNAME` in `.env.local`
4. Builds the app using `Dockerfile.local` (compiles server + client)
5. Starts the application container

Once complete, the app is available at **http://localhost:3000**.

## 4. Log In with Dev Login

1. Open **http://localhost:3000** in your browser
2. On the sign-in page, click **"Dev Login"**
3. Enter the email from `DEV_USERNAME` and the password from `DEV_USER_PASSWORD`
4. The server validates these against the environment variables and looks up the user in the database
5. If the user exists, a local JWT is created and you're logged in

> **Note:** The "Sign in with OneLogin" button won't work locally since it requires OneLogin SSO configuration.

## 5. Useful Commands

| Command | Description |
| ------- | ----------- |
| `bash scripts/setup-local-db.sh` | Build and start everything (first time or after code changes) |
| `docker compose -f docker-compose.local.yml logs -f app` | Follow the application logs |
| `docker compose -f docker-compose.local.yml restart app` | Restart the app without rebuilding |
| `docker compose -f docker-compose.local.yml up -d --build app` | Rebuild and restart the app after code changes |
| `docker compose -f docker-compose.local.yml exec postgres-local psql -U postgres -d ds_app_local` | Open a psql shell to the local database |
| `docker compose -f docker-compose.local.yml down` | Stop all containers |
| `docker compose -f docker-compose.local.yml down -v` | Stop all containers and **delete** local DB data |

## Troubleshooting

- **`command not found: docker`:** Make sure Rancher Desktop is running with **dockerd (moby)** engine and Path Management is enabled (see "Configure Rancher Desktop" above). Restart your terminal after changing settings.
- **Port 3000 already in use:** Change the host port in `docker-compose.local.yml` (e.g., `"3001:8080"`) and update `APP_ORIGIN` in `.env.local` accordingly.
- **Port 5433 already in use:** Another Postgres instance may be running. Stop it or change the port mapping in `docker-compose.local.yml`.
- **App container exits immediately:** Check the logs with `docker compose -f docker-compose.local.yml logs app`.
- **`prisma db push` fails:** Make sure the Postgres container is healthy. Run the setup script again.
- **Dev login says "Test user not found":** `DEV_USERNAME` and `VITE_DEV_USERNAME` in `.env.local` must be the same email address. Re-run `bash scripts/setup-local-db.sh` after correcting them so the database is re-seeded.
- **Code changes not reflected:** The app runs a compiled build inside a container. After code changes, rebuild with `docker compose -f docker-compose.local.yml up -d --build app`.
