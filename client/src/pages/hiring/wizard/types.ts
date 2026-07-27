import type { UseFormReturn } from 'react-hook-form';
import type { HiringDTO, ProjectAssignmentDTO, TeamMemberDTO, TimeOffDTO } from '@shared/dto';

/**
 * Shared form data for Step 1 (Candidate Entry) and Step 2 (Role & Rate).
 * Mirrors the fields from the original standalone endorsement-create page (removed in the Sprint 2
 * cleanup once this wizard replaced it).
 * `clientId` is only used to scope the project ComboBox — it is never submitted.
 */
export interface WizardFormData {
  candidateFirstName: string;
  candidateLastName: string;
  clientId: string;
  posId: string;
  projectId: string;
  clientManagerEmail: string;
  tibId: string;
  billingRate: string;
  billingRateCurrency: string;
  countryId: string;
  startDate: string;
  sklId: string;
  grpId: string;
  comment: string;
}

export type WizardFormReturn = UseFormReturn<WizardFormData>;

/** The six named steps shown in the stepper UI. */
export type WizardStepId = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * State machine states, computed from { endorsement, hiring } per the Sprint 2 plan:
 *   S0 — no endorsementId in the URL                                   -> Step 1/2 (Candidate Entry / Role & Rate)
 *   S1 — endorsement.status === 'Pending'                              -> Step 3 (Approval, waiting variant)
 *   S2 — endorsement.status === 'Rejected'                             -> Step 3 (Approval, rejected variant — terminal)
 *   S3 — Approved, hiring === null                                     -> Step 4 (Hiring Details — create draft)
 *   S4 — Approved, hiring.status === 'Pending', no workdayId           -> Step 5 (Execute — same editable form as S5,
 *                                                                          Execute button disabled until Workday ID is filled)
 *   S5 — Approved, hiring.status === 'Pending', workdayId set          -> Step 5 (Execute — Execute button enabled)
 *   S6 — hiring.status === 'Processed'                                 -> Step 6 (Success)
 *
 * S4 and S5 render the exact same component (ExecuteStep) — per the legacy hiring/detail page, once a
 * hiring row exists there is only ever one screen ("execute mode": a fully editable form pre-filled from
 * the row, with a single Execute action gated by workdayId). There is no separate "save my edits without
 * executing" action or endpoint — nothing persists until Execute is clicked.
 */
export type WizardState = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';

/** Maps a computed wizard state to the stepper step it should display (S0 is resolved locally by the caller). */
export function stateToStepId(state: WizardState): WizardStepId {
  switch (state) {
    case 'S1':
    case 'S2':
      return 3;
    case 'S3':
      return 4;
    case 'S4':
    case 'S5':
      return 5;
    case 'S6':
      return 6;
    case 'S0':
    default:
      return 1;
  }
}

/**
 * Local form data for Step 4 (Hiring Details) and Step 5 (Execute) — a single form
 * instance per step, distinct from the Steps 1-2 shared form since Hiring is a
 * separate entity from Endorsement.
 */
export interface HiringFormData {
  startDate: string;
  billableDate: string;
  workdayId: string;
  /** ComboBox value — empty string means "not selected"; converted to number|null at submit. */
  teamLeadId: string;
}

/**
 * Shape of PATCH /api/hiring/:id/execute's success response. The route returns the
 * orchestrator's raw result (no `{ data }` envelope) — see HiringOrchestrator.ExecuteHiringResult.
 * `teamMember`/`projectAssignments`/`projectedTimeOffs` are Prisma model instances serialized as
 * JSON; typed here against the closest-matching shared DTOs rather than importing `@prisma/client`
 * on the frontend.
 */
export interface ExecuteHiringResultDTO {
  hiring: HiringDTO;
  teamMember: TeamMemberDTO;
  projectAssignments: ProjectAssignmentDTO[];
  projectedTimeOffs: TimeOffDTO[];
}
