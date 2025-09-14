# Changelog

All notable changes to this project will be documented in this file.

## v0.3.0 - 2025-09-14

Highlights
- Mobile-first UI overhaul using shadcn/Radix primitives (Sheet + Accordion).
- Searchable, grouped selects across admin forms (Radix Select).
- Mobile-friendly tables that render as cards on small screens.
- Installable PWA with offline fallback and update banner.
- Hydration fixes and SSR/CSR stability improvements.

UI / UX
- Header filter dropdowns use searchable popovers; active filters show badges without revealing values.
- Admin nav uses a Sheet (drawer) on mobile with Accordion sections.
- Tables convert to card lists on mobile for readability.
- Role/Client/Project pickers now use searchable Radix Select; roles grouped by level.

PWA
- Added manifest, icons (SVG + 192/512 PNG), service worker,
  offline.html, and client SW registration with install/update banners.

Performance & Offline
- Same-origin API proxies for usage endpoints to enable SW caching.
- SW caches usage summaries/timeseries with a 10-minute TTL.

Stability
- Normalized server-rendered dates to deterministic UTC format.
- Defer client-only state (dates, localStorage-backed filters) to after mount to avoid hydration mismatches.

Dev & Repo
- Added comprehensive .gitignore defaults; documented in SUMMARY.MD.
- Upgraded Next.js to 14.2.32.

Notes
- Requires `npm install` in `apps/web`.
- If PWA was installed previously, unregister old SW and clear site data before testing.

