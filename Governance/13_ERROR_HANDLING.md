# Error Handling

## Recommended Pattern

Services throw. Routes catch. The route is responsible for sending the HTTP response.

There is no centralized Express error handler — each route handles its own errors in the catch block.

## Violation Policy

If you encounter existing code that uses a different pattern (plain `throw new Error`, result objects, type-name-only error classes):
- **Do not refactor it automatically.**
- Identify it and propose the migration to the user before touching it.
- For any **new** code you write, always follow the pattern below.

---

## AppError — Base Class for All Domain Errors

All domain errors must extend `AppError` from `src/errors/AppError.ts`:

```ts
import { AppError } from '../../../errors/AppError';

export class SwapEligibilityError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'SwapEligibilityError';
  }
}

export class SwapNotFoundError extends AppError {
  constructor(message: string = 'Holiday swap not found') {
    super(message, 404);
    this.name = 'SwapNotFoundError';
  }
}
```

**Rules:**
- Each domain defines its own error classes in its component or a dedicated `errors.ts` file inside its domain folder.
- The `statusCode` is set once in the constructor — the route never guesses it.
- Use 400 for business rule violations, 404 for not-found, 403 for access denied, 409 for conflicts.

---

## Route Catch Block

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

## Service / Orchestrator

Services throw `AppError` subclasses for business rule violations. They throw plain `Error` (or let Prisma errors bubble) for unexpected failures.

```ts
// Good — business rule violation
const record = await prisma.thing.findUnique({ where: { id } });
if (!record) throw new ThingNotFoundError();

// Good — access rule
if (record.teamMemberId !== requestingMemberId) {
  throw new AppError('Access denied', 403);
}

// Good — let unexpected DB errors bubble as-is (route will catch as 500)
const created = await prisma.thing.create({ data });
```

Do not wrap every Prisma call in try/catch inside the service. Let infrastructure errors propagate naturally to the route's catch block where they become 500s.

---

## Status Code Reference

| Code | When to use |
|---|---|
| 400 | Business rule violation, invalid input, precondition not met |
| 403 | Access denied (authenticated but not authorized) |
| 404 | Record not found |
| 409 | Conflict (duplicate, state clash) |
| 500 | Unexpected / infrastructure failure — never throw this intentionally |

---

## Existing Patterns (Legacy)

The codebase contains three older patterns that predate this standard:

| Pattern | Where | Issue |
|---|---|---|
| `throw new Error('message')` with hardcoded status in route | Most older routes | Route guesses status from message content |
| Custom error class with `statusCode` but no base class | Bench domain | Correct idea, not standardized |
| Result object `{ valid, errorCode, errorMessage }` | Holiday swap validators | Two-step: validator returns, orchestrator throws |

Propose migration when touching any of these. Do not migrate automatically.
