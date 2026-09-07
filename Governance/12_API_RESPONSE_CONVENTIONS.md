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

Error responses are **not** wrapped in `{ data }`. They use a flat shape that `api.ts` already handles:

```ts
// Standard error
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

`api.ts` extracts `details[].message` and joins them into the thrown `ApiError.message`. The frontend catch block receives the joined string.

## Route Template

```ts
// GET /api/things
router.get('/', requirePermission('Things', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await thingOrchestrator.getAll();
    res.json({ data: items });
  } catch (err: unknown) {
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
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});
```

## Frontend Side — No Changes Required

`api.ts` auto-unwraps `{ data: T }` responses and passes legacy raw responses through unchanged. Frontend consumers always receive `T`:

```ts
// Same call works for both new and legacy routes
const holidays = await apiGet<HolidayDTO[]>('/api/holidays');
```

Do not manually unwrap `.data` in frontend code. If you find a call doing `(await apiGet(...)).data`, that route has not been migrated yet — propose the migration.

## Legacy Routes

Existing routes return raw `T` without the envelope. `api.ts` handles them transparently.

**Do not migrate legacy routes automatically.** When you touch an existing route for any reason, propose wrapping its responses in `{ data: T }` before proceeding. Apply only after confirmation.

All new routes written from this point forward must use `{ data: T }` without exception.
