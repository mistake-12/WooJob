# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

This project follows a single-page application architecture with server actions as the data layer. All code must pass `tsc --noEmit` and `next build` before commit.

---

## Forbidden Patterns

### Don't: Use `router.push()` for Journey Navigation

The journey feature uses state-based canvas switching, not route-based navigation. Creating independent routes or using `router.push()` breaks the persistent Header + AISidebar layout.

```tsx
// Wrong
import { useRouter } from 'next/navigation';
router.push('/journey/diagnosis');
```

```tsx
// Correct — callback-based stage selection
onStageSelect('diagnosis');
```

### Don't: Call Supabase Directly from Client Components

All Supabase access must go through Server Actions (`'use server'`). This ensures auth checks and proper error handling.

```tsx
// Wrong — bypasses auth, no error standardization
const { data } = await supabase.from('ai_journey_artifacts').select('*');
```

```tsx
// Correct
const { report, error } = await getLatestDiagnosis();
```

### Don't: Mix Journey and General AI Messages

Guide Agent messages go to `ai_journey_messages`. General AI messages go to `ai_messages`. Never cross the streams — each has its own server action, its own table, and its own prompt.

### Don't: Hardcode Stage Status

Stage card status must be derived from actual DB state via `getJourneyHubStatus()`. Hardcoding `'available'` for all stages hides real user progress.

### Don't: Create Independent Route Pages for Journey Stages

```tsx
// Wrong — these directories should not exist
app/journey/diagnosis/page.tsx
app/journey/gap-filling/page.tsx
```

All journey content renders within the main canvas of `app/page.tsx`.

---

## Required Patterns

### Pattern: Server Action Error Handling

Every server action must return a typed result with optional `error`:

```ts
// All server actions follow this contract
export async function myAction(input: Input): Promise<{ data?: Output; error?: string }> {
  try {
    // ... logic ...
    return { data: result };
  } catch (err) {
    console.error('[myAction] Error:', err);
    return { error: 'User-friendly error message' };
  }
}
```

### Pattern: Component State Machine for Multi-Step Flows

Multi-step flows use explicit state machines, not scattered booleans:

```tsx
type FlowState = 'loading' | 'empty' | 'generating' | 'ready' | 'error';
const [state, setState] = useState<FlowState>('loading');
```

### Pattern: Journey Artifact Persistence

Cross-stage data flows through `ai_journey_artifacts`:

1. Stage A generates data
2. Stage A saves to `ai_journey_artifacts` via `saveArtifact()`
3. Stage A updates `completed_stages` on the journey row
4. Stage B reads latest artifact from `ai_journey_artifacts`
5. Hub reads artifact existence to determine card status

### Pattern: Optimistic UI with Server Action Rollback

```tsx
// 1. Immediately update UI
set((s) => ({ jobs: s.jobs.map(...) }));

// 2. Server sync
const result = await jobsActions.updateJob(id, input);

// 3. Rollback on failure
if (result.error) {
  set({ jobs: prev, error: result.error });
}
```

---

## Build Verification Requirements

Before committing, both must pass:

```bash
npx tsc --noEmit    # TypeScript compilation
npm run build       # Next.js production build
```

---

## Common Mistakes

### Mistake: Forgetting to Add `completed_stages` Initialization

When creating a new journey row, the `completed_stages` field must be initialized to `[]`. Missing this causes `updateJourneyStage` to fail on array operations.

### Mistake: Not Resetting Journey State When Switching Views

When the user switches from journey back to kanban and back to journey, local stage state should reset. The `JourneyHub` component handles this via `useEffect` cleanup and fresh `getOrCreateJourney()` calls.

### Mistake: Sending Guide Agent Messages to the Wrong Table

```tsx
// Wrong — sends journey chat to general AI table
await sendAIMessage(content);

// Correct — sends to journey-specific table
await sendJourneyGuideMessage(journeyId, stage, content);
```
