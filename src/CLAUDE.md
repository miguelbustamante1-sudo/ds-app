# Backend Architecture

## Architectural Style
This project is a DDD-structured monolith.

That means:
- the application is still a monolith
- logic is segregated by business domain
- domain structure is used for clarity and maintainability
- do not split the app into microservices or unrelated technical silos

## Domain Location Rule
All domain logic must live under:

`src/services/[domainName]/`

Example:
- all time-off logic must live inside `src/services/timeoff/`

## Action Modeling Rule
Group code by business action, not only by technical layer.

Prefer business flows such as:
- create request
- validate overlap
- approve request
- calculate availability

instead of giant generic service files.

## Orchestrator Pattern
If a domain flow becomes non-trivial, break it into:
- small single-purpose component files
- one orchestrator that coordinates those components

### Example Pattern
- `src/services/timeoff/components/ValidateOverlappingDates.ts`
- `src/services/timeoff/components/ResolveSupervisorScope.ts`
- `src/services/timeoff/TimeOffOrchestrator.ts`

## File Size Rule
If a file stops being easy to scan quickly, refactor it into smaller components immediately.

## Logic Placement Rule
If an action belongs to a domain, keep it inside that domain.
Do not place time-off logic outside `src/services/timeoff/`.
Do not place audit logic outside the audit service.
Do not place reporting hierarchy logic in feature routes or random services.

---

# Data and Naming Rules

## Prisma Alignment Rule
All backend data contracts must align with Prisma schema field names exactly.

This includes:
- request DTOs
- response DTOs
- internal transport shapes that cross layer boundaries

## No Unnecessary Mapping
Avoid translating one field name into another just for stylistic reasons.

Bad example:
- database uses `teamMemberId`
- API returns `memberId`

Good example:
- keep `teamMemberId` consistently unless a transformation is functionally required

## Team Member Display Name Rule
Always display a team member's formal full name as:

`teamMemberNames + " " + teamMemberSurnames`

Use this consistently in:
- dropdowns
- ComboBoxes
- DataGrid cells
- labels
- headings
- selection surfaces

Do not use `teamMemberKnownAs` as the primary display name.

## Correct Display Examples
- `${m.teamMemberNames} ${m.teamMemberSurnames}`
- `${m.teamMemberNames} ${m.teamMemberSurnames} (${m.workdayId})`
