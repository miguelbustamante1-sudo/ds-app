import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });
import express from 'express';
import fs from 'fs';
import path from 'path';
import cookieParser from 'cookie-parser';
import { ensureCategoriesTableExists } from './db/timeOffCategories';
import { ensureCountriesTableExists } from './db/countries';
import { ensureRegionsTableExists } from './db/regions';
import registerRoutes from './routes';
import { pool } from './db/pool';
import { checkAllSchemas } from './db/schema';
import { checkAuthSchemas } from './db/authSchema';
import authRoutes from './routes/auth';
import { authMiddleware } from './middleware/auth';
import { getAllCountries } from './db/countries';
import { error } from './logger';
import { processAttritionTimeOffs } from './services/attrition';
import { processCountdownNotifications } from './services/timeoff/countdownNotifications/processCountdownNotifications';
import { backfillTimeOffDays } from './services/timeoff/backfill/backfillTimeOffDays';
import { processSlaBreaches } from './services/workflow/components/SlaBreachScanner';

import type { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './swagger';

import cors from 'cors';
import type { CorsOptions } from 'cors';

const app = express();
const port = Number(process.env.PORT) || 8080;

// Configuration for Google Apps Script
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.APP_ORIGIN,
      "https://previewnot---ds-app-mvp-dazxcvmu7q-uc.a.run.app",
      "https://ds-app-dev-600309317644.us-central1.run.app"
     ];

    // !origin allows server-to-server requests like UrlFetchApp
    if (!origin || (origin && allowedOrigins.includes(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
};

app.use(express.json());
app.use(cookieParser());

const publicDir = path.join(__dirname, '..', '..', 'public');
const spaIndexPath = path.join(publicDir, 'index.html');

// Swagger UI and OpenAPI JSON
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.get('/openapi.json', (req: Request, res: Response) => res.json(openapiSpec));

// Serve the built client bundle (copied to /app/public in the container)
app.use(express.static(publicDir));

// Periodic schema validation (helps detect external schema changes)
let schemaCheckResult: { ok: boolean; details: any[]; lastChecked?: string | undefined; error?: string | undefined } = { ok: true, details: [], lastChecked: undefined };

async function refreshSchemaCheck() {
  try {
    const [coreResult, authResult] = await Promise.all([checkAllSchemas(), checkAuthSchemas()]);
    const errorMessages = [coreResult.error, authResult.error].filter(Boolean).join('; ');

    schemaCheckResult = {
      ok: coreResult.ok && authResult.ok,
      details: [...coreResult.details, ...authResult.details],
      lastChecked: new Date().toISOString(),
      error: errorMessages || undefined,
    };
  } catch (e) {
    schemaCheckResult = { ok: false, details: [], error: e instanceof Error ? e.message : String(e), lastChecked: new Date().toISOString() };
  }
}

// Run immediately and then every 5 minutes
refreshSchemaCheck();
setInterval(refreshSchemaCheck, 5 * 60 * 1000);

// Backfill job: recalculate timeOffDays for any record where it is null or 0.
// Runs once on startup to fix bulk-uploaded records that are missing day counts.
backfillTimeOffDays();

// Attrition job: cancel future time-offs for team members who have reached their end date.
// Runs once on startup (to catch any missed days) and then every 24 hours.
processAttritionTimeOffs();
setInterval(processAttritionTimeOffs, 24 * 60 * 60 * 1000);

// Countdown notifications: alert team member and their supervisor chain at
// 90, 60, 30, 15, and 1 day(s) before a time off's start date.
// Runs once on startup (catches any milestone missed while server was down)
// and then every 24 hours.
processCountdownNotifications();
setInterval(processCountdownNotifications, 24 * 60 * 60 * 1000);

// SLA breach scanner: detects tasks past their due date and escalates them.
// Runs once on startup and then every 15 minutes.
processSlaBreaches();
setInterval(processSlaBreaches, 15 * 60 * 1000);

// PostgreSQL connection pool for Cloud SQL
// pool is provided by `src/db/pool.ts`

app.get('/api/ping', (req: Request, res: Response) => {
  res.send({
    message: 'pong',
    timestamp: new Date().toISOString(),
    appOrigina: process.env.APP_ORIGIN
  });
});

app.get('/api/dbhealth', async (req: Request, res: Response) => {
  try {
    console.log('Connected to database for health check');
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    // Include schema check result in response so external schema changes are visible here
    res.status(200).json({
      status: 'ok',
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      schema_ok: schemaCheckResult.ok,
      schema_details: schemaCheckResult.details,
      schema_last_checked: schemaCheckResult.lastChecked,
      schema_error: schemaCheckResult.error,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
});

// Auth routes are public; all other routes require JWT auth
app.use('/api', cors(corsOptions));
app.use('/api/auth', authRoutes);
app.use('/api', authMiddleware, registerRoutes());

// SPA fallback (avoid hijacking API/docs routes or asset requests)
app.get(/.*/, (req: Request, res: Response, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  if (!req.accepts('html')) {
    return next();
  }

  if (req.path.startsWith('/api') || req.path.startsWith('/docs')) {
    return next();
  }

  if (req.path === '/openapi.json') {
    return next();
  }

  if (path.extname(req.path)) {
    return next();
  }

  if (!fs.existsSync(spaIndexPath)) {
    return next();
  }

  return res.sendFile(spaIndexPath);
});

/*
// Verify categories, countries and regions tables exist (non-destructive)
Promise.all([ensureCategoriesTableExists(), ensureCountriesTableExists(), ensureRegionsTableExists(), (async() => { try { const m = await import('./db/timeOffCategoriesXCountry'); return m.ensureTableExists(); } catch (e) { return false; } })()]).then(([catExists, countryExists, regionExists, categoriesXCountryExists]) => {
  if (!catExists) {
    console.error('Categories table ds.toc_time_of_categories not found - API may fail until table is created.');
  } else {
    console.log('Categories table found');
  }

  if (!countryExists) {
    console.error('Countries table ds.cou_countries not found - API may fail until table is created.');
  } else {
    console.log('Countries table found');
  }

  if (!regionExists) {
    console.error('Regions table ds.reg_regions not found - API may fail until table is created.');
  } else {
    console.log('Regions table found');
  }
}).catch((err) => {
  console.error('Failed to check tables existence:', err);
});*/

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;
