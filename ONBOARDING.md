# Welcome to the Team — Developer Onboarding Guide

Hello and welcome! This document is your starting point for understanding the codebase you'll be working on.
The goal here is to give you enough context so that by the time you have a computer set up and ready to go, you're not starting from zero — you already have a mental model of how everything fits together.

Take your time reading this. There's a lot here, but it's all real knowledge about the real codebase, not made-up examples.

---

## Table of Contents

1. [What This App Does](#1-what-this-app-does)
2. [The Monolith Architecture](#2-the-monolith-architecture)
3. [Project Folder Structure](#3-project-folder-structure)
4. [The Database — PostgreSQL](#4-the-database--postgresql)
5. [Prisma — The ORM](#5-prisma--the-orm)
6. [The Backend — Node.js with Express](#6-the-backend--nodejs-with-express)
7. [The Frontend — React](#7-the-frontend--react)
8. [How Data Flows End-to-End](#8-how-data-flows-end-to-end)
9. [Shared Code — DTOs](#9-shared-code--dtos)
10. [Authentication & Permissions](#10-authentication--permissions)
11. [Running the App Locally](#11-running-the-app-locally)
12. [Key Libraries You'll Encounter](#12-key-libraries-youll-encounter)
13. [Things to Know Before You Write Code](#13-things-to-know-before-you-write-code)

---

## 1. What This App Does

This application is called **ds-app** (DS stands for Digital Solutions). It is a workforce management tool. It handles things like:

- **Team Members** — employees, their start/end dates, roles, supervisors, countries
- **Time Off** — vacation, sick leave, holidays, approvals
- **Projects & Assignments** — which team member is assigned to which project
- **Hiring** — tracking candidates and open positions
- **Endorsements** — performance-related bonuses and endorsements
- **Bench** — employees who are not currently assigned to a project
- **Reports & Charts** — data visualization of all of the above
- **Maintenance Tables** — lookup data like countries, regions, roles, tier bands, etc.

Think of it as an internal HR + project management tool.

---

## 2. The Monolith Architecture

You may have heard terms like "microservices" — where an application is split into many small, independent services. **This app is NOT that.** It is a **monolith**, meaning everything lives in one application, one repository, and one deployment.

Here's what that looks like:

```
┌─────────────────────────────────────────────────────────┐
│                        ds-app                           │
│                                                         │
│   ┌──────────────────────┐  ┌──────────────────────┐   │
│   │    Frontend (React)  │  │  Backend (Node.js)   │   │
│   │    ds-app/client/    │  │  ds-app/src/         │   │
│   └──────────────────────┘  └──────────────────────┘   │
│                                        │                │
│                               ┌────────▼───────┐        │
│                               │  PostgreSQL DB │        │
│                               └────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

The backend serves the frontend as static files. When a user opens the app in a browser, the browser downloads the React app from the backend, and then the React app talks to the backend's API endpoints (URLs that start with `/api/`).

**Why a monolith?** It's simpler. One thing to deploy, one set of logs to read, one repository to manage. For a team of this size and an application of this complexity, it's the right choice.

---

## 3. Project Folder Structure

```
ds-app/
├── src/                    ← The Node.js backend (TypeScript)
│   ├── index.ts            ← Entry point — where the server starts
│   ├── routes/             ← HTTP route handlers (one file per resource)
│   ├── db/                 ← Database access functions (Prisma queries)
│   ├── services/           ← Business logic (more complex than a simple DB query)
│   ├── middleware/         ← Express middleware (auth, permissions)
│   └── logger.ts           ← Logging utility
│
├── client/                 ← The React frontend (TypeScript)
│   └── src/
│       ├── main.tsx        ← React entry point
│       ├── pages/          ← One folder per page/section of the app
│       ├── components/     ← Reusable UI components
│       ├── hooks/          ← Reusable React hooks
│       ├── services/       ← Frontend functions that call the backend API
│       ├── lib/            ← Low-level utilities (api.ts lives here)
│       └── routing/        ← App routing configuration
│
├── shared/                 ← Code shared between backend AND frontend
│   └── dto/                ← TypeScript interfaces for data shapes (DTOs)
│
├── prisma/
│   └── schema.prisma       ← The database schema — the source of truth for DB structure
│
└── package.json            ← Root package with build/start scripts
```

The most important thing to understand: **the backend and frontend are two separate TypeScript projects** that live in the same repository. The backend compiles from `src/`, the frontend compiles from `client/src/`. They share types from `shared/`.

---

## 4. The Database — PostgreSQL

The app uses **PostgreSQL** (often written as "Postgres") as its database. PostgreSQL is a powerful, open-source relational database. If you've worked with MySQL or SQL Server, Postgres is very similar — it uses SQL, has tables, rows, columns, foreign keys, and indexes.

### Schemas

One thing that might be new to you: this database uses **multiple schemas**. In Postgres, a "schema" is like a namespace — a way to group tables together. Think of it like folders for tables.

This app uses these schemas:

| Schema | Purpose |
|--------|---------|
| `ds`   | Main business data — team members, time-offs, countries, etc. |
| `sec`  | Security — users, roles, permissions (RBAC) |
| `com`  | Communication — notifications |
| `es`   | Endorsements |
| `di`   | Data import (persistence jobs) |

When you see a table name like `ds.cou_countries`, it means: schema `ds`, table `cou_countries`. The prefix `cou_` is a convention used in this codebase to abbreviate the entity name (cou = country, tms = team member, pro = project, etc.).

### You Do Not Run Migrations

This is important: **database migrations are handled by the DB team**, not by developers. If you need to add a column, change a type, or create a table, you write a SQL script and hand it off. You do **not** run `prisma migrate` commands. More on this in the Prisma section.

*Note: this rule applies to production. In your local dev environment, feel free to run migrations and experiment freely — you won't break anything that matters.*

---

## 5. Prisma — The ORM

### What is an ORM?

ORM stands for **Object-Relational Mapper**. In plain English: it's a library that lets you interact with the database using TypeScript/JavaScript instead of writing raw SQL strings.

Without an ORM, you'd write code like this:

```typescript
// Raw SQL — fragile, no type safety, error-prone
const result = await pool.query(
  `SELECT cou_id, cou_name FROM ds.cou_countries WHERE cou_id = $1`,
  [id]
);
const country = result.rows[0];
// TypeScript has no idea what `country` looks like — it's just `any`
```

With Prisma (the ORM we use), you write this instead:

```typescript
// Prisma — clean, type-safe, readable
const country = await prisma.country.findUnique({
  where: { countryId: id },
});
// TypeScript knows exactly what `country` looks like!
// country.countryId, country.countryName, etc. are all typed
```

The ORM is the layer between your TypeScript code and the database. It handles building the SQL query, sending it to Postgres, and returning the result in a typed object.

### The Schema File

The most important file in the Prisma setup is [`prisma/schema.prisma`](prisma/schema.prisma). This file describes every table in the database as a Prisma "model". Here's an example:

```prisma
model Country {
  countryId             Int      @id @default(autoincrement()) @map("cou_id")
  countryName           String   @map("cou_name") @db.VarChar(100)
  regionId              Int?     @map("reg_id")
  countryIso            String?  @map("cou_iso") @db.VarChar(2)
  countryCurrencySymbol String?  @map("cou_currency_symbol") @db.VarChar(10)
  region                Region?  @relation(fields: [regionId], references: [regionId])
  teamMembers           TeamMember[]

  @@map("cou_countries")
  @@schema("ds")
}
```

Let's break that down piece by piece:

- `model Country` — this is the TypeScript name you'll use in code (`prisma.country`)
- `countryId Int @id @default(autoincrement()) @map("cou_id")` — the TypeScript field is `countryId`, but in the actual database column it's called `cou_id`. The `@map` bridges the two names.
- `String?` — the `?` means this field is **optional** (nullable). Without `?`, the field is required.
- `@db.VarChar(100)` — tells Prisma the exact Postgres column type
- `region Region? @relation(...)` — this is a **relation**. It means `Country` has a foreign key pointing to `Region`. Prisma understands this and lets you include related data in queries.
- `@@map("cou_countries")` — the actual table name in the database
- `@@schema("ds")` — the Postgres schema this table lives in

### The Prisma Client

The Prisma client is the singleton object that your code uses to make queries. It lives in [`src/db/prisma.ts`](src/db/prisma.ts):

```typescript
import { PrismaClient } from '@prisma/client';

// A single shared PrismaClient for the whole app
export const prisma = new PrismaClient({ ... });
```

Every database file imports this `prisma` object and uses it. Never create a new `PrismaClient` yourself — always import the singleton.

### Common Prisma Query Patterns

Here are the patterns you'll see constantly in `src/db/`:

```typescript
// Get all records
await prisma.country.findMany();

// Get all records with sorting
await prisma.country.findMany({
  orderBy: { countryId: 'asc' },
});

// Get one record by its primary key
await prisma.country.findUnique({
  where: { countryId: id },
});

// Get one record that might not exist (returns null if not found)
await prisma.country.findFirst({
  where: { regionId: 5 },
});

// Create a new record
await prisma.country.create({
  data: {
    countryName: 'Mexico',
    regionId: 2,
    countryIso: 'MX',
  },
});

// Update an existing record
await prisma.country.update({
  where: { countryId: id },
  data: { countryName: 'México' },
});

// Delete a record
await prisma.country.delete({
  where: { countryId: id },
});

// Include related data (a "JOIN" in SQL terms)
await prisma.country.findMany({
  include: { region: true },
  // Now each country will have a `region` object attached to it
});

// Filter with conditions
await prisma.teamMember.findMany({
  where: {
    teamMemberEndDate: null,         // No end date = still active
    countryId: { in: [1, 2, 3] },   // Country is one of these
  },
});
```

### Why We Use `prisma db push` Instead of Migrations

Normally in Prisma you'd run `prisma migrate dev` to apply schema changes. **We don't do that here.** The DB team manages the actual database schema directly. We use `prisma db push` (only in local dev) to synchronize the local dev database with whatever is in `schema.prisma`, without creating migration files. Production schema changes go through the DB team's own process.

*Note: this rule applies to production. In your local dev environment, feel free to use `prisma migrate dev` or any other Prisma commands freely — you can't break anything that matters.*

---

## 6. The Backend — Node.js with Express

### What is Node.js?

Node.js is a runtime that lets you run JavaScript/TypeScript on a server (outside of a browser). Our backend is written in TypeScript and runs on Node.js.

### What is Express?

Express is a minimal web framework for Node.js. It lets you define **routes** — URL patterns that trigger a function when the server receives an HTTP request.

The server entry point is [`src/index.ts`](src/index.ts). When it starts, it:

1. Creates an Express app
2. Attaches middleware (JSON parsing, cookies, CORS, auth)
3. Registers all API routes
4. Serves the built React app as static files
5. Starts listening on a port (default: 8080)

### How Routes Work

Every resource in the app has its own route file in `src/routes/`. For example, [`src/routes/countries.ts`](src/routes/countries.ts):

```typescript
import express from 'express';
const router = express.Router();

// GET /api/countries
router.get('/', requirePermission('Countries', 'read'), async (req, res) => {
  try {
    const countries = await getAllCountries();  // calls src/db/countries.ts
    res.json(countries);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

// POST /api/countries
router.post('/', requirePermission('Countries', 'create'), async (req, res) => {
  const { countryName, regionId } = req.body;
  const created = await createCountry(regionId, countryName);
  res.status(201).json(created);
});

export default router;
```

And in [`src/routes/index.ts`](src/routes/index.ts), all routers are registered:

```typescript
router.use('/countries', countriesRouter);
// This means: any request to /api/countries/* goes to countriesRouter
```

So the full URL for getting all countries is: `GET /api/countries`

### The Three-Layer Pattern

Every feature in the backend follows the same pattern:

```
Route Handler          DB Layer              Prisma
(src/routes/)    →   (src/db/)         →   (PostgreSQL)
countries.ts         countries.ts           cou_countries table
```

1. **Route** — receives the HTTP request, validates input, calls the DB layer, returns a response
2. **DB layer** — contains the actual Prisma queries, named clearly (e.g. `getAllCountries`, `createCountry`)
3. **Prisma** — translates the query into SQL and talks to the database

For more complex things (like processing attrition, handling notifications, import jobs), there's also a `services/` layer between the route and the DB.

### HTTP Status Codes

When writing routes, we follow standard HTTP conventions:

| Code | Meaning | When to use |
|------|---------|-------------|
| `200` | OK | Successful GET, PUT |
| `201` | Created | Successful POST that created something |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Caller sent invalid data |
| `401` | Unauthorized | No valid auth token |
| `403` | Forbidden | Valid token but no permission |
| `404` | Not Found | The item doesn't exist |
| `500` | Server Error | Something went wrong on our side |

---

## 7. The Frontend — React

### What is React?

React is a JavaScript library for building user interfaces. Instead of manually manipulating HTML with JavaScript, you write **components** — functions that return UI. React re-renders components automatically when their data (state) changes.

### Our React Setup

We use:
- **React 19** — the latest version
- **TypeScript** — all components are `.tsx` files (TypeScript + JSX)
- **Vite** — the build tool (think: very fast webpack)
- **React Router v7** — for navigating between pages without full page reloads
- **Tailwind CSS** — utility-first CSS framework (you style things with class names like `className="flex gap-4 p-2"`)

### Components

A component is just a TypeScript function that returns JSX (HTML-like syntax):

```tsx
// A simple component
function WelcomeBanner({ name }: { name: string }) {
  return (
    <div className="p-4 bg-blue-100 rounded">
      <h1>Welcome, {name}!</h1>
    </div>
  );
}
```

### State

State is data that can change, and when it changes, React re-renders the component. You declare state with `useState`:

```tsx
function CounterButton() {
  const [count, setCount] = useState(0); // count starts at 0

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

### useEffect

`useEffect` lets you run code as a side effect — for example, fetching data when a component first renders:

```tsx
function CountriesPage() {
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    // Runs once when the component mounts
    fetch('/api/countries')
      .then(r => r.json())
      .then(setCountries);
  }, []); // The [] means "only run once"

  return <ul>{countries.map(c => <li key={c.countryId}>{c.countryName}</li>)}</ul>;
}
```

### Pages vs Components

- **Pages** (`client/src/pages/`) — top-level components that represent a whole screen. There's one per section of the app (time-off, hiring, maintenance, etc.)
- **Components** (`client/src/components/`) — reusable pieces of UI used across multiple pages (buttons, dialogs, tables, toolbars)

### Hooks

A **hook** is a function that starts with `use` and encapsulates reusable logic. React has built-in hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) and you can also write your own custom hooks.

The most important custom hook in this codebase is `useEntityList` ([`client/src/hooks/use-entity-list.ts`](client/src/hooks/use-entity-list.ts)). It handles the full CRUD lifecycle for any entity:

```tsx
const countries = useEntityList<CountryDTO, CreateCountryDTO, UpdateCountryDTO>({
  endpoint: '/api/countries',
  idKey: 'countryId',
  onSuccess: (msg) => toast({ title: 'Success', description: msg }),
  onError:   (err) => toast({ title: 'Error', description: err, variant: 'destructive' }),
});

// Then you can:
await countries.loadItems();           // GET /api/countries
await countries.createItem(newData);   // POST /api/countries
await countries.updateItem(id, data);  // PUT /api/countries/:id
await countries.deleteItem(id);        // DELETE /api/countries/:id
// And countries.items has the current list, countries.loading is true/false
```

### Forms with react-hook-form

Forms use [`react-hook-form`](https://react-hook-form.com/). It manages form state, validation, and submission. You'll see this pattern frequently:

```tsx
const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
  defaultValues: { countryName: '', regionId: '' },
});

const onSubmit = async (data: FormData) => {
  await apiPut('/api/countries/1', data);
};

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    <input {...register('countryName', { required: 'Name is required' })} />
    {errors.countryName && <span>{errors.countryName.message}</span>}
    <button type="submit" disabled={isSubmitting}>Save</button>
  </form>
);
```

### Data Tables with TanStack Table

Most list pages use [`@tanstack/react-table`](https://tanstack.com/table/v8) for displaying data in tables. You define **columns** and pass them data, and the library handles sorting, filtering, and pagination.

You'll see imports like `ColumnDef`, `useReactTable`, `getCoreRowModel` — these are all from TanStack Table.

---

## 8. How Data Flows End-to-End

Let's trace what happens when a user opens the Countries maintenance page:

```
1. Browser loads the React app (a static bundle of JS/CSS)

2. React Router renders <CountriesPage />

3. The component calls countries.loadItems()
   which calls apiGet<CountryDTO[]>('/api/countries')
   which calls fetch('/api/countries', { credentials: 'include' })

4. The request hits the Express backend
   → authMiddleware runs: checks the JWT cookie, populates req.user
   → requirePermission('Countries', 'read') runs: checks if user can read countries
   → The route handler runs

5. The route handler calls getAllCountries() from src/db/countries.ts

6. getAllCountries() calls prisma.country.findMany({ orderBy: { countryId: 'asc' } })

7. Prisma translates that to SQL:
   SELECT cou_id, cou_name, reg_id, cou_iso, cou_currency_symbol
   FROM ds.cou_countries
   ORDER BY cou_id ASC

8. PostgreSQL executes the query and returns rows

9. Prisma maps the rows back to TypeScript objects (using the field names from schema.prisma)

10. The route handler calls res.json(countries) — sends JSON response

11. The React app receives the JSON array

12. countries.items is updated with the new data

13. React re-renders the component with the list of countries visible
```

This same pattern repeats for every feature in the app.

---

## 9. Shared Code — DTOs

**DTO** stands for **Data Transfer Object**. It's a TypeScript interface that defines the shape of data being passed around — particularly between the backend and frontend.

The `shared/dto/` folder contains these interfaces, and **both the backend and frontend import from it**. This is how we ensure both sides always agree on what data looks like.

For example, [`shared/dto/Country.ts`](shared/dto/Country.ts):

```typescript
// What the server sends to the client
export interface CountryDTO {
  countryId: number;
  countryName: string;
  regionId: number | null;
  countryIso: string | null;
  countryCurrencySymbol: string | null;
}

// What the client sends to create a country
export interface CreateCountryDTO {
  countryName: string;
  regionId: number | null;
  countryIso?: string | null;
  countryCurrencySymbol?: string | null;
}

// What the client sends to update a country
export interface UpdateCountryDTO {
  countryName?: string;
  // ... all fields optional because you might only update one thing
}
```

The path alias `@shared/*` is configured in TypeScript so you can import cleanly:

```typescript
// From the frontend:
import type { CountryDTO } from '@shared/dto';

// From the backend:
import type { Country } from '@prisma/client'; // (backend uses Prisma's generated types more often)
```

---

## 10. Authentication & Permissions

### How Auth Works

The app supports multiple authentication providers. In production it uses **Google IAP** (Identity-Aware Proxy) — a Google Cloud service that sits in front of the app. In staging it uses **OneLogin** (SSO). In local development, it uses a simple dev JWT token so you can log in without a real SSO setup.

All requests to `/api/*` (except `/api/auth/*`) go through the `authMiddleware` in [`src/middleware/auth.ts`](src/middleware/auth.ts). This middleware:

1. Reads the JWT from the `access_token` cookie (or the `Authorization` header)
2. Validates it (verifies signature, checks expiry)
3. Looks up (or creates) the user in the `sec` schema
4. Attaches the user info to `req.user`
5. Calls `next()` to continue to the actual route handler

If auth fails, the middleware returns a 401 response and the route handler never runs.

### How Permissions Work (RBAC)

RBAC stands for **Role-Based Access Control**. The idea is: instead of assigning permissions directly to users, you assign users to **roles**, and roles have **permissions**.

The structure is:

```
User → has one or more Roles → each Role has Permissions → Permission = (Resource, Action)
```

For example: a user might have the role "HR Manager", which has permission to `create` on resource `TeamMembers`.

In code, after auth, each route uses `requirePermission`:

```typescript
// Only users with 'Countries' + 'read' permission can call this
router.get('/', requirePermission('Countries', 'read'), async (req, res) => { ... });

// Only users with 'Countries' + 'create' permission can call this
router.post('/', requirePermission('Countries', 'create'), async (req, res) => { ... });
```

On the frontend, the `usePermissions` hook exposes `canRead`, `canCreate`, `canDelete` helpers that you use to conditionally show or hide UI elements (like the "Create" button).

---

## 11. Running the App Locally

The full instructions are in [`HowToRunLocally.md`](HowToRunLocally.md). Here's the quick summary:

**Prerequisites:** Rancher Desktop (not Docker Desktop)

**Steps:**
1. Clone the repo
2. Open `ds-app/.env.local` and set your email in `DEV_USERNAME` and `VITE_DEV_USERNAME`
3. Run `bash scripts/setup-local-db.sh` — this starts a local Postgres container and sets up all schemas and tables
4. Start the backend: `npm run dev` (from `ds-app/`)
5. Start the frontend: `npm run dev` (from `ds-app/client/`)
6. Open `http://localhost:5173` in your browser

The backend runs on port 3000 and the frontend dev server runs on port 5173. In development, Vite proxies `/api/*` requests from port 5173 to port 3000, so you don't have to worry about CORS.

### API Documentation

Once the backend is running, you can explore all API endpoints at:

```
http://localhost:3000/docs
```

This is a Swagger UI that shows every route, its expected inputs, and its responses.

---

## 12. Key Libraries You'll Encounter

| Library | Where | What It Does |
|---------|-------|--------------|
| `express` | Backend | Web framework — HTTP routing |
| `prisma` | Backend | ORM — TypeScript-friendly database queries |
| `pg` | Backend | Raw Postgres driver (used directly in a few places) |
| `jsonwebtoken` | Backend | Signs and verifies JWT tokens |
| `dayjs` | Backend | Date manipulation |
| `react` | Frontend | UI framework |
| `react-router` | Frontend | Client-side routing (navigation between pages) |
| `react-hook-form` | Frontend | Form state management and validation |
| `zod` | Frontend | Schema validation (used with forms) |
| `@tanstack/react-table` | Frontend | Data table with sorting/filtering/pagination |
| `@tanstack/react-query` | Frontend | Server state management (some pages use this) |
| `tailwindcss` | Frontend | CSS utility classes for styling |
| `lucide-react` | Frontend | Icon library |
| `sonner` | Frontend | Toast notifications (pop-up messages) |
| `date-fns` | Frontend | Date formatting |
| `notistack` | Frontend | Another notification system used in parts of the app |

---

## 13. Things to Know Before You Write Code

### TypeScript is Strict

Both the backend and frontend have strict TypeScript enabled. This means:
- You cannot use `any` without a good reason
- Optional fields (`?`) must be handled — you can't access `.name` on something that might be `null`
- Function parameters and return types should be typed

If you see a TypeScript error, don't work around it with `as any` — understand why TypeScript is complaining and fix the actual issue.

### Dates Are Displayed as dd-MMM-yyyy

When displaying dates to users, the format is always `20-Mar-2026` (day-Month abbreviation-year). There's a utility function (`formatUTCDate`) that handles this. Always use it instead of formatting dates manually.

### Cards Don't Use CardHeader

When building page cards, don't use the `CardHeader` component — put `CardTitle` directly inside `CardContent`. This avoids an unwanted border divider line.

### SQL Scripts Go to the DB Team

If a feature requires a new table, a new column, or any other database schema change, you write a SQL script and hand it to the DB team. You do not run `prisma migrate` or any DDL statements yourself.

*Note: this rule applies to production. In your local dev environment, run whatever you need — migrations, DDL, schema changes — no restrictions.*

### The `@shared/` Path Alias

Both the backend and frontend can import types from the shared folder using `@shared/`:

```typescript
import type { CountryDTO } from '@shared/dto';
```

This works because of the `paths` configuration in `tsconfig.json`. Don't import using relative paths like `../../shared/dto` — use the alias.

### Postman Collection

There's a Postman collection in [`TICADS.postman_collection.json`](TICADS.postman_collection.json). Import it into Postman to have all the API requests pre-built for testing the backend directly.

---

## Your First Week Goals

Here's a suggested reading path for your first few days:

**Day 1** — Read this document fully. Look at the folder structure without opening files yet. Just get a feel for where things are.

**Day 2** — Read through [`prisma/schema.prisma`](prisma/schema.prisma) from top to bottom. You don't need to memorize it, just get familiar with the models and how they relate to each other.

**Day 3** — Follow one feature end-to-end. Start with **Countries** because it's the simplest full-CRUD feature:
- [`src/db/countries.ts`](src/db/countries.ts) — Prisma queries
- [`src/routes/countries.ts`](src/routes/countries.ts) — Express routes
- [`shared/dto/Country.ts`](shared/dto/Country.ts) — DTO types
- [`client/src/pages/maintenance/countries/index.tsx`](client/src/pages/maintenance/countries/index.tsx) — React page
- [`client/src/pages/maintenance/countries/form.tsx`](client/src/pages/maintenance/countries/form.tsx) — Create/Edit form

**Day 4** — Read [`HowToRunLocally.md`](HowToRunLocally.md) and set up your local environment. Get the app running.

**Day 5** — Open the app in your browser and play with it. Click around. Watch the Network tab in browser DevTools to see the API calls. Match what you see in the UI with the code you read.

---

Welcome again! Don't hesitate to ask questions — no question is too basic. The best way to learn a codebase is to ask a lot of "why" questions.
