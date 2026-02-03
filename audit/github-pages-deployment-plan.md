# Corrected deployment audit (what I am discarding)

The following items from the earlier audit are **overreaching or irrelevant** for a pragmatic, student‑level GitHub Pages deployment and are therefore **discarded** for this plan:

1. **CDN usage concerns** — Using Tailwind and Font Awesome via CDN is acceptable for a student GitHub Pages deploy. I am discarding the warning in [audit/initial-repo-diagnostic.md](audit/initial-repo-diagnostic.md:37) as non‑blocking.
2. **LocalStorage for BYOK** — Storing the Gemini key in `localStorage` is intended and acceptable here. I am discarding the security warning in [audit/initial-repo-diagnostic.md](audit/initial-repo-diagnostic.md:103) as non‑blocking for this target.
3. **Client‑side AI calls** — For this student project, direct browser calls to Gemini are acceptable. I am discarding the “must move to server” framing in [audit/initial-repo-diagnostic.md](audit/initial-repo-diagnostic.md:70) as unnecessary for GitHub Pages.
4. **Performance warnings / code health** — These are not deployment blockers, so they are excluded from this plan. I am discarding items from [audit/initial-repo-diagnostic.md](audit/initial-repo-diagnostic.md:16) and [audit/initial-repo-diagnostic.md](audit/initial-repo-diagnostic.md:117).

The remaining plan focuses only on **what is required** to make GitHub Pages deploy and run successfully.

# GitHub Pages deployment plan (minimal, pragmatic)

## Goal
Deploy this Vite + React app to GitHub Pages using the GitHub UI with **minimal changes** and **GitHub Pages’ default build pipeline** (which runs via Actions).

## What must be changed in config (required)

1. **Set the Vite `base` path to the repo name** so asset URLs resolve correctly on GitHub Pages.
   - **Why:** GitHub Pages serves at `https://<user>.github.io/<repo>/`. Without `base`, built assets can 404.
   - **Where:** [vite.config.ts](vite.config.ts:5).
   - **Change:** Add `base: '/<REPO_NAME>/'` in the Vite config object.

## What must be changed in docs (required)

1. **Add a short “Deploy to GitHub Pages” section** to the README with the exact `base` value and the GitHub Pages UI steps.
   - **Why:** Students need a simple, copy‑paste reference.
   - **Where:** [README.md](README.md:11).
   - **Content:** Mention that GitHub Pages will build the app for you via its default Actions pipeline.

## What must be built and committed

1. **Nothing.** GitHub Pages’ default flow builds the repo using Actions.
   - **Why:** Prebuilding `dist/` is unnecessary and will still be rebuilt by GitHub Pages.

## What the student needs to click in GitHub (UI steps)

1. Open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions** (the default).
3. Select **Branch: main** (or the default branch).
4. Click **Save** and wait for the Pages URL to appear.

## What can be safely ignored

- **CDN usage** (Tailwind, Font Awesome) — acceptable for student deployment.
- **LocalStorage BYOK** — intended and acceptable for this project.
- **Client‑side Gemini calls** — acceptable for a student demo and static hosting.
- **Performance or code‑health improvements** — not required to deploy.

## Optional (only if students want AI to work without manual key entry)

- **Do nothing.** The intended flow is BYOK: students paste their own Gemini key in the Settings panel. This works on GitHub Pages as‑is, provided the app builds and loads.

