# Project Stack and Global Rules

## Core Tech Stack
- Backend: Node.js with Express using TypeScript
- ORM and Database Access: Prisma 7
- Frontend: React with TypeScript using Metronic React
- UI Layer: Tailwind CSS and Metronic ReUI, which is Radix-based

## Global Source of Truth
The Prisma 7 schema is the source of truth for:
- model names
- property names
- DTO field names
- API response field names
- frontend interface field names

If a property name is unclear, check the Prisma schema first.

## Naming Convention
Use `camelCase` for:
- variables
- DTOs
- interfaces
- service inputs and outputs
- frontend props
- request and response objects

## Data Consistency Rule
DTOs, API responses, and frontend interfaces must mirror Prisma schema column names exactly.

Do not introduce renaming or mapping layers between backend and frontend unless there is a computational transformation that truly requires it.

## Decision Order When in Doubt
1. Check the Prisma schema
2. Check the domain folder where the logic belongs
3. Check whether the service should be split into components plus an orchestrator
4. Check Metronic React documentation before creating UI structure
