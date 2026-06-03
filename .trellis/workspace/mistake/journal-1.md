# Journal - mistake (Part 1)

> AI development session journal
> Started: 2026-06-03

---



## Session 1: Complete Journey Agent MVP: Hub + Guide Agent, Diagnosis, Gap-Filling, and Polish

**Date**: 2026-06-04
**Task**: Complete Journey Agent MVP: Hub + Guide Agent, Diagnosis, Gap-Filling, and Polish
**Branch**: `main`

### Summary

Designed and implemented the full WooJob 求职陪跑 Agent MVP. Architecture: single-page app with Hub + Guide Agent (no Director). Three agents delivered: Guide Agent (reusing AISidebar with journey mode and separate ai_journey_messages storage), Diagnosis Agent (JD text/image recognition, editable preview, structured diagnosis report), Gap-Filling Agent (phased action plan, single-item schedule integration). Stage cards dynamically reflect completion status from Supabase artifacts. Deleted old Director-based JourneyShell and JourneyChat. Updated all frontend specs with architectural patterns and conventions.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `17335f6` | (see git log) |
| `926ad28` | (see git log) |
| `2e274dc` | (see git log) |
| `853a50b` | (see git log) |
| `3ce0b94` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: P1: Multi-journey management with JourneySwitcher dropdown

**Date**: 2026-06-04
**Task**: P1: Multi-journey management with JourneySwitcher dropdown
**Branch**: `main`

### Summary

Implemented multi-journey record management for the journey Hub. Created JourneySwitcher dropdown component in Hub header (right-aligned) showing current journey name with chevron toggle. Supports: listing all user journeys with selected highlighting, switching journeys with full state refresh (hub cards, diagnosis reset, gap-filling re-init, Guide Agent sync), inline rename by clicking current name, creating new blank journeys via inline input. Added server actions: listUserJourneys, createJourney, renameJourney. Modified all artifact operations to support optional journeyId parameter with ownership verification and fallback to latest journey. Fixed JourneySwitcher click conflict and API route stage consistency.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `b452555` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: P1: Empty state template cards, expired task filtering, login preloading, view-switch caching

**Date**: 2026-06-04
**Task**: P1: Empty state template cards, expired task filtering, login preloading, view-switch caching
**Branch**: `main`

### Summary

Fixed four UX issues: (1) Empty kanban shows 4 non-interactive template demo cards across different stages that auto-disappear on first real job creation. (2) AgendaView now filters out past-date interview/exam tasks while preserving today's, completed, and non-time-sensitive tags. (3) Added isInitialLoading state with Promise.all preloading and kanban-matching skeleton UI to eliminate white-screen flicker on login. (4) Stabilized data-loading useEffect from unstable Zustand selector references to mount-only [] + ref guard, preventing duplicate fetches on view switches. Also fixed fetchTasks to use merge instead of replacement to prevent cross-month data loss, and replaced Math.random() in skeleton with deterministic values.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `eb2baac` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
