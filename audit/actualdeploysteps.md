# GitHub Pages Deployment Plan (Corrected, Minimal, Works Today)

This plan reflects how GitHub Pages actually works now.
It avoids outdated assumptions and focuses only on what is required to deploy successfully.

---

## Goal

Deploy this Vite + React app to GitHub Pages with:
- minimal changes
- no custom workflows
- no hardcoded repo name
- no breaking of CDN usage
- no enterprise-grade nonsense

The student should be able to deploy via:
Settings → Pages → main /docs

---

## Key Reality Check

- GitHub Pages now uses GitHub Actions infrastructure internally.
- You cannot fully “avoid Actions,” even when deploying from a branch.
- This is fine. We do not need to manage workflows ourselves.
- What matters is that the **static files exist** and **paths resolve**.

---

## Required Configuration (Fix Now)

### 1) Vite base path

Use a **relative base**, not the repo name.

- Set in `vite.config.ts`:
  ```ts
  base: './'
  ```

Why:
- This works for any repo name.
- It works for forks.
- It works for GitHub Pages project sites.
- It avoids hardcoding `/<repo-name>/`.

---

### 2) Build output directory

Build into `/docs`.

- Set in `vite.config.ts`:
  ```ts
  build: {
    outDir: 'docs'
  }
  ```

Why:
- GitHub Pages supports serving from `/docs` on the main branch.
- No separate branch required.
- No custom workflow required.

---

### 3) Commit build output

- Run:
  ```bash
  npm run build
  ```
- Ensure `/docs` exists.
- Ensure `/docs` is **not ignored** by `.gitignore`.
- Commit `/docs` to the repo.

Why:
- Pages serves static files that already exist.
- Pages will not run your build logic for you.

---

## GitHub UI Steps (Student Instructions)

1. Open **Settings → Pages**.
2. Under **Source**, choose **Deploy from a branch**.
3. Select:
   - Branch: `main`
   - Folder: `/docs`
4. Click **Save**.
5. Wait for the Pages URL to appear.

That’s it.

---

## What Is Explicitly Ignored (By Design)

- Tailwind / Font Awesome CDN usage
- Client-side BYOK with localStorage
- Edge browsers, CSP hardening, offline support
- Production-grade secret handling
- Code health refactors

This is a student proof-of-concept.
Stability and deployability beat theoretical purity.

---

## Verification Strategy

To test without repo permissions:
- Fork the repo.
- Enable Pages on the fork (`main /docs`).
- Confirm the site loads.
- If it works on the fork, it will work for the student.

---

## Summary

- Use `base: './'`
- Build to `/docs`
- Commit `/docs`
- Enable Pages from `main /docs`
- Ignore everything else