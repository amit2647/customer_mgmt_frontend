# frontend — notes for Claude Code

Parent-repo context (gateway, auth, bundles) is in `../CLAUDE.md`.

## Frontend

- React + Vite + React Router, plain CSS (`src/styles/`, organized by foundation/layout/components/
  features/pages — no CSS framework/CSS-in-JS).
- `src/api/client.js` is the single fetch wrapper: base URL from
  `import.meta.env.VITE_API_BASE_URL` (Kong), falling back to `http://localhost:8080/api`. It
  attaches `Authorization: Bearer <token>` from `localStorage` (`omnicore_access_token`). All
  other `src/api/*.js` files are thin per-resource wrappers around it. `VITE_` is the only prefix
  Vite exposes to browser code, and the value is read when the dev server starts — changing it
  needs the frontend container restarted, it is not read per request.
- The container runs the Vite **dev server** (`npm start`); `npm run build` is `vite build`, a
  production bundle used only to check the code compiles (it was plain `vite` until 2026-10-06,
  which started a dev server and never exited).
- `src/archieve/` exists in the tree (that's the actual directory name, not a typo to fix
  incidentally) — check whether code there is still referenced before assuming it's dead.
- Routes are permission-gated with `components/auth/RequirePermission.jsx` inside `ProtectedRoute`,
  so a screen someone lacks denies honestly instead of mounting and showing an empty page. The
  sidebar hides the link separately; both are cosmetic — the API is the authority.
- The assistant's conversation lives in `context/AssistantContext.jsx`, above `AppLayout`, so the
  docked panel and the `/assistant` page share one thread. `AssistantThread.jsx` is the shared UI;
  the panel and page are chrome only.
- Assistant replies are rendered as Markdown (`react-markdown` + `remark-gfm`). `rehype-raw` is
  deliberately absent: model output is untrusted, so raw HTML stays escaped.
- The assistant is reachable from a header button and a sidebar entry above Settings. Neither is
  permission-gated, matching the route and the backend.
- The assistant's status orb is `thinking-orbs` (MIT, zero dependencies, a transparent 2D canvas).
  Its state is derived **once**, as `state` in `AssistantContext` (`idle` / `listening` /
  `processing` / `responding` / `confirming`), so the orb and its caption cannot disagree.
  `AssistantOrb.jsx` maps those onto the library's own animations. It does **not** use the
  `<ThinkingOrb>` component: `MorphOrb` draws with the library's engine (`thinking-orbs/engine` —
  `resolvePreset`, `MODE_FRAMES`, `paintFrame`) so it can do two things the component cannot:
  - **Draw at real size.** The component sizes its canvas to the preset, so enlarging it meant
    stretching a 64px raster. The frames are pure vector geometry, so they are painted through a
    scaled context at the CSS size instead; `--orb-scale` is a real size, not a stretch.
  - **Morph between states.** The component restarts on a state change. `blend()` moves each
    dot of the old frame to a dot of the new one over `MORPH_MS`.
  - Still true of the library: `size`/`base` is `64 | 32 | 20` — tuned designs, and
    `resolvePreset` throws above 64. Dark ink vs light ink is pinned from `ThemeContext`, since
    our theme names are not `dark|light`.
  - The canvas is transparent. Never give an orb selector a background, border or shadow — it
    shows as a plate behind the dots instead of letting the glass through.
- The assistant's glass (`backdrop-filter`) is scoped to `.assistant-panel` and
  `.assistant-page-card` only, with separate fills for the light and dark themes. The shared glass
  rule must **not** set `position`: the panel is `position: fixed`, and a `relative` in that
  shared block once unpinned it from the corner (same specificity, later in the file).
- Dashboard figures are built from the caller's own view of leads, customers and services, so its
  Redis cache key includes which of those the caller can read (`readScope`). A key by
  organization alone once served a Dashboard-only grant an admin's figures and lead names.
  Figures are cached 30 s, so any edit shows within half a minute. **Service demand** counts open
  leads and customers, never a converted lead: it is the same entity as its customer, whose
  services are the current truth (counting both once showed a one-service client as three).
- Page chrome (breadcrumb, header, cards) is defined **per page** in `styles/`, not shared — when
  adding a screen, expect to copy a block rather than find a generic rule.
- **New screens follow `frontend/docs/ui-style-guide.md`** — read it before building one. It
  maps each kind of screen to its reference (Dashboard, Clients, client detail, the Add client
  and Add prospect wizards, Deadline rules) and lists what to reuse. Shared components in
  `src/components/ui/`: `Breadcrumb`, `StatCard`, `WizardSteps`, `ServicePicker`, `PageState`
  render existing classes; `SettingRow` (with `setting-rows.css`) is a setting on the tabbed
  Settings page (`SettingsLayout`, sections in `settingsSections.js`); `DataGrid` and `Pill` (styled by `styles/components/data-grid.css`)
  are **every table** in the product — search, filter chips, sortable headers, column chooser,
  paging and selection, each shown only when the table needs it. Grids search and page on the
  client, so list pages load the whole list once. Rule: a
  multi-line block pasted a third time becomes a `components/ui/` component; one-line class
  usages stay classes. When the guide and a reference screen disagree, the screen wins.
