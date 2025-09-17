## Avnz Portal Redesign Plan (design-2)

Goal
- Deliver a modern, business‑professional UI consistent across web and admin, with excellent readability, mobile responsiveness, and accessible interactions. Keep all existing behaviors, routes, and RBAC intact.

Principles
- Do not import or copy vendor names/tokens from the reference ZIP; implement our own neutral tokens and styles.
- Respect existing SPA forms, `/api/admin/proxy` mutations, and auth guards.
- Optimize for clarity, density, and predictable patterns (cards, tables, filters, forms).
- Mobile parity via Sheet/Drawer and adaptive layouts; no hidden functionality on mobile.

Color & Theme
- Supported color schemes: default, red, rose, orange, green, blue, yellow, violet.
- Modes: light, dark, system. CSS variables drive `--primary`, `--ring`, etc. Applied via `html[data-color]` and `html.dark`.
- Persistence: user selection saved locally for instant feedback; stored in DB under `user_preferences` for durability.

Scope (UI Areas)
- Global shell: header, sticky left sidebar, content container.
- Components: Button, Input, Select, Sheet, Popover, Badge, Card, Table, Toast.
- Pages (order of work):
  1) Admin Dashboard (cards/metrics spacing + section headers)
  2) Projects, Members, Roles/Permissions, Assignments
  3) Templates, Secrets
  4) Usage (charts/tables), Compliance, Outbox
  5) Auth pages (login/forgot/reset) and public root
- Accessibility: visible focus, color contrast, keyboard navigation, ARIA for overlays.

Non‑Goals (current phase)
- No third‑party design system imports; no brand‑specific fonts/values.
- Settings page UI is de‑scoped per feedback; backend for preferences/profile remains available.

Implementation Plan
- Tokens: refine `app/globals.css` variables and scheme maps.
- Shell: update `app/admin/layout.tsx` for modern spacing, active link affordances, and mobile Sheet polish.
- Components: align primitives with consistent border radius, shadow, spacing; keep APIs intact.
- Pages: iterate page-by-page; standardize section headers, tables, filters, and forms.
- Testing: run `scripts/health-check.sh`, `scripts/smoke-test.sh`, and targeted manual checks for each page.

Rollout & Branching
- All work on `design-2` branch. Open PR with concise change log once a vertical slice is complete.
- Keep commits scoped; prefer atomic changes per page/area.
- Provide screenshots/gifs in the PR for key pages.

Rollback
- Main remains untouched until approval; `design-2` can be rolled back by closing the PR or reverting.

Notes
- Reference ZIP is stored under `docs/design-v0/` for visual guidance only.
- We will document any new UI helpers or tokens in this file as they are introduced.

