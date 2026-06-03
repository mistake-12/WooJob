# State Management

> How state is managed in this project.

---

## Overview

This project uses **Zustand** (`useJobStore`) for global server-backed state and **React useState** for local view/component state. The key pattern is a two-tier state system: `currentView` controls which top-level view is rendered; within journey view, `currentJourneyStage` controls which stage content is shown.

---

## State Categories

### Global State (Zustand `useJobStore`)

| State | Type | Purpose |
|-------|------|---------|
| `jobs` | `Job[]` | Kanban board jobs |
| `trashedJobs` | `Job[]` | Soft-deleted jobs |
| `tasks` | `Task[]` | Agenda/schedule tasks |
| `aiConversations` | `AIConversation[]` | General AI chat sessions |
| `aiMessages` | `AIMessage[]` | General AI chat messages (ai_messages table) |
| `aiMode` | `AIMode` | Current AI sidebar mode (chat/extract_job/extract_task) |

### Local View State (useState in `app/page.tsx`)

| State | Type | Purpose |
|-------|------|---------|
| `currentView` | `'kanban' \| 'agenda' \| 'journey'` | Top-level view switching |
| `currentJourneyStage` | `string \| null` | Stage within journey (null = hub) |
| `selectedJobId` | `string \| null` | Selected job for drawer |
| `selectedTaskId` | `string \| null` | Selected task for details |

### Journey-Specific State (Local to `JourneyHub`)

| State | Type | Purpose |
|-------|------|---------|
| `diagnosisFlowStage` | `'form' \| 'preview' \| 'report'` | Diagnosis multi-step flow |
| `jobSnapshot` | `JobSnapshot \| null` | AI-identified job preview data |
| `diagnosisReport` | `DiagnosisReport \| null` | Generated diagnosis report |
| `journeyId` | `string \| null` | Current journey ID from Supabase |
| `hubStatus` | `{ diagnosisCompleted, gapFillingCompleted }` | Card status from DB |

### URL State

None. This is a single-page application. All navigation is state-based, not route-based. URL does not change during view/stage switching. This is intentional for MVP simplicity.

---

## When to Use Global State

| Criteria | Use Global (Zustand) | Use Local (useState) |
|----------|---------------------|---------------------|
| Needed across multiple views | ✅ Yes | ❌ No |
| Persisted to Supabase | ✅ Yes (via server actions) | ❌ No |
| Specific to one component tree | ❌ No | ✅ Yes |
| Transient UI state (loading, errors) | ❌ No | ✅ Yes |
| Journey stage flow state | ❌ No | ✅ Yes (local to JourneyHub) |

---

## Server State Pattern

### Server Actions as the Data Layer

All Supabase reads/writes go through Server Actions (`'use server'` functions in `app/actions/`). Components never call Supabase directly.

```
Component → Store Action → Server Action → Supabase
     ↑                                          |
     └────────────── response ──────────────────┘
```

### Journey-Specific Server Actions

| File | Purpose |
|------|---------|
| `app/actions/journey-ai.ts` | Journey CRUD, Guide Agent messages, stage persistence |
| `app/actions/diagnosis.ts` | Job identification, diagnosis report, artifact saving |
| `app/actions/gap-filling.ts` | Latest diagnosis query, plan generation, plan saving |
| `app/actions/guide-prompt.ts` | Guide Agent system prompt builder |

### Artifact Pattern (Cross-Stage Data Flow)

Stages communicate through `ai_journey_artifacts`, not direct props or global state:

```ts
// Stage A writes artifact
await saveArtifact(journeyId, 'diagnosis', 'diagnosis_report', reportData);

// Stage B reads artifact
const { data: artifacts } = await supabase
  .from('ai_journey_artifacts')
  .select('data')
  .eq('journey_id', journeyId)
  .eq('stage', 'diagnosis')
  .eq('artifact_type', 'diagnosis_report')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

### Stage Persistence (Lightweight)

Stage completion state is tracked via `current_stage` and `completed_stages` on the journey row:

```ts
// Mark stage as completed
await updateJourneyStage(journeyId, 'diagnosis');
// Sets current_stage = 'diagnosis', appends to completed_stages array
```

---

## Common Mistakes

### Don't: Mix Journey State into Global Store

```tsx
// ❌ Wrong — journey state doesn't need to survive view switches
useJobStore.setState({ diagnosisReport: data });
```

```tsx
// ✅ Correct — local to the component that owns the flow
const [diagnosisReport, setDiagnosisReport] = useState<DiagnosisReport | null>(null);
```

### Don't: Call Supabase Directly from Components

```tsx
// ❌ Wrong — bypasses server actions and auth checks
const { data } = await supabase.from('ai_journey_artifacts').select('*');
```

```tsx
// ✅ Correct — goes through authenticated server action
const { report, error } = await getLatestDiagnosis(userId);
```

### Don't: Create Independent Routes for Journey Stages

```tsx
// ❌ Wrong — breaks persistent Header + AISidebar
// Creating app/journey/diagnosis/page.tsx as a separate route
```

```tsx
// ✅ Correct — all journey views render within the main canvas
{currentView === 'journey' && <JourneyHub currentStage={...} />}
```
