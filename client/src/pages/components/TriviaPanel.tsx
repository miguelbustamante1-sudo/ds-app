/**
 * TriviaPanel — Dashboard trivia quiz card
 * =========================================
 *
 * Fetches AI-generated trivia (GET /api/dashboard/trivia) and renders each
 * question as an interactive multiple-choice quiz. Clicking an option locks
 * that question and reveals immediate feedback: the chosen option is marked
 * correct/wrong and the true correct option is highlighted.
 *
 * Styling uses UDS TELUS semantic tokens only (purple accent gradient, system
 * green/red for feedback).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  ChevronDown,
  Check,
  X,
  Trophy,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type { TriviaQuestionDTO, SubmitTriviaAnswerDTO, TriviaAnswerResultDTO } from "@shared/dto";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

function fetchTrivia(): Promise<TriviaQuestionDTO[]> {
  return apiGet<TriviaQuestionDTO[]>("/api/dashboard/trivia");
}

function submitAnswer(payload: SubmitTriviaAnswerDTO): Promise<TriviaAnswerResultDTO> {
  return apiPost<TriviaAnswerResultDTO, SubmitTriviaAnswerDTO>("/api/trivia/answers", payload);
}

export function TriviaPanel() {
  const [expanded, setExpanded] = useState(true);
  // Maps question index -> the option index the user selected (locked once set).
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const {
    data: questions = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["dashboard-trivia"],
    queryFn: fetchTrivia,
    staleTime: 60_000,
  });

  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.correctOptionIndex ? 1 : 0),
    0,
  );
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const progressPct =
    questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  const submitAnswerMutation = useMutation({ mutationFn: submitAnswer });

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    if (answers[questionIndex] !== undefined) return; // lock
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));

    const question = questions[questionIndex];
    if (question) {
      submitAnswerMutation.mutate({ questionId: question.id, selectedOptionIndex: optionIndex });
    }
  };

  const handleReset = () => setAnswers({});

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-uds-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-uds-card-hover)]">
      {/* Gradient header */}
      <div
        className="flex items-center justify-between px-5 py-4 text-white"
        style={{ background: "var(--gradient-uds-telus-gradient-purple)" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-semibold">Team Leader Trivia</span>
          {questions.length > 0 && (
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
              {correctCount}/{questions.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {answeredCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset quiz"
              className="rounded p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse trivia" : "Expand trivia"}
            className="rounded p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                !expanded && "-rotate-90",
              )}
            />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {questions.length > 0 && (
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-uds-telus-green-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {expanded && (
        <div className="px-5 py-4">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="h-10 rounded-lg bg-muted" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Couldn't load trivia right now. Please try again later.
              </p>
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No trivia available at the moment.
              </p>
            </div>
          ) : (
            <>
              {/* Completion banner */}
              {allAnswered && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-uds-telus-purple-200 bg-uds-telus-purple-50 px-4 py-3">
                  <Trophy
                    className="h-5 w-5 shrink-0 text-uds-telus-purple-500"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-uds-telus-purple-700">
                      {correctCount === questions.length
                        ? "Perfect score! 🎉"
                        : `You scored ${correctCount} of ${questions.length}`}
                    </p>
                    <p className="text-xs text-uds-telus-purple-500">
                      Tap the reset icon to play again.
                    </p>
                  </div>
                </div>
              )}

              <ol className="space-y-5">
                {questions.map((q, qIndex) => {
                  const selected = answers[qIndex];
                  const answered = selected !== undefined;

                  return (
                    <li key={qIndex} className="space-y-3">
                      <p className="text-sm font-medium text-foreground">
                        <span className="mr-1 font-semibold text-uds-telus-purple-500">
                          Q{qIndex + 1}.
                        </span>
                        {q.question}
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {q.options.map((option, oIndex) => {
                          const isCorrect = oIndex === q.correctOptionIndex;
                          const isChosen = oIndex === selected;

                          let stateClasses =
                            "border-border bg-card text-foreground hover:border-uds-telus-purple-300 hover:bg-uds-telus-purple-50";
                          let badgeClasses =
                            "border-border bg-muted text-muted-foreground";

                          if (answered) {
                            if (isCorrect) {
                              stateClasses =
                                "border-uds-system-green-500 bg-uds-system-green-100 text-uds-system-green-700";
                              badgeClasses =
                                "border-uds-system-green-500 bg-uds-system-green-500 text-white";
                            } else if (isChosen) {
                              stateClasses =
                                "border-uds-system-red-500 bg-uds-system-red-100 text-uds-system-red-700";
                              badgeClasses =
                                "border-uds-system-red-500 bg-uds-system-red-500 text-white";
                            } else {
                              stateClasses =
                                "border-border bg-card text-muted-foreground opacity-70";
                            }
                          }

                          return (
                            <button
                              key={oIndex}
                              type="button"
                              onClick={() => handleSelect(qIndex, oIndex)}
                              disabled={answered}
                              aria-pressed={isChosen}
                              className={cn(
                                "group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all duration-200",
                                stateClasses,
                                !answered && "hover:-translate-y-0.5 hover:shadow-[var(--shadow-uds-card)]",
                                answered && "cursor-default",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                                  badgeClasses,
                                )}
                              >
                                {OPTION_LETTERS[oIndex] ?? oIndex + 1}
                              </span>
                              <span className="flex-1">{option}</span>
                              {answered && isCorrect && (
                                <Check
                                  className="h-4 w-4 shrink-0 text-uds-system-green-700"
                                  aria-hidden="true"
                                />
                              )}
                              {answered && isChosen && !isCorrect && (
                                <X
                                  className="h-4 w-4 shrink-0 text-uds-system-red-700"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
}
