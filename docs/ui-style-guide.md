# OmniCore UI style guide

How to build a screen that looks like the rest of the product without designing it again.
Find the kind of screen, open its **reference**, and assemble it from the pieces in §2.

**The reference screens are the source of truth.** When this guide and a reference screen
disagree, the screen wins and this guide gets fixed.

| Kind of screen | Reference | File |
|---|---|---|
| Overview with figures | Dashboard | `src/pages/Dashboard/DashboardPage.jsx` |
| List | Clients, Prospects (list), Deadlines | `src/pages/Clients/ClientsPage.jsx`, `src/pages/Prospects/ProspectsPage.jsx`, `src/pages/Deadlines/DeadlinesPage.jsx` |
| Board | Prospects (board) | `src/pages/Prospects/ProspectsPage.jsx` |
| One record, in tabs | Client detail | `src/pages/Clients/ClientDetailPage.jsx` |
| Add / edit (a wizard) | Add client, Add prospect | `src/pages/Clients/ClientWizardPage.jsx`, `src/pages/Prospects/ProspectFormPage.jsx` |
| Settings section (a tab) | My Profile (rows), Organization (rows), Deadline rules (a list) | `src/pages/Settings/ProfilePage.jsx`, `src/pages/Settings/OrganizationPage.jsx`, `src/pages/Settings/DeadlineRulesPage.jsx` |
| Fields beside a live preview | Letter editor, Document template | `src/pages/Documents/DocumentEditorPage.jsx`, `src/pages/Settings/DocumentTemplatePage.jsx` |

## 1. Rules

1. **Reuse, don't restyle.** Everything a screen needs is in §2. A new CSS rule is for
   layout specific to that screen, never a second version of a card, table, pill or button.
2. **The third copy becomes a component.** Pasting the same multi-line block into a third
   place means it belongs in `src/components/ui/`. It renders the existing classes, has a
   small test, and gets a row in §2. One-line class usages (`.alert`, `.settings-empty`,
   `.page-header`) stay as classes; a component around them saves nothing.
3. **One entity, one screen.** Never build a second screen over the same records. With a
   bundle, Prospects replaces Leads and Clients replaces Customers; the old URLs redirect
   (`WithoutBundle`). Data copied across services keeps a link back to where it came from.
4. **The bundle's words.** For anything a bundle names, use `term()` from `useBundle()`:
   `term("client")` is "Client", and `term("client", true)` is "Clients". An organization
   without a bundle must see exactly today's product.
5. **Honest permissions.** Gate the route with `RequirePermission`, and hide controls the user
   can't use (`can(permission)`). Never show a button that always answers 403.
6. **Tokens, never literals.** Use colours, radii and shadows only through CSS variables
   (§3), so all four themes work.

## 2. What to reuse

### Components

| Need | Use | File |
|---|---|---|
| "← Back to …" bar and where you are | `<Breadcrumb onBack backLabel section title />` | `components/ui/Breadcrumb.jsx` |
| A figure card: link, filter or plain | `<StatCard label icon value hint linkLabel to \| onClick active />`, inside `<section className="dashboard-stats">` | `components/ui/StatCard.jsx` |
| A wizard's step bar: one row, a column per step; numbers clickable | `<WizardSteps steps current className="customer-workflow-steps" onSelect={(target) => goToStep(target, { step, validateStep, setStep })} />` — back is free, forward validates each step on the way | `components/ui/WizardSteps.jsx` |
| Choosing services | `<ServicePicker services selected onChange />` (grouped; `grouped={false}` for a flat grid) | `components/ui/ServicePicker.jsx` |
| A whole page loading, failed or with nothing to edit | `<PageState icon tone title action>sentence</PageState>` | `components/ui/PageState.jsx` |
| **Any table** — lists, settings tables, tabs, pickers | `<DataGrid label rows columns search controls actions selection expandedRow embedded empty />`. Columns: `{ key, header, render, value, align: "right", sortable, filter, hideable }`. Toolbar (search, Columns, Filters + chips) and paging appear only when useful; `embedded` inside a card that already frames it; `id` remembers hidden columns and page size | `components/ui/DataGrid.jsx` |
| A value as a coloured badge | `<Pill tone dot>` — `tone` semantic (`success`, `danger`, `warning`, `info`, `neutral`) or `toneFor(value)` for a stable category hue; `dot` for states | `components/ui/Pill.jsx` |
| One setting: title and help left, value or control right | `<SettingRows label>` › `<SettingRow icon title description action>` (children open inside the row); `<SettingNotice tone title action>` for an in-row notice | `components/ui/SettingRow.jsx` |
| A label and value on a record | `<Field label value href />` | `components/common/Field.jsx` |
| A letter or other rendered HTML, as it will print | `<LetterFrame html ref />` (sandboxed iframe; `ref.current.print()`) — never `dangerouslySetInnerHTML` | `components/documents/LetterFrame.jsx` |
| Bundle-defined fields | `<SchemaForm />` | `components/bundle/SchemaForm.jsx` |
| An engagement's year, services and fees | `<EngagementForm />` | `components/bundle/EngagementForm.jsx` |
| Route guards | `RequirePermission`, `WithoutBundle` | `components/auth/` |
| Money, dates, enum labels | `formatMoney` (`₹45,000`), `formatDay` (`31 Jul 2027`), `enumLabel` | `components/bundle/bundleLabels.js` |

Every table in the product is a `DataGrid` — never hand-write `<table>` markup. `SearchBar`,
`EmptyState`, `StatusBadge` and the `*Workflow` components in
`components/{leads,customers,services,emailAccounts}` belong to the original core screens;
don't use them on new screens.

### Classes

| Need | Classes |
|---|---|
| Page title and actions | `.page-header` (an `h1`, one sentence `p`, buttons on the right) |
| Extra list controls | passed to `DataGrid` as `controls` (a `.clients-select`, a `.client-checkbox` such as "Show archived") |
| Two-line cell | `.grid-cell-title` and `.grid-cell-sub` |
| Row actions | `.table-actions` holding `.link` buttons (View, Edit…) and `.link.delete-link` |
| Hint under a name | `.settings-row-hint`; a muted cell is `.settings-cell-muted` |
| Main action | `.primary` (one per area). Others are `.secondary-button`; destructive is `.secondary-button.danger` |
| Tags and states | `.service-badge` (neutral), `.client-constitution c-<value>` (bundle category), `.client-badge` (`.locked`/`.archived`), `.deadline-pill state-<state>`, `.settings-pill` (`.on`) |
| Inner card | `.card` plus a padding modifier (`.engagement-card`, `.client-origin`); facts as `dl.engagement-facts` |
| Tabs | `.client-tabs` with `role="tab"` buttons |
| Wizard chrome | `.customer-workflow-page.client-wizard` › `form.customer-workflow` › `.customer-workflow-header`, `.workflow-body` › `.workflow-panel` (`.workflow-panel-heading`, `.workflow-form-grid`, `.workflow-field-full`), `.review-grid` / `.review-card`, `.workflow-footer` |
| Errors | `.field-error` under a field, `.workflow-error` at the top of a wizard, `.alert.alert-error` (`role="alert"`) on a page |
| Success, empty, loading | `.alert.alert-success`; `.settings-empty` with one sentence (also `Loading…`, inside the card the content will fill) |

## 3. Foundations

- **Type.** `--font-body` (DM Sans) everywhere. `--font-display` (Plus Jakarta Sans) only
  for big figures. Text is small and dense: cells 12–13px; table headers 10px, bold,
  uppercase.
- **Colour.** Use only the `--color-*` set; each theme redefines it. The slate variables in
  `foundation/variables.css` (`--text-primary`, `--border-color`, …) are legacy and unused.
  - Surfaces: `--color-page`, `--color-surface`, `-subtle`, `-muted`, `-hover`.
  - Text: `--color-text`, `-secondary`, `-muted`.
  - Lines: `--color-border`, `-strong`.
  - Primary: `--color-primary` (near-black) with lemon text.
  - Brand: `--brand-lemon` for the first stat card and the active nav item.
- **State colours have fixed meanings.** Don't use one for decoration.

  | State | Means |
  |---|---|
  | success | Done, filed, paid |
  | warning | Due soon |
  | danger | Overdue, failed, destructive |
  | info | In progress |

- **Shape.** Cards and tables use `--radius-md` with `--shadow-card`; stat and board cards
  use `--radius-lg`; pills and chips use `999px`.
- **Themes.** lemon and cobalt are light; **mint and coral are dark**. Check one dark theme
  (Settings → Appearance); any hard-coded `#fff` or `black` breaks there.
- **Icons.** Use `@phosphor-icons/react`: `size={20} weight="regular"` for nav and cards,
  `aria-hidden` when text says the same. Text buttons use plain arrows: `← Back`, `Next →`,
  `Continue →`.
- **Spacing (measured on every screen, keep it so).**
  - Page title: the base `h1`, 30px display, weight 750. Don't restyle it per page.
  - Breadcrumb row, then **18px**, then the page header; every form page (wizards included)
    starts with the breadcrumb, so all screens open at the same height.
  - **24px** from the header to the first block, and **24px** between page sections
    (cards, figure rows, dashboard rows).
  - A toolbar (search, filters) sits **24px** under what is above it and **16px** above the
    list or board it filters. Tab bars: 18px to their content.
  - Content cards pad **20px 24px**; table cards have no padding (rows pad themselves).
    Grid gaps inside a section: 14–16px.
- **Breakpoints.** 1100px and 640px for stat cards; 768px for toolbars, forms and the
  board. No horizontal page scroll: wide tables scroll inside their card.

## 4. Recipes

**List screen.** In order:

1. `.page-header`, with `+ Add thing` as `.primary`.
2. Optionally, `StatCard`s in a `.dashboard-stats` section. The first card is the lemon one
   and the most important; cards that filter get `onClick` and `active`.
3. The notice.
4. The error.
5. `DataGrid` with the whole list (it searches, filters, sorts and pages on the client):
   a bold name with one `.grid-cell-sub` line; `Pill`s for categories and states (make those
   columns `filter`able); money with `align: "right"`; row actions last as `.table-actions`.

Converted, archived or read-only rows stay in the table, muted, with one link to where the
record lives now. A list that also has a board gets a **Board | List** toggle
(`.prospect-view-toggle`, `aria-pressed`), remembered in `localStorage` inside try/catch.

**Record screen.**

1. `Breadcrumb`.
2. `.page-header`, its actions as `.secondary-button`.
3. `.client-tabs`.
4. The Overview: `<section className="record-details">` of `Field`s.
5. The other tabs: cards or tables.

Another screen opens it on a tab with `navigate(path, { state: { tab } })`. An archived or
locked record says why and hides its edit controls.

**Add / edit.** Always a **wizard on its own page** (`/things/new`, `/things/:id/edit`),
never a form inside a list.

- **Steps.** Three to five, each one question, the last always **Review** (`.review-grid`).
  Services get their own step with `ServicePicker`.
- **Moving between steps.** The form's submit runs **Continue** until the last step, so
  Enter moves forward. Continue validates only the current step. Save validates every step
  and jumps back to the first with a problem; a server field error jumps to its step.
- **Footer.** Cancel / `← Previous` on the left; `Continue →` / Save on the right.
- **After saving,** go back with `navigate(list, { state: { saved: "Thing added." } })`; the
  list shows `.alert.alert-success`.
- **Two requests.** A save that takes two requests keeps the id from the first, so a retry
  updates instead of duplicating.
- **Loading or failed** is a `PageState`.

**Settings section.** Settings is one page (`SettingsLayout`): the header, a row of tabs
(groups), and a pill row when a group has several sections. A section is its own route,
listed in `pages/Settings/settingsSections.js` with the same permission as its route in
`App.jsx` (`needsBundle` / `needsCapability` for bundle-only ones). The section itself:

1. A `<div className="settings-panel settings-sub-page">` — never `<main>`, and no
   `Breadcrumb`: the tabs are the way back.
2. `.page-header.settings-panel-header` with an `h2`, one sentence, and its actions.
3. Settings that are values (a name, a time zone, a status) are `SettingRow`s in one
   `SettingRows` card: icon, title and one line of help on the left; the value with a
   pencil, a `.setting-select` or a toggle on the right. Editing opens in the row
   (`.setting-form`), and a result or warning about that setting is a `SettingNotice` in
   the same row — never a page-level alert or a popup. Lists stay a `DataGrid`.

Full-page editors opened from a section (new user, edit template) are routes outside the
tabs, with a `Breadcrumb` back to their section.

**Behaviour that tests rely on.**

- Name regions and filter groups with `aria-label`.
- Toggles use `aria-pressed`; tabs use `role="tab"` and `aria-selected`.
- An ambiguous button gets an `aria-label` naming its target.
- Confirm destructive actions with `window.confirm`, naming the thing.

## 5. Checklist for a new screen

1. Pick the kind of screen and open its reference.
2. Build it from §2. Add your page's class to shared selectors (e.g. the notices block in
   `styles/features/clients.css`) instead of writing new rules.
3. Use `term()`, and leave an organization without a bundle unchanged.
4. Gate the route and hide controls by permission.
5. Give add and edit their own wizard page, and come back with a `state.saved` notice.
6. Format money and dates with `formatMoney` and `formatDay`.
7. Write a Vitest test that finds things by role and label, not by class.
8. Add a Playwright step that saves a screenshot. Compare it with the reference, and in a
   dark theme.
9. If you pasted a block for the third time, move it to `components/ui/` (rule 2).
