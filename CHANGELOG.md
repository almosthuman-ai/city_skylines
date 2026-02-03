# Changelog

## 2026-02-03 — Add multi-save localStorage state with save/load modals
- **What changed:** Added a multi-save system stored entirely in `localStorage`, including a save-name modal and a load modal that lists all saved cities with key stats (money, population, day). City state now persists buildings, stats, resources, unlocked sectors, advisor messages, and camera/UI state to make reloads match what the player last built.
- **Why:** Players expect multiple named saves and reliable persistence between sessions without extra infrastructure.
- **How (student notes):**
  1. **State snapshot:** Think of a “save” as a *snapshot* of every piece of state that makes the city look the same (tiles, money, stats, camera, etc.). In [`App.tsx`](App.tsx:31) this is grouped into a single object so it’s easy to store.
  2. **localStorage list:** Instead of a single save, we store an *array* of saves under one key. Each save entry includes a name, timestamp, and the snapshot data. This allows “near infinite” saves.
  3. **Saving flow:** The Save button opens a modal so the player can name the save. On confirm, we serialize the snapshot with `JSON.stringify` and push it into the saves list.
  4. **Loading flow:** The Load button opens a modal that lists saves. Clicking an entry replaces in-memory state with the stored snapshot.
  5. **UI scaling:** The load list is placed in a scrollable container (`max-height` + `overflow-y`) so the modal doesn’t grow forever when many saves exist.

## 2026-02-03 — Remove AI dependency from gameplay
- **What changed:** Planned removal of all Gemini/AI features and setup flows; replacement with deterministic, local logic for advisor text and city naming.
- **Why:** AI does not affect core gameplay, adds setup friction and failure modes, and deterministic logic is more reliable for a student project.

## 2026-02-03 — Remove Gemini integration and env injection
- **What changed:** Deleted Gemini service file, removed AI-related environment injection, and removed AI key documentation and local env placeholder.
- **Why:** AI is no longer part of gameplay, so external keys and provider setup should not exist in the project.

## 2026-02-03 — Add deterministic advisor and city naming
- **What changed:** Added local advisor message rules and a local city name generator; removed AI gating UI and kept the advisor panel with instant responses.
- **Why:** Deterministic logic is reliable, instant, and better suited for a student project with offline play.

## 2026-02-03 — Update metadata to remove AI branding
- **What changed:** Renamed the app metadata and description to remove Gemini/AI references.
- **Why:** The product no longer uses AI, so public-facing metadata should be accurate and consistent.

## 2026-02-03 — Add build information panel to the right sidebar
- **What changed:** Added a build metadata map keyed by zone type (name, effects, tradeoffs, requirements) alongside costs; split the right sidebar into two dvh-sized, independently scrollable panels for advisor messages and build information; wired the build info panel to the selected build tool with a neutral placeholder when nothing buildable is selected.
- **Why:** Players need immediate, contextual explanations of each building’s role and constraints, and keeping data in a single shared source prevents inconsistencies between the build menu and the right sidebar while preserving a non-scrolling main viewport.
