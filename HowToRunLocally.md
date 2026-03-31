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

## Before You Start: Configure Your Email

The local setup requires your email to be set in **two places in `.env.local`**. The setup script reads it from there automatically — you never need to edit `seed.sql`.

| Where | What to set | Why |
| ----- | ----------- | --- |
| `.env.local` — `DEV_USERNAME` | Your email | The server checks this when you log in; also used to seed your dev user into the database |
| `.env.local` — `VITE_DEV_USERNAME` | Same email | Pre-fills the login form in the browser |

**Both values must be the same email address.** The setup script will fail early with a clear message if either is missing or still set to the placeholder.

## 1. Clone the Repository

```bash
git clone <repo-url>
cd ds-app
```

## 2. Configure `.env.local`

The repository includes a `.env.local` file with defaults for local development. Review it and update the values marked below:

| Variable               | Description                                                                 | Default / Action         |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------ |
| `DATABASE_URL`         | Postgres connection string (used by Prisma)                                 | Leave as-is              |
| `DB_USER`              | Postgres user (used by the legacy `pg` pool)                                | `postgres`               |
| `DB_PASSWORD`          | Postgres password                                                           | `postgres`               |
| `DB_HOST`              | Postgres host                                                               | `localhost`              |
| `DB_PORT`              | Postgres port                                                               | `5433`                   |
| `DB_NAME`              | Postgres database name                                                      | `ds_app_local`           |
| `NODE_ENV`             | Environment mode                                                            | `development`            |
| `PORT`                 | Server port                                                                 | `3000`                   |
| `APP_ORIGIN`           | Allowed CORS origin                                                         | `http://localhost:3000`  |
| `DEV_USER_PASSWORD`    | Password for the dev login (see Step 4)                                     | `devpassword`            |
| `JWT_SECRET`           | Secret used to sign local JWT tokens                                        | `your_jwt_secret_key_here` |
| `DEV_USERNAME`         | **Set this** — your email (see "Configure Your Email" above)                | *(set your email)*       |
| `VITE_DEV_USERNAME`    | **Set this** — same email as `DEV_USERNAME`                                 | *(set your email)*       |
| `VITE_ENABLE_DEV_LOGIN`| Enables the dev login button on the sign-in page                           | `true`                   |

> **Note:** The `DATABASE_URL`, `DB_HOST`, and `DB_PORT` values in `.env.local` are for reference only. When running in containers, the `docker-compose.local.yml` overrides these to use the internal network (`postgres-local:5432`).

## 3. Run the Setup Script

```bash
bash scripts/setup-local-db.sh
```

This single command does everything:
1. Starts a local PostgreSQL 16 container and creates the required schemas (`ds`, `sec`, `com`)
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
