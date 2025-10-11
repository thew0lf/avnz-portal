Design Checklist (Admin + Dashboard Pages)

- Layout & Structure
  - Use Card sections for content blocks with consistent padding and spacing.
  - Top-level page heading uses h1 with text-xl font-semibold.
  - Keep actions grouped inline with labels; prefer right-aligned action groups.

- shadcn/ui Components
  - Use shadcn Button, Dialog, Card, Tooltip, Dropdown, DataTable.
  - Use Tooltip for icon/ambiguous actions. Avoid native title attributes.
  - Use Dialogs for create/edit/view/delete flows.

- SPA + Proxy
  - Use /api/admin/proxy for mutations; show toast on success/error.
  - Do not submit forms via GET; method should be POST.

- Accessibility & Consistency
  - IDs/keys/UUIDs in monospace (font-mono text-xs) in tables.
  - Don’t hardcode org codes, project keys, or vendor URLs; derive from session/config.
  - Respect responsive patterns and avoid layout shift on narrow screens.

- Jira Pages
  - Actions: Requeue Stale, Force Start (Dialog), Reassign Devs, Persist Assignment Lists.
  - Show Jira health with last backfill/requeue time and queued counts.
  - Assignee load table shows names, open count, and phases.

Validation
- Run scripts/qa-routes-get.sh for GET routes.
- Verify no module-not-found errors; dependencies listed in apps/web/package.json.
- Confirm toasts for all proxy actions and Dialog closes on success.

