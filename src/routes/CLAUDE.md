# API Response Conventions

## Success Envelope
All new routes must wrap their response body in a `{ data: T }` envelope.

```ts
// GET list
res.json({ data: items });

// GET single
res.json({ data: record });

// POST — 201 Created
res.status(201).json({ data: created });

// PUT / PATCH
res.json({ data: updated });
```

The frontend `api.ts` unwraps this automatically. Frontend consumers call `apiGet<HolidayDTO[]>('/api/holidays')` and receive `HolidayDTO[]` directly — they never see the envelope.

## HTTP Status Codes

| Operation | Status | Body |
|---|---|---|
| GET (list or single) | 200 | `{ data: T }` |
| POST (create) | 201 | `{ data: T }` — the created record |
| PUT / PATCH (update) | 200 | `{ data: T }` — the updated record |
| DELETE | 204 | no body |

Never return 200 for a create. Never return a body for a delete.

## Error Shape
Error responses are **not** wrapped in `{ data }`. They use a flat shape:

```ts
res.status(400).json({ error: 'Descriptive message here' });
res.status(404).json({ error: 'Record not found' });
res.status(500).json({ error: 'Failed to process request' });

// Validation error with field-level detail
res.status(400).json({
  error: 'Validation failed',
  details: [
    { message: 'holidayName is required' },
    { message: 'countryId must be a number' },
  ],
});
```

## Route Template

```ts
// GET /api/things
router.get('/', requirePermission('Things', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await thingOrchestrator.getAll();
    res.json({ data: items });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// POST /api/things
router.post('/', requirePermission('Things', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const created = await thingOrchestrator.create(req.body, req.user!.email);
    res.status(201).json({ data: created });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(400).json({ error: message });
  }
});

// DELETE /api/things/:id
router.delete('/:id', requirePermission('Things', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await thingOrchestrator.delete(Number(req.params.id), req.user!.email);
    res.status(204).send();
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});
```

## Legacy Routes
Existing routes return raw `T` without the envelope. `api.ts` handles them transparently.

**Do not migrate legacy routes automatically.** When you touch an existing route, propose wrapping its responses in `{ data: T }` before proceeding. Apply only after confirmation.

---

# Error Handling — Route Catch Block

Every route uses the same two-branch catch:

```ts
} catch (err: unknown) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}
```

- `AppError` → use `err.statusCode` and `err.message` directly. These are business errors the service identified intentionally.
- Anything else → 500. These are unexpected failures (DB down, null dereference, etc.).

Never hardcode a status code by inspecting `err.message` content.

---

# Auth and Request User Rules — Backend

## Request Type Rule
Every protected route receives an `AuthenticatedRequest` where `req.user` has already been populated by auth middleware.

Do not make additional database queries to resolve identity fields that are already present on `req.user`.

## Available `req.user` Fields
- `id`
- `email`
- `firstName`
- `lastName`
- `roles`
- `avatarUrl`
- `permissions`
- `dsUserId`
- `teamMemberId`

## Identity Usage Rule
Use:
- `req.user.email` for audit `createdBy`
- `req.user.dsUserId` when the domain needs the DS application user
- `req.user.teamMemberId` when the domain needs the team member record

## Critical Distinction
These are not the same thing:
- `req.user.id` maps to `sec.auth_users.id`
- `req.user.dsUserId` maps to `ds.tbl_users.usr_id`
- `req.user.teamMemberId` maps to `ds.tbl_users.tms_id`

Do not use `req.user.id` when the feature actually needs `dsUserId` or `teamMemberId`.

## Permission Rule
Permission middleware should consume the resolved permission map attached during authentication.
Do not rebuild authorization state inside each route unless absolutely necessary.
