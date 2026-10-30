# FreteNow local demo API — implemented contract

This contract describes the executable increment, not full LinkLane parity. All accounts, rates, shipments and read models are synthetic. No email, SMS, payment, freight purchase or carrier request is sent.

## Run and configuration

Node 24.x is required (verified with 24.19.0). Run `npm ci`, configure `.env.local` from `.env.example`, then `npm run dev:api`. Node loads `.env.local` automatically. Runtime requires `APP_MODE=demo`, a non-production `NODE_ENV` and `DATABASE_URL`; there is no runtime fallback to memory. Default port is 4100. Binding is always `127.0.0.1`. `NODE_ENV=production` or `APP_MODE=production` cannot start this demo server. `createApp({store,mode,clock?,webOrigins?})` is exported for injected tests. `MemoryStore` is for tests; `PostgresStore` is the runtime adapter. A local PostgreSQL 17 service is defined by `docker-compose.yml`, bound to loopback port 55432; its password is intentionally local-demo-only. Existing `.env.local` credentials take precedence in the current workspace.

`WEB_ORIGIN` optionally sets one exact HTTP loopback Web origin. Without it, `http://127.0.0.1:3000` and `http://localhost:3000` are allowed. Credentialed CORS replies are limited to those configured origins. Do not put a trailing slash in the origin. Web fetches must use `credentials: 'include'`; native clients can use `Authorization: Bearer <token>`. Allowed headers are Content-Type, Authorization and Idempotency-Key. Cookie mutations require an allowed Origin, including signout. Bearer requests do not require Origin. The demo session endpoint rejects an explicitly disallowed Origin, and accepts absent Origin for native clients. No permissive wildcard CORS is configured.

## Session

- `POST /api/demo/session` — no body required, 201 `{token,account,demo:true}`. Sets `fretenow_session` as HttpOnly, SameSite=Strict, Path=/api with a one-hour lifetime. Random 256-bit tokens are stored only as SHA-256 digests. The synthetic organization is `demo-fretenow`. Local HTTP cookies omit Secure because this server only binds to loopback. Production identity is unimplemented; the demo endpoint returns 404 when the app is configured for production.
- `GET /api/auth/session` — 200 `{account,demo:true}` for a live session.
- `POST /api/auth/signout` — revokes that session and clears the cookie, 204.

`account` is `{id,organizationId,name,organizationName,email,demo:true}`. Sessions expire after one hour without sliding renewal. Session persistence works across API restarts. Tenant identity always comes from the server session. Bodies cannot switch organization. Test code may call `store.createSession(token,{tenantId,expiresAt})`; this is not an HTTP endpoint. Onboarding patches and real link-based authentication are unavailable in this increment.

## Quote and booking

`POST /api/v1/rates` takes the draft directly:

```json
{
  "mode":"LTL",
  "origin":{"name":"Demo origin","address":"120 Main St","city":"Austin","state":"TX","postalCode":"78701","country":"US"},
  "destination":{"name":"Demo destination","address":"210 Broad St","city":"Denver","state":"CO","postalCode":"80202","country":"US"},
  "pickupDate":"2026-11-02",
  "items":[{"description":"Pallet","quantity":1,"weightLb":100,"lengthIn":48,"widthIn":40,"heightIn":36}],
  "accessorials":[]
}
```

The example date must be replaced with a current or future real date. Modes are `LTL`, `FTL`, `Expedited`. Names, street address and city are required. US state abbreviations (including DC) and ZIP5 are validated. This is structural validation, not postal geocoding. Dates must exist and fall between today (UTC) and the next 366 days. Cargo requires 1–50 items, positive finite measurements, integer quantity <=10,000, per-item weight <=100,000 lb, dimensions <=1,000 in, and aggregate quantity × weight <=1,000,000 lb. At most 20 nonempty accessorial strings of up to 80 characters are accepted. Accessorials are demo labels, not a validated carrier service catalog. Unknown draft fields are ignored and never persisted. Text is trimmed before hashing; accessorial and item order are preserved.

Returns 200 `{rates:[{id,carrier,amountMinor,currency:'USD',transitDays,validUntilISO,draftHash,demo:true}]}`. The three synthetic carriers use deterministic integer pricing from mode, aggregate weight and accessorial count; these are not market prices. IDs are random and each quote is valid for 15 minutes. All normalized draft fields enter its hash.

`POST /api/v1/shipments` takes `{rateId,draft}` plus mandatory `Idempotency-Key`. First creation returns 201 with the Shipment directly. Replay returns 200 with the original response snapshot and original ID. Allowed keys are 1–128 characters from letters, digits, `_ . : -`. Same key with another normalized payload returns 409. The key is scoped to the authenticated tenant and operation. Concurrent requests across processes serialize through the database transaction. An expired/mismatched rate returns 409; another tenant's rate returns 404. Price, status, ID, actor and tenant are server-owned; submitted overrides are ignored. Even a successful booking is a local demonstration record only.

Shipment is `{id,mode,status,origin,destination,pickupDate,items,accessorials,carrier,amountMinor,currency:'USD',createdAt,demo:true,events}`. Status is `booked | in_transit | delivered | cancelled`. Creation starts at `booked`; external tracking advancement is unimplemented. Events are `{id,type,at,actor,source:'demo',pickupDate?}`.

`POST /api/v1/shipments/:id/actions` takes `{type:'cancel'}` or `{type:'reschedule',pickupDate:'YYYY-MM-DD'}` with `Idempotency-Key`. Returns 200 with the updated shipment, or the original response snapshot on replay. Only `booked` shipments permit these actions. They append an audit event and guard against invalid state transitions. Rescheduling does not call or reprice a carrier. Keys for actions are tenant-wide across shipment IDs, so callers should generate a fresh UUID per user intent. Existing-key payload changes return 409.

## Reads

All `/api/v1` reads require session authorization:

| Route | Response |
|---|---|
| `GET /api/v1/snapshot` | `{account,shipments,claims,actions,watchers,settings,schedules,demo:true}` |
| `GET /api/v1/shipments` | `{shipments,demo:true}` |
| `GET /api/v1/shipments/:id` | Shipment directly, tenant-scoped 404 on absence |
| `GET /api/v1/shipments/:id/events` | `{events,demo:true}`, tenant-scoped 404 on absence |
| `GET /api/v1/home/needs` | `{actions,demo:true}`; upcoming pickup actions derived from booked shipments |
| `GET /api/v1/settings` | Synthetic organization, preferences, member, empty locations and capability flags |
| `GET /api/v1/claims` | `{claims:[],capabilities:{write:false,provider:false},demo:true}` |
| `GET /api/v1/schedules` | `{schedules:[],capabilities:{write:false,provider:false},demo:true}` |
| `GET /api/v1/price-matches` | `{priceMatches:[],capabilities:{write:false,provider:false},demo:true}` |
| `GET /api/v1/documents` | `{documents:[],capabilities:{write:false,provider:false},demo:true}` |
| `GET /api/v1/payments` | `{payments:[],capabilities:{write:false,provider:false},demo:true}` |
| `GET /api/v1/analytics` | `{totalShipments,bookedAmountMinor,currency:'USD',byStatus,demo:true}` derived from tenant shipments; cancelled shipments excluded from booked amount |

Snapshot claims, watchers and schedules are empty. There is no claim filing, document generation, upload, payment, invoice, scheduler worker or analytics period/export support. `POST` to `/api/v1/{payments,payments/credit,credit,documents,claims,schedules,price-matches,settings/invites,shipments/:id/send}` returns 501 `CAPABILITY_UNAVAILABLE`, never generic success. Other unimplemented routes return 404.

`GET /health` is public: `{ready,mode,storage}`; ready failures return 503. It includes no database URL or credentials. Requests use a 64 KiB body limit. Errors are JSON `{error:{code,message,fields?}}`; 400 validation, 401 missing/expired session, 403 origin failure, 404 missing resource, 409 conflict, 501 unavailable capability. Internal errors expose neither stack traces nor provider secrets. Responses use Cache-Control: no-store.

## Persistence and limits

`001_initial.sql` creates tenant JSONB state and a session table. Startup applies idempotent schema creation. Every tenant operation opens a transaction, inserts a missing tenant safely, then locks its row with `FOR UPDATE`; domain changes and idempotency response are committed together. A failed operation rolls back. Distinct tenants have distinct rows and queries use parameterized SQL. Concurrent clients and process restarts share persisted rates, shipments, audit events, sessions and replay responses. The Memory adapter follows the same serialize/clone/commit semantics for tests.

This increment intentionally serializes reads and writes per organization. Rates, sessions, event histories and replay responses have no retention/pruning job; do not expose this local demo publicly or treat its storage/performance as production ready. Pagination, RBAC, rate limiting, distributed session revocation policy and real identity/providers remain future work. Normalize tenants/members, drafts, quotes, shipments, events and idempotency into relational tables with foreign keys, indexes, role enforcement and retention policies before production operation. Maintain operation atomicity and tenant predicates during that migration.

Replay validates payload structure and compares its stored hash before applying time-dependent checks. The same previously accepted payload therefore replays after tariff expiry or after its pickup date, provided the session is live. Fresh writes still require a current valid date. A replay response is a historical snapshot; refetch detail to observe subsequent cancellation or rescheduling.

## Verification

`npm test` runs injected API tests; PostgreSQL integration skips when DATABASE_URL is absent. `npm run typecheck` checks backend and shared packages. `npm run test:postgres` loads `.env.local` and exercises independent pools, concurrent same-key booking, rollback, session/quote/shipment persistence across closing and recreating all adapters, changed-payload conflict and tenant isolation. It creates temporary `test-*` tenants and cleans its own records. No production credentials or real operations are needed.
