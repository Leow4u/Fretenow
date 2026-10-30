# Task 2 — FreteNow operational Web portal

Date: 2026-10-30. Status: implementation and production build complete; controller browser acceptance remains a separate verification step. This is the first local demo Web increment, not whole-product parity.

## Ownership and runtime

Created `apps/web/**` (App Router routes, focused feature components, API helper, CSS, local brand copies and configuration). Updated root `package.json` with `dev:web`, `build:web`, `typecheck:web`, `start:web`, and root `package-lock.json` with exact frontend dependencies. Backend, contracts, original brand sources, existing reports and environment secrets were preserved by this worker. This report is the requested documentation exception to Web-only ownership.

Dependencies were verified against official npm registry before installation: Next.js **16.4.3**, React and React DOM **19.3.1**, lucide-react **1.65.0**, React/React DOM types **19.3.0**. Versions are pinned and locked. `npm install` completed with zero reported vulnerabilities. Existing Node 24 and TypeScript 5.9.3 are reused. Source is formatted with Prettier 3.6.2, used as a transient formatting tool.

The requested port 3000 was occupied by an unrelated service returning `Cannot GET /`. Starting Next on it failed with **EADDRINUSE**; the existing listener was preserved. The controller explicitly approved port **3002** as this project's default. Both Web dev/start scripts now bind **127.0.0.1:3002**. The controller owns aligning `WEB_ORIGIN=http://127.0.0.1:3002` in local API configuration and restarting the API. The API remains on **127.0.0.1:4100**, demo mode, with real PostgreSQL. No backend production-mode start was attempted.

Production server running at handoff: `http://127.0.0.1:3002`, started with `npm exec --workspace=@fretenow/web -- next start --hostname 127.0.0.1 --port 3002`. Build ID: `D2Eoff5BluO33dPxS8hAq`. Default repeatable commands:

```text
npm run dev:web
npm run build:web
npm run typecheck:web
npm run start:web
```

`next.config.ts` rewrites `/api/:path*` to the server-only `API_BASE_URL` (default `http://127.0.0.1:4100`). All client requests use same-origin URLs and include credentials. The session token returned by demo access is ignored; it is never rendered or persisted to browser storage. Authorization remains the API's HttpOnly cookie. The production build does not contact the API.

## Implemented flow

1. `/` loads the authorized snapshot. Without a session it shows an intentional access screen with **Open demo workspace** and the local demonstration/no-real-booking disclosure. Access calls `POST /api/demo/session`, then reloads snapshot. Expired authorized sessions return to access with a clear notice. Account menu includes API signout and a working Settings link.
2. Home uses the account greeting, genuine shipment counts/status tabs, searchable recent shipment rows and contextual empty state. The checklist links to read-only payment/company/member information and describes the capability accurately. Global search navigates to `/shipments?q=...`; query changes on the same page refresh the filter.
3. `/ship` provides Route, Freight, Date and Pickup and delivery groups; full US pickup/delivery addresses; LTL/FTL/Expedited; ZIP5/state validation; 1–50 cargo rows with quantity, **per-item weight** and dimensions; derived total weight/density; swap addresses; current local date minimum; and a future synthetic example. Additional services are explicit strings accepted by the API domain (the domain permits arbitrary bounded labels, with no carrier-service enum). No insurance, extraction or unavailable email form is offered.
4. `POST /api/v1/rates` receives the actual draft. Returned prices are rendered from USD minor units with carrier, transit days and expiration. The lowest returned price is recommended and appears first; other API options remain comparable. No pricing math is performed in the browser.
5. Steps are **Choose a rate → Pickup and delivery → Confirm and book**. Addresses/cargo are reviewed, then a separate explicit final review offers **Book demo shipment**. Editing clears rates/selection/key. Expired fresh rates are blocked and offer new rates. A pending/failed booking retry preserves the exact draft, rate and UUID key, including after the quoted expiry if the original attempt has an unknown outcome. A synchronous ref lock plus disabled button prevents duplicate clicks. Success refreshes snapshot and routes to `/shipments/:id`.
6. Detail independently reads `GET /api/v1/shipments/:id`, including its actual event timeline, cargo, addresses, mode, carrier and amount. Booked shipments expose in-app cancel/reschedule dialogs, not browser prompt/confirm. Each user intent receives a UUID reused on network retry. Rescheduling locks the submitted date on retry; action success refetches detail and snapshot. Non-booked actions are explained. Repeat links to `/ship?repeat=:id`, reads the source shipment and uses a fresh future date/rates.
7. Analytics reads API metrics/byStatus and exports only authorized shipment data already loaded in the snapshot. CSV values are quoted/escaped and guard leading formula characters. No trends are invented.

## Coverage of the twelve original modules

| Module | Actual delivered actions | Missing / partial |
|---|---|---|
| Onboarding/access | Local demo access, account identity, signout, expired-session screen | Real email-link login, onboarding/profile writes, invitations unavailable |
| Home | Actual account greeting, API shipment counts/status tabs, search, recent rows/empty state, contextual links | No fabricated statistics or unavailable write checklist |
| Ship something / quoting | Full validated draft, modes, cargo rows, example, swap, rates, comparison, review, idempotent booking | Carrier integration, extraction, insurance unavailable |
| Shipments | Search, status filters, route/detail, repeat, cancel/reschedule confirmation | Pagination and other operational actions unavailable |
| Tracking | Shipment detail timeline from persisted API events | Live tracking, carrier locations/maps, carrier advancement unavailable |
| Analytics | Actual counts, booked amount, byStatus bars and authorized CSV export | Period analysis, historical trends unavailable |
| Documents | Own API read model, count and contextual empty state | Generation, uploads and downloads unavailable |
| Payments | Own API read model and explicit local/no-payment state | Card, invoice, credit and payment writes unavailable |
| Claims | Own API read model and empty-state explanation | Filing, attachments and provider handling unavailable |
| Settings | Own API organization, source units/timezone, account, actual members, locations count | Company writes, saved-location writes, invites unavailable |
| Schedules | Own API read model and link to single shipment | Recurrence and scheduling worker unavailable |
| Price matches | Own API read model and quote link | External quote submission/matching unavailable |

The six empty read-model modules and Settings are intentionally **partial**, not complete commercial modules. Loading, API error/retry, empty and session-expired states are represented across the portal. All functional UI text is English; currency/weight/dimensions are USD/lb/in.

## Reference fidelity and visual evidence

Before UI work, this worker inspected all four accepted local screenshots with `view_image`:

- `C:/Users/leona/.codex/tools/rea/verification/linklane-app/01-home.jpg`
- `C:/Users/leona/.codex/tools/rea/verification/linklane-quote-example/01-ltl-input.jpg`
- `C:/Users/leona/.codex/tools/rea/verification/linklane-quote-example/02-ltl-rates-recommended.jpg`
- `C:/Users/leona/.codex/tools/rea/verification/linklane-quote-example/05-pickup-delivery.jpg`

Approved identity reuse: source brand README and design tokens were read. Approved outlined SVG wordmarks and both OFL font files/licenses were copied to `public/brand` without modifying originals. Titles use Bricolage Grotesque, body uses Instrument Sans through `next/font/local`. Navy `#0A1F4E`, actionable blue `#0166D9`, canvas `#F2F4F8`, white panels and vector lucide icons are implemented. Desktop uses the explicitly required persistent sidebar; narrow layouts use a compact navy header/menu.

| Comparison point | Reference evidence / implementation decision | Render acceptance |
|---|---|---|
| Navigation hierarchy | Home, Ship something, Shipments, Analytics, Documents, Payments, Claims, Settings retained; secondary Schedules/Price matches required in brief | Controller browser QA pending |
| Home grouping | Greeting, primary shipment CTA, status tabs, setup rows and shipment area preserved | Controller browser QA pending |
| Form density | Route/Freight/Date/Pickup-delivery group order, generous labels/controls and divided sections retained | Controller browser QA pending |
| Rates hierarchy | Blue recommendation band, prominent total, carrier/transit/expiry, distinct compare options retained | Controller browser QA pending |
| Booking review | Three steps, address review and separate rate summary retained | Controller browser QA pending |
| Typography/palette/assets | FreteNow approved substitutions required by brief; no LinkLane logo or contact information shipped | Controller browser QA pending |
| Responsive behavior | Single-column form/review and navy menu below 650px; tables scroll inside their own container | Controller desktop/mobile QA pending |

Intentional deviations: the supplied screenshots are narrow-screen LinkLane captures; the task explicitly calls for a desktop sidebar and FreteNow identity. Full structural addresses are collected **before** rates per API requirement. Transit days remain estimates without fabricated delivery promises. Save-card/invite/provider claims and marketing promises are replaced with accurate demo capability statements. Demo access, persistent demo labels and local-booking disclosures are required additions. A working account menu replaces original contact details. No original company phone number or real person data is carried over.

No implementation screenshot or successful UI interaction is claimed by this worker. The controller requested to own connected-browser QA after the production build to avoid duplicate work. Therefore native-reference viewport comparison, rendered screenshot `view_image`, above-the-fold copy diff, five-point rendered fidelity acceptance, desktop/mobile overflow inspection and end-to-end visual interaction evidence must be recorded by that controller before final project acceptance. Source comparisons above are **not** a substitute for rendered visual verification.

## Checks actually executed

- Registry exact-version checks: passed before install.
- `npm install`: passed; zero npm-reported vulnerabilities.
- `npm run build:web`: passed with Next.js 16.4.3 production compilation and TypeScript; generated catch-all App Router route independently of API.
- `npm run typecheck:web`: passed.
- `npm run typecheck`: passed; backend/shared contracts remain valid.
- `npm test`: **10 passed, 0 failed, 1 skipped** (PostgreSQL intentionally absent from this command's environment).
- `npm run test:postgres`: **1 passed, 0 failed, 0 skipped**, using real PostgreSQL and temporary test tenants; concurrency, replay, persistence, rollback and tenant isolation remain passing.
- `git diff --check`: passed.
- HTTP production smoke checks: `/` and `/ship` on 127.0.0.1:3002 returned **200**, homepage contains FreteNow title. These are HTTP checks, not browser interaction evidence.
- No lint script/config exists in the workspace. No lint result is claimed.
- Playwright packages are not installed (`npm ls @playwright/test playwright --depth=0` returned empty); no second mock server or superficial markup tests added. Controller connected browser is the agreed E2E method.

One initial build/typecheck failed because the shared-contract relative import traversed one directory too far. That path was corrected; both subsequent builds and final typechecks passed. Initial automatic session-expired notice and same-route global search query refresh were corrected before the final build. Formatting after final build only changed whitespace; the only postbuild script change is the approved default port 3002.

## Remaining acceptance / limitations

The controller should validate: access via rewritten cookie origin on port 3002; empty Home; native validation; synthetic example → rate → address review → final review → booking → detail; repeat; reschedule; cancellation; analytics/CSV; each partial module; global search; signout/expired session; desktop/mobile screenshots. Network-failure replay should verify the same `Idempotency-Key` is reused before changing the booking intent. Read models remain empty as specified by the API; draft progress is in component memory and does not survive refresh. Known HTTP booking failures retain the draft and same retry key; fresh quote entry is accessible via navigation. There is no production auth/provider/payment operation and no deployment.

No commit, push, deploy or message to an external recipient was performed. No pending tool approval or denied operation remains. The occupied 3000 port was resolved by the controller-approved 3002 configuration, without stopping the other app.

## Review round 1 — bodyless requests and quote/booking recovery

The environment recovered after the initial handoff interruption. Controller browser QA then reproduced an access blocker: **Open demo workspace** received `400 INVALID_REQUEST`. Root cause: the Web helper unconditionally supplied `Content-Type: application/json` for a bodyless POST, causing Fastify to reject the empty JSON body. The same defect affected signout. This round also addresses two controller review findings: a delayed rate response could install rates after draft edits, and definitive booking rejection could lock the interface into same-key retry.

Changed files in this round:

- `apps/web/lib/api.ts`: normalize caller headers with `Headers`; only supply default JSON content type when an actual body is present. Bodyless demo login and signout now omit it. JSON body requests continue to declare JSON and preserve provided headers.
- `apps/web/lib/quote-attempt.ts`: shared request-state logic used by the live flow. Quote responses are accepted only for the current draft revision. Booking attempts capture the UUID and serialized body once; transport failures/HTTP 500 retain the identical request. Only explicit API `RATE_EXPIRED`, `DRAFT_CHANGED` or `VALIDATION` 4xx responses clear the rejected attempt.
- `apps/web/components/ShipFlow.tsx`: every draft edit invalidates pending quote results. Delayed responses belonging to the prior draft are discarded. Definitive booking rejection clears selection/rates and returns to the editable draft, preserving entered values and meaningful error text. Unknown outcomes continue to disable edits and offer a retry with the exact captured body/key. This supersedes the initial report's limitation about known HTTP failures retaining an unrecoverable retry key.
- `apps/web/test/api.integration.test.ts`: integration with the **running real API/PostgreSQL**, not a mock backend. The fetch adapter supplies only relative-URL resolution, Origin and browser-style cookie handling for Node. Tests prove bodyless access followed by authorized snapshot, JSON rates, and bodyless signout followed by revoked session. Tokens/cookies are not logged.
- `apps/web/test/quote-attempt.test.ts`: controlled delayed-fetch regression proves stale quote rejection; explicit expired/changed/invalid responses release the attempt for new input; transport/500 outcomes preserve exact serialized body and UUID across retry.
- `apps/web/package.json`: repeatable `test:api` and `test:flow` scripts. No dependencies added, no backend files changed.

Observed regression evidence:

```text
Before helper fix: node --import tsx --test apps/web/test/api.integration.test.ts
demo login: FAIL, 400 INVALID_REQUEST
JSON rates: PASS
signout: FAIL, 400 INVALID_REQUEST

Before state correction: node --import tsx --test apps/web/test/quote-attempt.test.ts
delayed edited-draft quote: FAIL (received old rates instead of discard)
definitive rejection: FAIL (attempt remained locked)
unknown network/500 retry: PASS

After corrections:
real-API integration: tests 4, pass 4, fail 0, skipped 0
quote/booking state: tests 3, pass 3, fail 0, skipped 0
```

Repeatable commands (real API must be running on 4100 with allowed Origin 3002):

```text
npm run test:flow --workspace=@fretenow/web
npm run test:api --workspace=@fretenow/web
npm run build:web
npm run typecheck:web
npm test
npm run typecheck
```

Round-one production build passed: **`3ySOeOkC5e1N125_2jVRY`**. Web typecheck passed; backend suite again **10 passed, 0 failed, 1 PostgreSQL-env skip**; backend/shared typecheck passed. Formatting was run on changed source/tests. The controller was notified to restart its own Next process after this build; this worker did not stop or restart controller API session `93807` or Next session `97015`. Browser end-to-end and rendered fidelity acceptance still belong to the controller; successful browser interaction is not claimed by these helper/state tests.

## Review round 2 — mobile overflow, numeric locale and keyboard dialog

Controller-reported browser evidence: demo login → quote → booking → keyboard date entry/reschedule → cancellation → signout → new login passed. This is controller evidence, not a browser interaction independently performed by this worker.

At a 390×844 mobile viewport, controller inspection found document client width 375 versus scroll width 648. The accessible-only Details header span was absolutely positioned relative to an outer containing block and escaped the intended table scrolling container. The table intentionally remains wider than the mobile viewport; the page itself must not scroll horizontally. `apps/web/app/globals.css` now gives `.table-scroll` `position: relative`, so the absolute accessible label is contained within the existing `overflow-x: auto` area. No columns were hidden and local table scrolling remains available.

`apps/web/components/ShipFlow.tsx` now formats both physical total-weight summaries with explicit `toLocaleString("en-US")`, preserving the English UI even in a Portuguese browser locale (`1,000 lb`, rather than `1.000 lb`).

Controller keyboard inspection also found that the original action dialog left focus on the background trigger and did not trap focus or handle Escape. `apps/web/components/Shipments.tsx` now uses the browser's native `<dialog>` and `showModal()`. Native modal behavior makes background content inert and contains keyboard focus. Initial autofocus goes to the new date for reschedule and the safe **Keep shipment** action for cancellation. Escape closes when no submission is in flight; cleanup closes the native dialog and restores focus to the original trigger if it remains connected. The API submit logic, action date locking and idempotency key were preserved. CSS now styles the native backdrop and bounds the dialog within the viewport with internal scrolling.

Round-two owned changes: `apps/web/app/globals.css`, `apps/web/components/ShipFlow.tsx`, `apps/web/components/Shipments.tsx`, and this report. No backend or environment files changed. The controller stopped its own Next session `6584`; this worker did not stop/restart processes or operate a browser.

Verification:

- Initial sandbox `npm run build:web` cleanup failed with `EPERM` on the generated `.next/server/app/[[...path]]/page` directory, including after Next was stopped. Running the same authorized build with escalation succeeded; no manual deletion or unrelated process action was needed.
- Final `npm run build:web`: passed, Next 16.4.3 compilation, TypeScript and route generation.
- Frozen round-two build ID: **`7t7H40KitRDoL9iNZv4eY`**.
- `npm run typecheck:web`: passed.
- `git diff --check`: passed.
- No full API-suite rerun for these scoped presentation/accessibility changes, per controller instruction. Prior API and state regression results remain documented above.

Controller was notified to restart Next with this build. Required browser acceptance remains: remeasure mobile document width while keeping table-local scrolling; check totals under Portuguese browser locale; open both dialogs via keyboard, verify initial focus/Tab containment/Escape/focus return, and confirm submission still works. No successful rendered verification of these round-two changes is claimed by this worker.

## Final Minor fixes - recency and UTC calendar

Home now sorts a copy by createdAt descending before choosing five; other shipment-list ordering is preserved. `utcDate(offset, now)` aligns all Web draft defaults, examples, pickup/reschedule bounds with API/native UTC calendars. Pickup labels explicitly say UTC. Test-only instant injection avoids global-clock changes. The existing API integration fixture import was renamed for typecheck; live API suites were not rerun.

`node --import tsx --test apps/web/test/presentation.test.ts`:2 passed/0failed/skipped; seven deliberately unordered records and the Chicago previous-day/UTC rollover case, tomorrow/366-day bounds and year rollover. `npm run typecheck:web` and production build passed. Build **WojKHd--JjTJ7lEUspPPM**; controller restarted Next3002 (session14678). Initial normal build hit generated-.next EPERM; same build passed with escalation, without manual deletion. No API/Postgres code or tests changed. See [final-fix-report.md](final-fix-report.md).
