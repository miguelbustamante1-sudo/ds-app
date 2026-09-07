/**
 * Trivia DTOs
 *
 * Contract for the dashboard trivia widget. Questions are generated
 * dynamically from the TL manual via Fuel iX — there is no backing
 * database table, so this is a read-only contract (no Create/Update DTOs).
 */

export interface TriviaQuestionDTO {
  question: string;
  options: string[];
  /** 0-based index into `options` identifying the correct answer. */
  correctOptionIndex: number;
}
