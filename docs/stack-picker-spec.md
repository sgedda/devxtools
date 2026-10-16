# Stack Picker: UX spec (devxtools.dev)

Status: draft for build · Owner: Design → CTO · Based on the live site, curled 2026-10-16

## 0. What exists today (findings)
- Nav item **"Pick a Tool"** goes to **`/picker/`**. It's a hard-coded decision tree with 2–3 questions about mocking and test data only ("What do you need?" → "Where are you running tests?" → "Record/replay?"), and it ends in **one** recommendation such as "We recommend: MSW". It has no URL state, it ignores observability, API clients, E2E and load tools, and it isn't generated from the catalog.
- The page already embeds the full catalog as `allTools` JSON (61 tools). `/catalog/` renders `article.tool-card` with `data-sections/categories/languages/specs/stars/updated`.
- Catalog fields: `name, slug, website, license, languages[], runtimes[], sections[], categories[], bestFor, description, lastChecked` (all 61 tools); `repo, whenToUse` (49); `githubStars, lastActivity` (39); `specSupport[]` (24); `npmPackage` (18); `weeklyDownloads` (16); `platforms[]` (10); `pypiPackage` (2); `affiliation` (1, mockifyer: "maintainer is the author").

**Decision:** replace `/picker/` in place, keeping the URL and nav label "Pick a Tool" (page H1: "Pick tools for your stack"). Add `/stack-picker/` as a 301 to `/picker/`. Add a compact entry widget on the home page and the 4 section pages that deep-links with query params.

## 1. Inputs: 3 chip groups
Each group is a `<fieldset>`. Every group has **"Not sure / Any"**, which is the default and applies no filter.

### Group 1: "What are you building?" (`platform`, single-select, radio)
| Chip | `?platform=` | Matches if tool has any of |
|---|---|---|
| Web app (React, Vue…) | `web` | runtimes ∋ Browser, Web, React · platforms ∋ Web |
| React Native / mobile | `rn` | runtimes/platforms ∋ React Native, iOS, Android |
| Node.js backend / API | `node` | runtimes ∋ Node.js |
| Other backend (JVM, Python, Go, .NET) | `backend` | runtimes ∋ JVM, Python, .NET · languages ∋ Java, Python, Go, C#, .NET, Kotlin, Scala |
| Not sure / Any | (omitted) | no filter |

**Language-agnostic tools pass every platform filter but rank lower.** These are tools with runtimes in {CLI, Desktop, Hosted, Docker, Self-hosted, Kubernetes, Multi-language} or languages = N/A. Postman, Mockoon, Prism and Sentry are examples. They go in "Also works" with the reason "Language-agnostic (CLI/Desktop/Hosted)".

### Group 2: "What do you need?" (`need`, multi-select, checkbox, max 3 to keep results focused)
This replaces the brief's "test runner" group. The catalog has no test-runner field (see §9), and a visitor's job-to-be-done drives matching better anyway.
| Chip | `need=` value | categories |
|---|---|---|
| Mock APIs in tests | `mock` | http-interception, mock-server, spec-based-mocking, hosted-mocks |
| Record & replay real traffic | `record` | record-replay |
| Test data | `data` | test-data-generation |
| E2E / UI tests | `e2e` | e2e-testing |
| Contract / spec | `contract` | contract-testing, openapi-tooling, sdk-generator |
| Load testing | `load` | load-testing |
| Explore / debug APIs | `debug` | api-client, network-debugging |
| Monitor in production | `observe` | error-monitoring, distributed-tracing, log-aggregation, application-logging, metrics |
| Not sure / Any | (omitted) | no filter |
Tools match if they're in **any** selected category (OR). Ticking "Not sure" clears the others, and ticking any other chip unticks "Not sure".

### Group 3: "Language" (`lang`, single-select, radio)
Chips: TypeScript/JavaScript (`ts`, matches JavaScript or TypeScript) · Python (`py`) · Java/Kotlin (`jvm`) · Go (`go`) · C#/.NET (`dotnet`) · Ruby (`ruby`) · Not sure/Any.
Tools with languages = N/A always pass this filter and get the reason "Any language".
Platform and language interact: choosing `rn` or `web` pre-selects `ts` once, but only if the visitor hasn't touched Language yet.

Optional, behind a "More filters" disclosure that doesn't count toward the 3 groups: Spec (`spec=openapi|graphql|asyncapi|grpc`, from `specSupport`) and "Open source only" (`oss=1`, from `license ≠ Proprietary`).

## 2. Behaviour
- **Live results, no submit button.** Results re-filter on every change, client-side, from the embedded `allTools`.
- **URL state:** `history.replaceState` writes `/picker/?platform=rn&need=mock,record&lang=ts`. Opening that URL restores the selection. "Copy link" button sits in the summary bar.
- Unknown params are ignored. Invalid values are dropped silently and the URL is normalised.
- With no filters set, the page shows a prompt plus the 6 most-starred tools across sections, labelled "Popular across the catalog".

## 3. Results layout
- Header line: **"14 tools match"** in an `aria-live="polite"` region, debounced 400 ms.
- Two groups:
  - **Best match:** satisfies every active filter through a *specific* field (not just "agnostic/N/A").
  - **Also works:** passes only through language-agnostic or N/A rules, or matches some but not all selected needs.
- Uses the **existing `tool-card` component** unchanged, plus a row of 1–3 **reason chips** (non-interactive `<ul>`), for example `React Native` `record-replay` `TypeScript`. Each chip is the field value that matched. Reason chips use a muted style so they don't look like filter chips.
- **Sort:** by `githubStars` descending. Tools without stars (39/61 have stars; proprietary tools mostly don't) sort after starred ones, then A–Z. A small note says "Sorted by GitHub stars. No sponsored placement."
- **Neutrality:** no paid boosts. Tools with `affiliation` (Mockifyer) sort normally and show the disclosure line on the card ("Maintainer of devxtools is the author").
- Each group shows its first 9 tools, then "Show all N".

## 4. Empty state
Shown when Best match and Also works are both empty:
- "No tools match **React Native + Load testing + Go**."
- Name the filter that excluded everything. Compute the result count with each filter removed in turn, then name the one whose removal gives the most results: "Removing **Go** gives 3 results."
- One-tap buttons: `Remove Go (3)` · `Clear all`.
- "Nearest matches": the top 3 tools that match the most active filters, each with reason chips showing what matched and what didn't (✓ RN ✗ Go).
- Footer: "Know a tool that fits? **Suggest it** → `/submit/`".

## 5. Entry widget (home + section pages)
- A compact one-row card: "Pick tools for your stack" with the Group 1 chips inline and a "See matches →" link.
- Each chip is a plain **link** (`/picker/?platform=rn`), so it works with no JS.
- Section pages pre-set the need: `/testing/` → `need=e2e`, `/mocking-test-data/` → `need=mock`, `/api-development/` → `need=debug`, `/observability/` → `need=observe`.

## 6. Wireframes
Desktop (≥1024px):
```
Pick tools for your stack                                 [Copy link]
┌ What are you building? ───────────────────────────────────────────┐
│ (•Web app) ( React Native ) ( Node backend ) ( Other ) ( Any )    │
├ What do you need? (up to 3) ──────────────────────────────────────┤
│ [✓Mock APIs] [ Record&replay ] [ Test data ] [ E2E ] [ Contract ] │
│ [ Load ] [ Debug APIs ] [ Monitor ] [ Not sure ]                  │
├ Language ─────────────────────────────────────────────────────────┤
│ (•TS/JS) ( Python ) ( Java ) ( Go ) ( .NET ) ( Ruby ) ( Any )     │
└ ▸ More filters                                      Clear all ────┘
9 tools match · sorted by GitHub stars · no sponsored placement
BEST MATCH
┌────────────┐ ┌────────────┐ ┌────────────┐
│ MSW   ★17k │ │ MirageJS   │ │ Polly.JS   │
│ bestFor…   │ │ bestFor…   │ │ bestFor…   │
│ [Browser]  │ │ [Browser]  │ │ [Browser]  │
│ [http-int.]│ │ [mock-srv] │ │ [rec-rep.] │
└────────────┘ └────────────┘ └────────────┘
ALSO WORKS (language-agnostic)
┌────────────┐ ┌────────────┐
│ Mockoon    │ │ Prism      │ …
└────────────┘ └────────────┘
```
Mobile (<640px):
```
┌──────────────────────────────┐
│ Pick tools for your stack    │
├──────────────────────────────┤ ← sticky summary bar
│ RN · Mock APIs · TS   [Edit] │
│ 7 tools match                │
├──────────────────────────────┤
│ BEST MATCH                   │
│ ┌──────────────────────────┐ │
│ │ Mockifyer           ★ —  │ │
│ │ [React Native][rec-rep]  │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ MSW                      │ │
└──────────────────────────────┘
[Edit] → bottom sheet:
┌──────────────────────────────┐
│ ━━━            Filters   ✕   │
│ What are you building?       │
│ (Web)(•RN)(Node)(Other)(Any) │  ← chips wrap; no horizontal scroll
│ What do you need? (up to 3)  │
│ [✓Mock][Record][Data][E2E]…  │
│ Language                     │
│ (•TS/JS)(Python)(Java)…      │
│ [Clear all]   [Show 7 tools] │
└──────────────────────────────┘
```
- On first visit with no params, the groups render inline and stacked. The summary bar and bottom sheet appear once something is selected and the visitor scrolls past the groups.
- Chips **wrap** instead of scrolling sideways, because horizontally scrolled chips hide options. Tap targets are ≥ 44×44 px.
- The sheet applies changes live. "Show N tools" only closes it. Focus is trapped while it's open, Esc and ✕ close it, and focus returns to [Edit].

## 7. Accessibility
- Each group is a `<fieldset>` + `<legend>`. Chips are **native** `<input type=radio|checkbox>` with a styled `<label>`, so no `aria-pressed` is needed. Arrow keys move between radios and Space toggles checkboxes.
- Visible focus: 2 px indigo ring with offset, `:focus-visible`. Selected state shows a ✓ icon plus fill, not colour alone.
- Contrast: chip text and borders ≥ 4.5:1 / 3:1 in light and dark modes.
- The result count lives in one `role="status"` region. Group headings are `<h2>`. Reason chips have the prefix "Matches:" for screen readers (`sr-only`).
- When the need limit is reached, the remaining chips get `aria-disabled`, with a hint read out: "Up to 3; untick one to change."
- Empty-state buttons are real `<button>` elements, and after a "Remove X" button is used, focus moves to the result count.
- `prefers-reduced-motion`: no card re-order animation and no sheet slide (fade or instant instead).
- No-JS fallback: the server renders the full catalog list, and the entry-widget links still work.

## 8. Analytics (privacy-friendly, no PII)
| Event | Props |
|---|---|
| `picker_view` | source (`nav`, `home_widget`, `section_widget`, `direct`), has_params |
| `picker_filter_change` | group, value, selected (bool), result_count |
| `picker_result_click` | slug, group (`best`/`also`), position, filters |
| `picker_empty` | filters, suggested_relax |
| `picker_relax_click` / `picker_clear` | removed filter |
| `picker_copy_link` | filters |
| `picker_submit_click` | filters (empty-state CTA) |
Debounce `filter_change` by 1 s. Use these events to decide future chip options, for example a runner group if the data supports one.

## 9. Data gaps (fix in catalog before or with the build)
1. **No test-runner field** (Jest, Vitest, Pytest, JUnit, Detox runner…). Add `worksWith: string[]` if a runner group is wanted later, which is why it's out of v1.
2. **`platforms` is only on 10/61 tools, and `runtimes` mixes concepts** (OS, deploy target, UI form, language). Mobile matching currently relies on runtimes/platforms containing React Native/iOS/Android. Fill `platforms` for all tools, and normalise React vs Browser vs Web.
3. **No frameworks field.** "React" appears only once (reactotron), and Vue.js appears as a *language*. Add `frameworks[]` (React, Vue, Angular, Next, Express, Hono…).
4. **`githubStars` is missing for 22 tools**, which hurts sorting. Consider a `popularity` fallback from `weeklyDownloads` (16) or mark the field as n/a.
5. **`languages: ["N/A"]` on 12 tools** mixes "any language" with "unknown". Split into `languageAgnostic: true`.
6. Minor: categories have no `metrics` peers (1 tool), and `license` is free text (e.g. "MIT (core) + proprietary ee/ directory"). Add `isOpenSource: boolean` for the OSS filter.

## 10. Edge cases
- `need` with more than 3 values in the URL: keep the first 3.
- Platform `backend` + lang `ts`: contradictory but allowed. Show results and, if they're empty, run the normal empty state.
- Tools tagged with several categories show once, in the highest group they qualify for.
- A tool card that lacks stars or repo still renders (existing card behaviour).
- Back/forward: use `replaceState` per change and `pushState` only for Clear all / Remove so Back undoes them. Listen for `popstate`.
- Catalog grows: options are static, but the counts on each chip (e.g. "Load (5)") are computed live, and chips with 0 results under the current filters are dimmed but still selectable.

## 11. Acceptance criteria
- [ ] `/picker/` renders 3 fieldsets with the exact options and mappings in §1. `/stack-picker/` 301s to `/picker/`.
- [ ] Changing any chip updates results within 100 ms with no submit button, and the URL reflects the state. Reloading or sharing the URL restores it.
- [ ] Results reuse `tool-card`, split into Best match / Also works, each card shows ≥1 reason chip, and results are sorted by stars desc then A–Z.
- [ ] The result count is announced through a live region and isn't announced more than once per 400 ms.
- [ ] The empty state names the most restrictive filter, offers Remove (with count) and Clear all, lists 3 nearest matches, and links to `/submit/`.
- [ ] Mobile <640px: sticky summary bar, bottom-sheet editor with focus trap, chips wrap, 44 px targets, and no horizontal page overflow at 360px.
- [ ] Keyboard-only and VoiceOver/NVDA can complete a full pick. axe shows no serious issues, and contrast is AA in both themes.
- [ ] Reduced motion disables animations. The page is usable without JS (catalog list plus working widget links).
- [ ] Home and 4 section pages show the entry widget with the deep links from §5.
- [ ] No sponsored ordering. The affiliation disclosure shows on Mockifyer's card.
- [ ] Analytics events in §8 fire with the listed props.
