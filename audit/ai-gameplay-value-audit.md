# AI Gameplay Value Audit

## Scope and sources
- **Code:** [App.tsx](../App.tsx:1), [services/geminiService.ts](../services/geminiService.ts:1)
- **Setup and audit notes:** [README.md](../README.md:1), [.env.local](../.env.local:1), [audit/initial-repo-diagnostic.md](initial-repo-diagnostic.md:1)

## Executive summary
- **AI does not drive core gameplay mechanics.** No AI logic influences movement, zoning, economy, resources, or progression. The simulation loop is deterministic and internal to [App.tsx](../App.tsx:158).
- **All AI usage is optional or cosmetic.** AI generates advisor text and city names only.
- **AI introduces friction and failure modes.** The BYOK flow adds setup steps and can block or confuse players, while calls can fail or be slow.

## AI touchpoints and gameplay impact

### 1) AI Advisor (Gemini-generated briefing)
- **Location:** [getCityAdvice()](../services/geminiService.ts:10), [askAdvisor()](../App.tsx:427), advisor UI panel and button [App.tsx](../App.tsx:714)
- **Gameplay function:** Generates a short, witty status update and recommendation based on current city stats and a tile summary string.
- **Player experience:** Player clicks **Request Brief**, waits for a response, then receives an advisor message. If the key is missing or invalid, an error message appears instead and a settings panel opens.
- **If removed:** Core gameplay would be **unchanged**. Players lose optional flavor text and guidance but all mechanics still function.
- **Deterministic alternative:** A scripted advisor using thresholds on stats (money, happiness, utilities) can deliver precise, reliable tips without external latency or API failure.
- **Classification:** **Net-negative complexity** (adds setup friction and failure modes with limited gameplay value).
- **Latency/failure/setup notes:** Requires BYOK setup, network round-trip, and can fail with missing keys or API errors.

### 2) AI-generated city name
- **Location:** [getCityName()](../services/geminiService.ts:43), initial load [App.tsx](../App.tsx:142), restart flow [App.tsx](../App.tsx:106)
- **Gameplay function:** Generates a city name when the game starts or restarts.
- **Player experience:** The city name appears as a themed AI-generated label. Without a key or on failure, a fallback name is used.
- **If removed:** Gameplay would be **unchanged**. A fixed or random local name is sufficient.
- **Deterministic alternative:** Local name list or Markov-style generator seeded from time/seed.
- **Classification:** **Net-negative complexity** (purely cosmetic, adds BYOK dependency and failure paths).

### 3) AI key gating and BYOK setup flow
- **Location:** Key storage and state [handleSaveApiKey()](../App.tsx:56), key gating overlay [App.tsx](../App.tsx:450), settings modal [App.tsx](../App.tsx:485), API key retrieval [getApiKey()](../services/geminiService.ts:6)
- **Gameplay function:** Blocks or delays initial play with a full-screen key prompt; stores user key in local storage; allows a bypass button to proceed without a key.
- **Player experience:** The game initially demands a Gemini key, creating setup friction. The **Enter City Architect Mode** button lets players bypass but then AI features fail or show errors.
- **If removed:** Gameplay would be **better** (less friction and confusion, faster time-to-play).
- **Deterministic alternative:** No alternative needed if AI is removed. If AI remains, gating should be clear and optional.
- **Classification:** **Net-negative complexity** (setup friction and ambiguous gating behavior).
- **Audit note:** Build-time key injection in Vite is flagged as a leakage risk in [audit/initial-repo-diagnostic.md](initial-repo-diagnostic.md:58) and depends on `.env.local` and README instructions [README.md](../README.md:16), [.env.local](../.env.local:1).

## Core gameplay dependency check
- **Movement, zoning, economy, resources, progression:** **No AI usage.** All core systems are deterministic within [App.tsx](../App.tsx:158).

## Alignment with principle
- **Never use AI where deterministic scripts are better:** The advisor and name generation can be matched (or improved) with deterministic rule-based systems and local content.
- **Never use deterministic scripts where AI is better:** There is no gameplay system here that requires AI variability or reasoning to be fun or functional.

## Recommendation
**Remove AI entirely** from gameplay for this project. AI does not impact core mechanics and adds BYOK setup friction, latency, and failure modes for only cosmetic or advisory content. A deterministic advisor and local name generator would provide the same or better player experience without external dependencies.
