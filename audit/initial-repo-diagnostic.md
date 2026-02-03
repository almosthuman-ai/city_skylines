# 1. Project identity

## Overview
- **Project type:** Vite + React (TypeScript) single‑page app with client‑side simulation and UI rendering. Evidence: [package.json](package.json:1), [vite.config.ts](vite.config.ts:1), [index.tsx](index.tsx:1), [index.html](index.html:1).
- **Local run expectation:** `npm install` then `npm run dev` (Vite dev server). Evidence: [package.json](package.json:6), [README.md](README.md:11).
- **Build step:** `vite build` is required for production output. Evidence: [package.json](package.json:7).
- **Interaction profile:** heavy pointer/touch interaction, full‑screen canvas‑like grid. Evidence: [App.tsx](App.tsx:658), [index.html](index.html:6).

## Issues
### 1.1 Vite build step is normal (not a severity issue)
- **What it is:** `index.html` loads `/index.tsx` directly, which requires Vite to build/serve. Evidence: [index.html](index.html:58), [index.tsx](index.tsx:1).
- **Why it matters:** This is standard for Vite apps. GitHub Pages can deploy the built output; this is not a defect.
- **Risk matrix:** Severity **Low** | Likelihood **Low**.
- **Disposition:** **Safe to ignore**.

### 1.2 UI is tablet‑friendly but performance may degrade on low‑power tablets
- **What it is:** The app renders a 30x30 grid (~900 tiles) with multiple overlays and animated effects. Evidence: [constants.tsx](constants.tsx:5), [App.tsx](App.tsx:674).
- **Why it matters:** Budget tablets can drop frames or stutter; touch events might feel laggy during panning/zooming.
- **Risk matrix:** Severity **Medium** | Likelihood **Medium**.
- **Disposition:** **Teaching moment** about performance profiling on constrained devices.

# 2. Runtime assumptions

## Issues
### 2.1 LocalStorage BYOK is the industry standard and perfect
- **What it is:** API key and gating logic are stored/read from `localStorage`. Evidence: [App.tsx](App.tsx:9), [services/geminiService.ts](services/geminiService.ts:6).
- **Why it matters:** For products that do not resell AI access, BYOK is widely adopted and is the strongest pragmatic security posture because the product never handles or stores provider keys on its servers.
- **Risk matrix:** Severity **Low** | Likelihood **Low**.
- **Disposition:** **Safe to ignore**.

### 2.2 Assumes build‑time environment variables in client code
- **What it is:** Client code checks `process.env.API_KEY` and `process.env.GEMINI_API_KEY`, injected by Vite’s `define`. Evidence: [App.tsx](App.tsx:10), [vite.config.ts](vite.config.ts:13).
- **Why it matters:** This only works when built by Vite; direct static hosting without build breaks. It also encourages embedding secrets in client bundles.
- **Risk matrix:** Severity **High** | Likelihood **High**.
- **Disposition:** **Fix now** (build/runtime separation) and **teaching moment** about build‑time envs.

### 2.3 CDN usage (Tailwind + Font Awesome) is acceptable for this student deploy
- **What it is:** CSS dependencies are loaded from CDN at runtime. Evidence: [index.html](index.html:8).
- **Why it matters:** This is standard for student demos and works fine on GitHub Pages when online.
- **Risk matrix:** Severity **Low** | Likelihood **Low**.
- **Disposition:** **Safe to ignore**.

### 2.4 Potential missing stylesheet reference
- **What it is:** `index.html` references `/index.css`, but no `index.css` file exists in the repository listing. Evidence: [index.html](index.html:54).
- **Why it matters:** If the file is genuinely missing, it will 404 and any intended custom CSS will not load.
- **Risk matrix:** Severity **Low** | Likelihood **Medium**.
- **Disposition:** **Fix now** (asset hygiene) or **teaching moment** about build asset paths.

# 3. AI / API integrations

## Integrations
### 3.1 Google Gemini via `@google/genai` (client‑side)
- **Provider:** Google Gemini. Evidence: [services/geminiService.ts](services/geminiService.ts:2).
- **API key source:** `localStorage` first, then `process.env.API_KEY`. Evidence: [services/geminiService.ts](services/geminiService.ts:6).
- **BYOK status:** **Ambiguous/weak.** User input is supported, but build‑time key injection exists and can embed a developer key in the client bundle. Evidence: [vite.config.ts](vite.config.ts:13), [App.tsx](App.tsx:10).

## Issues
### 3.2 Build‑time key injection violates BYOK and leaks secrets
- **What it is:** Vite injects `GEMINI_API_KEY` into the client bundle as `process.env.API_KEY`. Evidence: [vite.config.ts](vite.config.ts:13).
- **Why it matters:** Any built/static deployment exposes the key to all users; this is the opposite of BYOK.
- **Risk matrix:** Severity **High** | Likelihood **High**.
- **Disposition:** **Fix now** (move to server proxy or require user‑provided key only).

### 3.3 “Enter City Architect Mode” bypasses key gating
- **What it is:** UI lets the user proceed without a key by setting `hasValidKey` to true. Evidence: [App.tsx](App.tsx:470).
- **Why it matters:** The app appears to require a key but silently allows bypass; calls to AI then fail. This is confusing for students and makes BYOK enforcement unclear.
- **Risk matrix:** Severity **Medium** | Likelihood **High**.
- **Disposition:** **Teaching moment** about UX honesty and gating.

### 3.4 Client‑side AI calls are acceptable for this student project
- **What it is:** AI calls are made directly from the browser. Evidence: [services/geminiService.ts](services/geminiService.ts:10).
- **Why it matters:** This is a reasonable approach for a static GitHub Pages demo and keeps the project simple.
- **Risk matrix:** Severity **Low** | Likelihood **Low**.
- **Disposition:** **Safe to ignore** for student deployment.

# 4. Deployment readiness

## Static deploy assessment
- **Can it be deployed as static?** **Yes, but only if built with Vite.** The output is static, but the AI feature must be BYOK‑only or proxied to avoid secret leakage. Evidence: [package.json](package.json:7), [services/geminiService.ts](services/geminiService.ts:10).

## Issues
### 4.1 GitHub Pages base path not configured
- **What it is:** No `base` setting in Vite config for sub‑path hosting. Evidence: [vite.config.ts](vite.config.ts:5).
- **Why it matters:** GitHub Pages typically hosts at `/<repo>/`; without `base`, asset paths can break.
- **Risk matrix:** Severity **High** | Likelihood **High** (for GH Pages specifically).
- **Disposition:** **Fix now** (deployment config) or **teaching moment** about base paths.

### 4.2 AI key handling blocks safe static deployment
- **What it is:** Build‑time keys embedded in client bundle. Evidence: [vite.config.ts](vite.config.ts:13).
- **Why it matters:** Any static host exposes the key; the only safe static path is strict BYOK in the browser.
- **Risk matrix:** Severity **High** | Likelihood **High**.
- **Disposition:** **Fix now** if deployed; otherwise make it a **teaching moment**.

# 5. Security and leakage

## Issues
### 5.1 API key exposure through build‑time injection
- **What it is:** `GEMINI_API_KEY` is embedded into client JS via Vite `define`. Evidence: [vite.config.ts](vite.config.ts:13).
- **Why it matters:** Anyone can view the key in the built bundle, resulting in unauthorized usage and billing risk.
- **Risk matrix:** Severity **High** | Likelihood **High**.
- **Disposition:** **Fix now**.

### 5.2 LocalStorage BYOK is acceptable here
- **What it is:** Keys are stored in `localStorage`. Evidence: [App.tsx](App.tsx:56).
- **Why it matters:** This is an intended, pragmatic choice for a student demo and works fine on GitHub Pages.
- **Risk matrix:** Severity **Low** | Likelihood **Low**.
- **Disposition:** **Safe to ignore**.

### 5.3 Committed `.env.local` file with placeholder key
- **What it is:** `.env.local` exists in repo with placeholder key. Evidence: [.env.local](.env.local:1).
- **Why it matters:** Encourages storing secrets in repo; students may commit real keys by mistake.
- **Risk matrix:** Severity **Medium** | Likelihood **Medium**.
- **Disposition:** **Fix now** (process change) and **teaching moment** about git‑ignored secrets.

# 6. Code health (high level)

## Issues
### 6.1 Monolithic component mixing simulation, UI, and input handling
- **What it is:** A single component manages simulation, camera, UI, and AI logic (~800 lines). Evidence: [App.tsx](App.tsx:7).
- **Why it matters:** Hard to debug, test, or extend; students will struggle to isolate bugs.
- **Risk matrix:** Severity **Medium** | Likelihood **High**.
- **Disposition:** **Teaching moment** about separation of concerns.

### 6.2 Mixed tooling assumptions (Vite + importmap CDN)
- **What it is:** `index.html` includes an import map for CDN packages, while the repo is Vite‑based with local dependencies. Evidence: [index.html](index.html:43), [package.json](package.json:11).
- **Why it matters:** This is AI‑generated “glue” that can confuse deployment and debugging; it suggests two incompatible runtime models.
- **Risk matrix:** Severity **Medium** | Likelihood **High**.
- **Disposition:** **Teaching moment** about toolchain coherence.

### 6.3 Unused dependency (`recharts`)
- **What it is:** `recharts` is declared but not referenced. Evidence: [package.json](package.json:11).
- **Why it matters:** Increases install time and adds confusion about expected features.
- **Risk matrix:** Severity **Low** | Likelihood **High**.
- **Disposition:** **Safe to ignore** or use as a **teaching moment** for dependency hygiene.

# 7. Teaching implications

## Likely student confusion points
- **“Why doesn’t it run on my iPad?”** The project requires Node/Vite and a build step; tablets cannot run the dev server. Evidence: [package.json](package.json:6), [index.html](index.html:58).
  - **Risk matrix:** Severity **High** | Likelihood **High**.
  - **Disposition:** **Teaching moment** about build pipelines and static hosting.

- **“Why does the AI key seem optional but AI still fails?”** The UI allows bypass, then API calls fail without a key. Evidence: [App.tsx](App.tsx:470), [services/geminiService.ts](services/geminiService.ts:11).
  - **Risk matrix:** Severity **Medium** | Likelihood **High**.
  - **Disposition:** **Teaching moment** about UX clarity.

- **“Why did my key leak?”** Build‑time env injection in client code exposes the key. Evidence: [vite.config.ts](vite.config.ts:13).
  - **Risk matrix:** Severity **High** | Likelihood **High**.
  - **Disposition:** **Fix now** and **teaching moment** about client/server boundaries.

## Good learning opportunities
- **Simulation loop design:** Clear state updates per tick, easy to reason about. Evidence: [App.tsx](App.tsx:159).
  - **Disposition:** **Safe to keep** as a teaching example.

- **Touch + mouse event handling:** Demonstrates cross‑input interaction handling for tablet use. Evidence: [App.tsx](App.tsx:251).
  - **Disposition:** **Safe to keep** as a learning example.

