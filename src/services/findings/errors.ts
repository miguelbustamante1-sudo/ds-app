import { AppError } from '../../errors/AppError';

/** ds.fn_run_state_rules() failed inside Postgres — the whole run is rolled back. */
export class StateRulesRunError extends AppError {
  constructor(cause: string) {
    super(`State rules run failed: ${cause}`, 500);
    this.name = 'StateRulesRunError';
  }
}
