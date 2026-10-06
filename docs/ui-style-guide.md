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
| Settings sub-page | Deadline rules, Firm | `src/pages/Settings/DeadlineRulesPage.jsx`, `src/pages/Settings/FirmPage.jsx` |
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
| A label and value on a record | `<Field label value href />` | `components/common/Field.jsx` |
| A letter or other rendered HTML, as it will print | `<LetterFrame html ref />` (sandboxed iframe; `ref.current.print()`) — never `dangerouslySetInnerHTML` | `components/documents/LetterFrame.jsx` |
| Bundle-defined fields | `<SchemaForm />` | `components/bundle/SchemaForm.jsx` |
| An engagement's year, services and fees | `<EngagementForm />` | `components/bundle/EngagementForm.jsx` |
| Route guards | `RequirePermission`, `WithoutBundle` | `components/auth/` |
| Money, dates, enum labels | `formatMoney` (`₹45,000`), `formatDay` (`31 Jul 2027`), `enumLabel` | `components/bundle/bundleLabels.js` |

`SearchBar`, `EmptyState`, `StatusBadge` and the `*Table` / `*Workflow` components in
`components/{leads,customers,services,emailAccounts}` belong to the original core screens.
Don't use them on new screens; use the classes below.

### Classes

| Need | Classes |
|---|---|
| Page title and actions | `.page-header` (an `h1`, one sentence `p`, buttons on the right) |
| List toolbar | `.clients-toolbar` holding `.clients-search`, `.clients-select`, `.client-checkbox` |
| Filter chips | `.clients-chips` holding `.chip` / `.chip.active` (single choice, `All` first) |
| A list | `.card` holding `table.clients-table` |
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
4. The toolbar, then the chips.
5. The error.
6. `.card` › `table.clients-table`. Lists start with a muted `#` column; then a bold name
   with one `.settings-row-hint` line; pills; money in `.numeric` (right-aligned); actions
   last.

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

**Settings sub-page.**

1. `Breadcrumb` (`backLabel="Settings" section="SETTINGS"`).
2. `.page-header`.
3. Cards.

A bundle-only setting shows in Settings only when the bundle needs it (`needsCapability`).

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
