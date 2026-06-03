# Component Guidelines

> How components are built in this project.

---

## Overview

Components follow a single-page architecture: Header and AISidebar are persistent; only the main canvas switches content based on `currentView` state. Journey components live under `components/journey/` with subdirectories per stage (`diagnosis/`, `gap/`).

---

## Component Structure

### Standard Component File

```tsx
'use client';

import { useState } from 'react';
// lucide-react icons
// project types and actions

interface ComponentProps {
  // typed props with JSDoc for AI context
  /** Called when the user confirms the action */
  onConfirm?: () => void;
}

export default function ComponentName({ onConfirm }: ComponentProps) {
  // local state → useState
  // global state → useJobStore
  // effects → useEffect
  return (/* JSX */);
}
```

### Journey Component Organization

```
components/journey/
├── JourneyHub.tsx              # Main hub: stage cards + flow orchestration
├── JourneyStageCard.tsx        # Single stage card (reusable, status-driven)
├── diagnosis/                  # Diagnosis stage components
│   ├── DiagnosisForm.tsx       # Input form
│   ├── JobPreviewCard.tsx      # Editable AI preview
│   └── DiagnosisReportView.tsx # Final report display
└── gap/                        # Gap-filling stage components
    ├── GapFillingView.tsx      # Main view with state machine
    ├── GapPlanPhaseSection.tsx # Phase grouping
    └── GapPlanItemCard.tsx     # Individual action item
```

---

## Props Conventions

### Callback Props

Navigation between stages uses callbacks, never `router.push()`:

```tsx
// Correct: callback-based navigation
interface JourneyHubProps {
  currentStage: string | null;
  onStageSelect: (stageId: string) => void;
  onBackToHub: () => void;
}
```

```tsx
// Wrong: router-based navigation in journey components
import { useRouter } from 'next/navigation';
router.push('/journey/diagnosis'); // ❌ breaks single-page architecture
```

### Dynamic Status Props

Stage cards use a union type for status:

```tsx
type JourneyStageStatus = 'available' | 'completed' | 'coming_soon';

interface JourneyStageCardProps {
  id: string;
  title: string;
  description: string;
  status: JourneyStageStatus;
  onSelect?: (id: string) => void;
}
```

---

## Styling Patterns

### Design Tokens (from design.md)

| Token | Value | Usage |
|-------|-------|-------|
| Primary brown | `#8B735B` | Buttons, icons, accents, Guide Agent branding |
| Background | `#EBE8E3` | Page background |
| Card background | `#FFFFFF` | Card surfaces |
| Border | `#E0DCD1` | Card and section borders |
| Text primary | `#111111` | Headings |
| Text secondary | `#666666` | Descriptions |
| Text muted | `#999999` | Placeholders |

### Stage Card Status Styling

```tsx
// Available: normal opacity, hover effects
className="bg-white border-[#E0DCD1] hover:shadow-md hover:border-[#8B735B]"

// Completed: green tint, checkmark
className="bg-[#F0F9F0] border-[#C5E0C5]"

// Coming soon: reduced opacity
className="bg-white/40 border-[#E0DCD1]/50 opacity-50 cursor-not-allowed"
```

### Tailwind Conventions
- Use project color tokens directly (not arbitrary values)
- Rounded corners: `rounded-2xl` for cards, `rounded-lg` for inner elements
- Font: `font-black` for titles, `font-bold` for subtitles, `text-sm` for body
- Tracking: `tracking-tight` for headings, `tracking-[0.3em]` for uppercase labels

---

## Design Decision: Single-Page Architecture for Journey Views

**Context**: Journey stages (diagnosis, gap-filling) were initially implemented as independent Next.js routes (`/journey/diagnosis`, `/journey/gap-filling`). This broke the persistent Header + AISidebar layout.

**Decision**: All journey views render within the main canvas of `app/page.tsx`. The `currentView` state controls which top-level view (kanban/agenda/journey) is shown. Within journey view, `currentJourneyStage` state controls which stage content is rendered.

**Example**:
```tsx
// app/page.tsx — correct pattern
{currentView === 'journey' && (
  <JourneyHub
    currentStage={currentJourneyStage}
    onStageSelect={(stageId) => setCurrentJourneyStage(stageId)}
    onBackToHub={() => setCurrentJourneyStage(null)}
  />
)}
```

**Consequences**: No URL-based routing for journey stages. Refresh resets to hub view. This is acceptable for MVP; P1 may add URL state persistence.

---

## Design Decision: AISidebar Mode System

**Context**: The existing `AISidebar` component served as a general AI assistant. For journey mode, we needed it to become a Guide Agent with different behavior, data storage, and UI.

**Decision**: Added `activeFeature` prop to switch modes without duplicating the component.

```tsx
// Two modes, one component
<AISidebar
  activeFeature={currentView === 'journey' ? 'journey' : 'ai'}
  journeyStage={currentJourneyStage}
/>
```

**Mode differences**:
| Aspect | `ai` mode | `journey` mode |
|--------|-----------|----------------|
| Header | "AI 助手" | "AI 教练" |
| Mode selector | 建岗位/建任务 visible | Hidden |
| Messages table | `ai_messages` | `ai_journey_messages` |
| Send action | `sendAIMessage` | `sendJourneyGuideMessage` |
| Context injection | None | Journey stage + artifacts |

---

## Component Patterns

### Pattern: State Machine in Stage Views

Complex stage views use explicit state machines rather than boolean flags:

```tsx
// GapFillingView state machine
type ViewState = 'loading' | 'no-diagnosis' | 'generating' | 'ready' | 'error';

// Diagnosis flow in JourneyHub
type DiagnosisFlowStage = 'form' | 'preview' | 'report';
```

### Pattern: Inline Editing in Preview Cards

AI-generated previews use click-to-edit inline inputs:

```tsx
// JobPreviewCard — each field is clickable text that becomes an input
{isEditing ? (
  <input value={value} onChange={...} className="..." />
) : (
  <span onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-gray-100">
    {value || 'Click to edit'}
  </span>
)}
```

---

## Common Mistakes

### Don't: Use router.push() for Journey Navigation

```tsx
// ❌ Wrong — breaks single-page architecture
router.push('/journey/diagnosis');
```

```tsx
// ✅ Correct — stays within the main canvas
onStageSelect('diagnosis');
```

### Don't: Hardcode Stage Status

```tsx
// ❌ Wrong — cards don't reflect actual progress
const stages = [
  { id: 'diagnosis', status: 'available' },
];
```

```tsx
// ✅ Correct — query Supabase for actual artifact state
const { diagnosisCompleted } = await getJourneyHubStatus();
const stages = [
  { id: 'diagnosis', status: diagnosisCompleted ? 'completed' : 'available' },
];
```
