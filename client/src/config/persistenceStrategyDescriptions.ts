import { ErrorHandlingStrategy, DuplicatesHandlingStrategy } from '@shared/dto/PersistenceTemplate';

// --- Error Handling Strategy descriptions -------------------------------------

export const ERROR_HANDLING_DESCRIPTIONS: Record<ErrorHandlingStrategy, string> = {
  [ErrorHandlingStrategy.STOP_ON_FIRST_ERROR_AND_COMMIT]:
    'When an error is found it stops and saves the succeed insertions made during the data import.',
  [ErrorHandlingStrategy.STOP_ON_FIRST_ERROR_AND_ROLLBACK]:
    'When an error is found it stops and undo all insertions made during the data import.',
};

// --- Duplicate Handling Strategy descriptions ---------------------------------
// (to be filled in later)

export const DUPLICATE_HANDLING_DESCRIPTIONS: Record<DuplicatesHandlingStrategy, string> = {
  [DuplicatesHandlingStrategy.REPLACE]: 'During data import, any duplicate record found is automatically replaced.',
  [DuplicatesHandlingStrategy.INSERT]: 'During data import, the first duplicate record found stops the process and raises an error.',
};
