# Directory Structure

> How frontend code is organized in this project.

---

## Overview

This is a Next.js 16 App Router project with a single-page application architecture. The main page (`app/page.tsx`) orchestrates three views (kanban/agenda/journey) via state-based switching. Journey components are organized by stage under `components/journey/`.

---

## Top-Level Layout

```
project/
├── app/
│   ├── page.tsx                  # Main SPA shell (Header + canvas + sidebar)
│   ├── layout.tsx                # Root layout
│   ├── actions/                  # Server Actions ('use server')
│   │   ├── ai.ts                 # General AI chat (ai_conversations/ai_messages)
│   │   ├── ai-helpers.ts         # Prompt builders, JSON parsers
│   │   ├── journey-ai.ts         # Journey CRUD, Guide Agent messages
│   │   ├── diagnosis.ts          # Job identification, diagnosis report
│   │   ├── gap-filling.ts        # Plan generation, plan persistence
│   │   ├── guide-prompt.ts       # Guide Agent system prompt builder
│   │   ├── jobs.ts               # Job CRUD
│   │   ├── tasks.ts              # Task CRUD (also used by gap-filling)
│   │   └── profile.ts            # User profile, resumes
│   ├── api/
│   │   └── journey/create/       # Journey initialization endpoint
│   └── login/                    # Auth page
├── components/
│   ├── AISidebar.tsx             # Dual-mode sidebar (ai / journey)
│   ├── KanbanColumn.tsx          # Kanban board column
│   ├── AgendaView.tsx            # Calendar/agenda view
│   ├── journey/                  # Journey feature components
│   │   ├── JourneyHub.tsx        # Hub + flow orchestration
│   │   ├── JourneyStageCard.tsx  # Reusable stage card
│   │   ├── diagnosis/            # Diagnosis stage
│   │   │   ├── DiagnosisForm.tsx
│   │   │   ├── JobPreviewCard.tsx
│   │   │   └── DiagnosisReportView.tsx
│   │   └── gap/                  # Gap-filling stage
│   │       ├── GapFillingView.tsx
│   │       ├── GapPlanPhaseSection.tsx
│   │       └── GapPlanItemCard.tsx
│   └── ui/                       # Shared UI primitives (shadcn)
├── store/
│   └── useJobStore.ts            # Zustand global store
├── types/
│   ├── index.ts                  # Frontend UI types
│   ├── database.ts               # Supabase row/input types
│   ├── diagnosis.ts              # Diagnosis-specific types
│   └── gap-filling.ts            # Gap-filling-specific types
├── lib/
│   ├── supabase.ts               # Client-side Supabase
│   ├── supabase-server.ts        # Server-side Supabase
│   └── dateUtils.ts              # Date formatting utilities
└── supabase_journey_tables.sql   # Journey schema migrations
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Page components | `page.tsx` | `app/page.tsx` |
| Feature components | `PascalCase.tsx` | `JourneyHub.tsx` |
| Server actions | `kebab-case.ts` | `journey-ai.ts` |
| Types | `kebab-case.ts` | `diagnosis.ts` |
| Sub-feature dirs | `kebab-case/` | `diagnosis/` |

---

## When to Create a New Directory

| Scenario | Where |
|----------|-------|
| New journey stage (e.g., interview) | `components/journey/<stage>/` |
| New server action group | `app/actions/<feature>.ts` |
| New type group (>3 interfaces) | `types/<feature>.ts` |
| New independent view (like kanban) | `components/<ViewName>.tsx` |

---

## Design Decision: Journey Components Live Under `components/journey/`

**Context**: Journey feature spans multiple stages (diagnosis, gap-filling, resume, interview, etc.) with shared patterns (stage cards, artifact-based data flow). They need a clear home distinct from the existing kanban/agenda/task components.

**Decision**: All journey components live under `components/journey/` with subdirectories per stage. The Hub component lives at the root of `journey/` since it orchestrates all stages.

**Consequences**:
- Easy to find all journey-related code
- Stage subdirectories keep each stage's components self-contained
- Server actions stay in `app/actions/` (Next.js convention for `'use server'`)

---

## Don't: Create Independent Route Pages for Journey Views

```tsx
// Wrong — creates separate pages that lose the Header + Sidebar
app/journey/page.tsx
app/journey/diagnosis/page.tsx
app/journey/gap-filling/page.tsx
```

All journey views render within `app/page.tsx`'s main canvas. The single-page architecture keeps Header and AISidebar persistent across all views.
