/**
 * Trivia DTOs
 *
 * Questions are persisted in ds.trq_trivia_questions, batch-generated on
 * admin demand from the SOP knowledge base — see
 * documents/superpowers/specs/2026-09-24-trivia-question-bank-design.md.
 */

export type TriviaBatchStatus = 'pending' | 'completed' | 'failed';

export interface TriviaQuestionDTO {
  id: number;
  question: string;
  options: string[];
  /** 0-based index into `options` identifying the correct answer. */
  correctOptionIndex: number;
}

export interface SubmitTriviaAnswerDTO {
  questionId: number;
  selectedOptionIndex: number;
}

export interface TriviaAnswerResultDTO {
  isCorrect: boolean;
  correctOptionIndex: number;
}

export interface TriviaBatchStatusDTO {
  id: number;
  status: TriviaBatchStatus;
  requestedQuestionCount: number;
  insertedQuestionCount: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface AdminTriviaQuestionDTO {
  id: number;
  batchId: number;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  isActive: boolean;
  createdAt: string;
}

export interface UpdateTriviaQuestionDTO {
  isActive?: boolean;
}
