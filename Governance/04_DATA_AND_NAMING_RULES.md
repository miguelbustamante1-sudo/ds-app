# Data and Naming Rules

## Prisma Alignment Rule
All backend and frontend data contracts must align with Prisma schema field names exactly.

This includes:
- request DTOs
- response DTOs
- frontend interfaces
- internal transport shapes that cross layer boundaries

## No Unnecessary Mapping
Avoid translating one field name into another just for stylistic reasons.

Bad example:
- database uses `teamMemberId`
- API returns `memberId`
- frontend consumes `selectedMemberId`

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

## Do Not Use These as Replacements
Do not use:
- `teamMemberKnownAs` as the primary display name
- `teamMemberFullName` in selection contexts if it can vary based on known-as logic

## Correct Display Examples
- `${m.teamMemberNames} ${m.teamMemberSurnames}`
- `${m.teamMemberNames} ${m.teamMemberSurnames} (${m.workdayId})`

The goal is consistent formal display across the product.
