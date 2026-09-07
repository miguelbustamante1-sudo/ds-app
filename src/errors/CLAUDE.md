# Error Handling — AppError Definition Rules

## Base Class
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

## Rules
- Each domain defines its own error classes in its component or a dedicated `errors.ts` file inside its domain folder.
- The `statusCode` is set once in the constructor — the route never guesses it.
- Use 400 for business rule violations, 404 for not-found, 403 for access denied, 409 for conflicts.

## Status Code Reference

| Code | When to use |
|---|---|
| 400 | Business rule violation, invalid input, precondition not met |
| 403 | Access denied (authenticated but not authorized) |
| 404 | Record not found |
| 409 | Conflict (duplicate, state clash) |
| 500 | Unexpected / infrastructure failure — never throw this intentionally |
