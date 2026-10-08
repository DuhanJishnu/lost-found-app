# Python API Architecture: The 4-Layer Pattern

A scalable, maintainable Python backend relies on strict **Separation of Concerns**. Data flows through distinct, isolated layers, ensuring components are highly testable, decoupled, and easy to refactor.

## The Request Pipeline

```text
HTTP Request (Frontend)
       ↓
[ 1. Router/View ]    ← HTTP boundaries & routing
       ↓
[ 2. Schemas ]        ← Data validation (Gatekeeper)
       ↓
[ 3. Service ]        ← Business logic (The Brain)
       ↓
[ 4. Repository ]     ← Database access (The Vault)
       ↓
PostgreSQL (DB)
```

## Directory Structure
```text
app/
├── api/             # Routers (endpoints)
├── schemas/         # Data validation models (e.g., Pydantic)
├── services/        # Core business logic
└── repositories/    # Database queries and transactions
```

---

## Layer Breakdown & Developer Rules

### 1. Router/View (`app/api/items.py`)
**Role:** The Traffic Cop.
*   **Do:** Route HTTP requests, inject dependencies, define status codes, and return responses.
*   **Don't:** Write business logic, compute data, or touch the database. 
*   **Knowledge Nugget:** Routers should be as thin as possible. If your endpoint function is longer than 10 lines, your business logic is leaking.

### 2. Schemas (`app/schemas/item.py`)
**Role:** The Bouncer.
*   **Do:** Use strict typing (e.g., Pydantic) to define expected input/output structures.
*   **Don't:** Perform database lookups or complex cross-field business validation.
*   **Knowledge Nugget:** Schemas protect your API by failing fast. An invalid payload (e.g., missing titles, wrong enum values) triggers a `422 Unprocessable Entity` instantly, saving server processing power.

### 3. Service (`app/services/item_service.py`)
**Role:** The Brain.
*   **Do:** Execute all business rules (e.g., triggering notifications, calling external APIs like Gemini, calculating matches). 
*   **Don't:** Parse HTTP payloads (`request.json()`) or write direct SQL/ORM commands (`db.execute()`).
*   **Knowledge Nugget:** This layer operates entirely on validated Python objects. Because it is ignorant of both the Web network and the Database, you can test 100% of your business logic using fast, isolated unit tests.
*   The service shouldn't contain SQL. Thus filtering also belong to repository.

### 4. Repository (`app/repositories/item_repository.py`)
**Role:** The Vault.
*   **Do:** Handle data persistence (CRUD operations, `add`, `commit`, `refresh`, complex SQL queries).
*   **Don't:** Know *why* data is being saved. Never put domain logic, email triggers, or Redis caching here.
*   **Knowledge Nugget:** The Repository pattern abstracts the database. If you switch from PostgreSQL to MongoDB, or from SQLAlchemy to SQLModel, you only rewrite this single folder. The rest of your app remains untouched.

## Important Things to Remember
The `*`

This is an important Python feature:

```
async def get_items(
    self,
    *,
    item_type: ItemType | None = None,
    category: str | None = None,
    ...
):
```
The `*` means:

Everything after `*` must be passed using its parameter name.


### Cloudflare R2 image upload — short summary

Think:

> **Frontend carries the image → Backend gives permission → R2 stores the image.**

**Upload flow:**

```text
User selects image
      ↓
Frontend
      ↓
POST /storage/upload-url
      ↓
FastAPI
      ↓
Creates temporary PUT URL
      ↓
Frontend receives:
  upload_url
  object_key
      ↓
Frontend PUTs actual image directly to R2
      ↓
R2 stores:
items/abc123.jpg
```

### What each thing does

* **Frontend:** Has the actual image and uploads it.
* **FastAPI:** Never receives the image. It creates a temporary **presigned URL**.
* **R2:** Actually stores the image.
* **Object key:** The image's name/address, e.g. `items/abc123.jpg`.
* **Database:** Stores the object key along with the Lost & Found item.

### Download flow

```text
Frontend asks for image
        ↓
FastAPI gets object_key from DB
        ↓
FastAPI creates temporary GET URL
        ↓
Frontend receives URL
        ↓
Frontend gets image directly from R2
```

### Remember this

> **Backend gives the key. Frontend carries the file. R2 keeps the file.**

And your R2 bucket stays **private**; presigned URLs provide temporary access when needed.

---

## Decision & Change Log (per implementation_plan.md)

### Phase 1 — Critical bugs & claim flow (done, verified Oct 2026)
- `ClaimService` now takes `db` + repositories; `create_manual_claim` wraps
  Match check/create + Claim create in one `begin_nested()` transaction and
  calls `notify_claim_created()` after commit (`services/claim_service.py`).
- Dead `start_claim()` stub removed; `POST /claims/` uses the
  `get_claim_service` dependency (`api/claims.py`).
- `/found/feed` and `/found/{item_id}` are registered before the wildcard
  `/{item_id}` route so FastAPI never shadows them (`api/items.py`).
- Gemini `embed_content` (sync SDK) runs inside `asyncio.to_thread`
  (`services/embedding_service.py`).
- Temporary `POST /auth/dev-token/{user_id}` removed (`api/auth.py`).

### Phase 2 — Manual claim transaction hardening (done, verified Oct 2026)
- Single-transaction Match + Claim creation; `IntegrityError` → `409 Conflict`
  (`services/claim_service.py`, `api/claims.py`).
- Conditional status transitions (`WHERE status = PENDING`) in
  `repositories/claim_repository.py` and `repositories/match_repository.py`.
- Claim PENDING keeps both items ACTIVE; ACCEPTED → both CLOSED (+ match
  CONFIRMED); REJECTED → items back to ACTIVE if they were MATCHED.
- Covered by `tests/test_claims_transaction.py` (lifecycle + concurrent
  accept/reject race: exactly one succeeds).

### Phase 3 — Matches API cleanup (done, Oct 2026)
- **3.1** `GET /matches` lists matches where the caller owns the LOST item
  **or** the FOUND item, newest first (`api/match.py`,
  `MatchRepository.get_for_user`, `MatchService.list_matches_for_user`).
- **3.2** `GET /matches/{match_id}` returns one match only after an
  ownership join-check; strangers get `404` (`get_by_id_for_user`,
  `get_match_for_user`). Generic `/{match_id}` route is safe: the manual
  `POST /items/{item_id}/find` path has 3 segments, so no shadowing.
- **3.3** Manual `POST /matches/items/{item_id}/find` **kept but marked
  `deprecated=True`**. Decision: production matching runs in the ARQ worker
  (`ItemProcessingService`); this route stays as an ownership-gated
  debug trigger, not a public API.
- **3.4** Confirm path verified transactional: `confirm_match()` does the
  conditional PENDING→CONFIRMED update, ACTIVE→MATCHED item updates, and
  competing-pending→REJECTED cleanup, then a **single commit**
  (`repositories/match_repository.py`). No code change needed.
- **3.5** `MatchResponse` now carries optional `lost_item` / `found_item`
  summaries (`MatchItemSummary`: id, user_id, type, title, category,
  status). Optional (default `None`) so existing `POST find` / `PATCH
  status` responses stay backward compatible; the new GET endpoints always
  populate them via `MatchService._to_enriched_match`.

### Phase 10 — Test suite (in progress, run in parallel)
- Existing: `tests/test_claims_transaction.py` (Phase 2).
- Phase 3: `tests/test_matches_phase3.py` — list visibility per role, detail
  ownership (`ValueError` for stranger), enriched schema fields, confirm
  rejects competitors + items → MATCHED, lost-owner-only confirm,
  double-decide → `ValueError`.
- Phase 4: `tests/test_found_feed_phase4.py` — pgvector ranking order,
  best-similarity merge across LOST items, pagination slices, category +
  text-search filters, ACTIVE-only / exclude-own checks, image gating
  (>0.40 signed URLs, ≤0.40 empty + no object keys), empty feed without
  LOST items.
- Phase 5: `tests/test_items_phase5.py` — generic list gated (403 without
  token), detail visibility (own 200 / other's LOST 404 / other's FOUND
  detail shape / no-LOST 403 `LOST_ITEM_REQUIRED`), `/me` newest-first +
  scoped, creation rejects bad extension / foreign prefix / missing R2
  object / oversize image (stub storage, no network), upload MIME
  allowlist.
- Phase 6: `tests/test_storage_phase6.py` — download-url ownership
  (owner 200 / stranger 404 indistinguishable from missing / anonymous
  401-403), upload-url auth + MIME 422, feed raw JSON contains no
  `object_key`, embeddings routes owner-only, TTL constant.
- Phase 7: `tests/test_geo_phase7.py` — radius keeps nearby / drops far
  and location-less items, `distance_km` accuracy, lat/lon required
  together (400 otherwise).
- Phase 8: `tests/test_verification_phase8.py` — full questionnaire
  flow (fail gibberish → pass grounded → token → 201 → answers linked
  as hashes), pair/answer validation (403/400s), token bound to pair.
- Location reporting: `tests/test_item_location.py` — coordinates
  persist on create, PostGIS `geog` auto-populates
  (`POINT(lng lat)`), NULL without coordinates, out-of-range rejected
  by schema. No backend changes needed: `CreateItemRequest` already
  accepted optional `latitude`/`longitude`.
  Run: `uv run pytest tests/ -q` (27 passed, Oct 2026).
- Test isolation note: the suite runs against the shared dev DB, which
  holds rows from other runs. Feed tests scope to their own rows via a
  uuid embedded in titles (`search=uid`) or assert by created IDs — never
  assume an empty table.

### Phase 4 — FOUND feed production readiness (done, Oct 2026)
- **4.1/4.2** `FoundFeedService.get_feed` no longer loads all FOUND
  embeddings into Python. New `ItemEmbeddingRepository.search_found_candidates`
  runs one pgvector `cosine_distance` top-K query per LOST embedding, then
  the service merges by best similarity per FOUND item
  (`repositories/item_embedding_repository.py`,
  `services/found_feed_service.py`). Per-vector pool is
  `max(100, page * limit)` — exact at dev/test scale, bounded in prod.
  Similarity is `clamp(1 - cosine_distance)` to satisfy the response
  schema's `[0, 1]` range. `get_item_detail` keeps the cheap Python max
  over the user's own LOST vectors (single FOUND row, bounded loop).
- **4.3/4.4/4.8** `GET /items/found/feed` accepts `?page=1&limit=20`
  (limit capped at 100), `?category=` (case-insensitive), `?q=` (ILIKE on
  title/description). Filters apply in SQL per candidate query.
  Decision: response stays a plain list (sliced server-side) so the
  existing frontend `getFoundFeed(): Promise<FoundFeedItem[]>` keeps
  working unchanged.
- **4.5/4.6** Verified in SQL: `status == ACTIVE`, `user_id != caller`,
  in both the new candidate query and the legacy
  `get_active_found_embeddings` / `get_found_embedding_for_user`.
- **4.7** New migration `b81f4c2e9a17` creates
  `ix_item_embeddings_embedding_hnsw` (`USING hnsw ...
  vector_cosine_ops`, `IF NOT EXISTS`) plus `CREATE EXTENSION IF NOT
  EXISTS vector`. Applied with `uv run alembic upgrade head`.

### Phase 5 — Items API cleanup & authorization (done, Oct 2026)
- **5.1** Generic `GET /items` exposed every item with no auth and no
  ownership rules — and the frontend dashboard was calling it. It now
  requires authentication and is marked `deprecated=True`. Clients must
  use `GET /items/me` (own items) or `GET /items/found/feed`
  (discovery); the route is kept temporarily for backward compatibility
  (`api/items.py`, `frontend/lib/items.ts`).
- **5.2** `GET /items/{item_id}` now enforces visibility: own items →
  full `ItemResponse`; someone else's ACTIVE FOUND item → feed/detail
  rules via `FoundFeedService.get_item_detail` (LOST registration
  required → 403 `LOST_ITEM_REQUIRED`, image gated by 40% similarity);
  someone else's LOST items (or non-active) → 404. Response model is
  `ItemResponse | FoundItemDetailResponse` (`api/items.py`).
- **5.3** Verified `GET /items/me` is newest-first
  (`ItemRepository.get_for_user` orders `created_at` desc) + covered by
  test.
- **5.4** Decision: **not adding** `GET /items/found`. No such endpoint
  existed and nothing uses it; an unfiltered FOUND list would re-open
  the exact exposure closed in 5.1. Discovery stays behind
  `GET /items/found/feed` (similarity-gated).
- **5.5/5.6** Item creation now validates `image_keys` server-side
  (`services/item_service.py`, `ValueError` → 400 in the router):
  extension allowlist (jpg/jpeg/png/webp — replaces the old silent
  `application/octet-stream` fallback), `items/` prefix (MVP session
  scoping; full signed session binding deferred to Phase 11.8), R2
  existence via new `StorageService.head_object` (no download), 5 MB cap
  from R2 `ContentLength`, and `image/*` content-type check.
  `POST /storage/upload-url` already allowlists MIME types at the schema
  level (`UploadUrlRequest.content_type` regex → 422). Caveat documented:
  presigned-PUT size cannot be hard-enforced at upload time, so the 5 MB
  cap is enforced authoritatively at item creation instead.

### Phase 6 — Storage authorization (done, Oct 2026)
- **6.1** `POST /storage/download-url` already verified ownership via
  `ItemRepository.get_image_for_user` (ItemImage → Item → user_id);
  verified + covered by test. Missing and not-owned both return 404, so
  the endpoint is not an ownership oracle (`api/storage.py`).
- **6.2** Confirmed the FOUND feed never exposes object keys: both feed
  and detail paths return `FoundFeedImageResponse(id, image_url)` with
  server-generated signed URLs, and only when similarity > 0.40.
  Asserted on the raw feed JSON (`"object_key" not in response.text`).
- **6.3** Closed two enumeration gaps found by audit:
  `POST /storage/upload-url` required no auth (anyone could mint keys) —
  now requires `get_current_user_id`; `/embeddings/*` required no auth
  and `GET .../similar` returned arbitrary items' title/description with
  no ownership check — both routes now require auth + item ownership
  (404 otherwise) and are marked `deprecated` (internal/worker support;
  the ARQ worker calls the service directly and the frontend never calls
  these). Central rule documented on `StorageService`: the class does no
  authorization itself — every signing call site must enforce ownership
  first (`services/storage_service.py`).
- **6.4** TTL centralized as `StorageService.SIGNED_URL_TTL_SECONDS = 300`
  (was two hardcoded `ExpiresIn=300`). Refresh strategy: clients treat
  image URLs as single-use short-lived values and re-request per view —
  the frontend already resolves fresh URLs on every server render
  (item page via `/storage/download-url`, feed per request), and the
  uploader previews from a local blob URL, so no client change was
  needed.

### Stitch screen 1 support (done, Oct 2026)
- `FoundFeedItemResponse` and `FoundItemDetailResponse` gained
  `created_at` (populated from the item) for time-ago labels and
  newest-first sorting. No migration — column already existed.
  Covered by `test_feed_items_carry_created_at`.

### Stitch screen 4 support (done, Oct 2026)
- `MatchItemSummary` grew `description`, `created_at`, `latitude`,
  `longitude`, and optional `image_url` (first photo as a signed URL,
  `None` without photos or without a signing backend). Photo exposure is
  consistent with visibility rules: summaries only ever reach match
  participants through ownership-checked endpoints, and auto-matches
  score ≥ 60% — above the 40% photo gate.
- `MatchService` takes an optional `storage_service` (API layer passes a
  real one; the ARQ worker passes nothing — no signed URLs server-side).
  Covered by `test_enriched_summaries_carry_photos_and_details`.

### Phase 9 — Notifications API hardening (done, Oct 2026)
- **9.1** Verified every notification endpoint is scoped via
  `get_current_user_id`; cross-user reads return 404 (indistinguishable
  from missing). Covered by test.
- **9.2** New `PATCH /notifications/read-all` returning
  `{marked_read}` (single conditional `UPDATE`, idempotent).
- **9.3** `get_unread_count` confirmed as a SQL `COUNT` (no list
  loading); `GET /notifications` gained `?limit=` (default 50, cap 100).
- **9.4** Match-found notification verified wired in the ARQ path:
  `MatchService.find_matches` flushes the match, then the notify's
  single commit persists match + notification atomically (retry-safe via
  `get_existing_match` dedupe). Documented at the call site.
- **9.5** Claim notifications moved inside the transactions:
  `create_manual_claim` / `create_claim` stage the finder notify
  (`commit=False`) before the shared commit, and accept/reject stage the
  claimant notify the same way — replacing the old commit-then-notify
  with swallowed exceptions. Contract change: `ClaimRepository`
  `accept_claim` / `reject_claim` now flush-only; the service owns the
  commit (`tests/test_profile_api.py` updated accordingly — direct
  repository callers must commit).
- Tests: `tests/test_notifications_phase9.py` (scoping, limit, read-all
  counts + idempotency, transactional co-creation on create and accept).

### Stitch screen 6 support (done, Oct 2026)
- `ItemResponse` gained `created_at` (column already existed, exposed
  via `from_attributes`) for "Reported Xm ago" labels. Covered by an
  assertion in `test_item_location.py`. No other backend needed: the
  profile page joins `GET /users/me` + `/items/me` + `/matches` +
  `/claims` client-side.

### Stitch screen 3 support (done, Oct 2026)
- New nullable `items.occurred_at` (migration `e7b3c9d52f41`) for the
  report flow's date/time field; threaded through model,
  `CreateItemRequest`, `ItemService`, and `ItemResponse`. Existing rows
  unaffected. Covered by `test_occurred_at_persists_when_given`.

### Stitch screen 2 support + profile API (done, Oct 2026)
- `FoundItemDetailResponse` gained `latitude`/`longitude` (null when the
  reporter skipped location) for the recovery-area map. Covered by
  `test_detail_carries_coordinates`.
- New `GET /users/me` (`api/users.py`, service
  `services/user_profile_service.py`, schemas `schemas/user.py`)
  returns identity (`id`, `name`, `email`, `member_since`) plus stats:
  `items_lost`, `items_found`, `active_matches` (pending),
  `pending_claims_made`, `pending_claims_received`,
  `successful_returns` (accepted claims where the user is the finder —
  claimant is always the lost owner, so `claimant != me` means finder
  side). Covered by `tests/test_profile_api.py` (auth gate + full
  lifecycle: pending counts flip to a finder return after accept).
  Phase 9 added `tests/test_notifications_phase9.py`.
  Run: `uv run pytest tests/ -q` (35 passed, Oct 2026).

### Phase 7 — Geospatial search, PostGIS (done, Oct 2026)
- **7.1** PostGIS 3.6.4 was available but not installed on Neon —
  verified via `pg_available_extensions`, then enabled with
  `CREATE EXTENSION IF NOT EXISTS postgis` in the migration. No
  Haversine fallback needed.
- **7.2** New migration `c42d8f1b3e55` adds `items.geog`
  (`geography(Point, 4326) GENERATED ALWAYS ... STORED`) derived from
  latitude/longitude via `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`,
  NULL when coordinates are unset — so it is always in sync with zero
  application writes (existing rows backfilled automatically), plus a
  GIST index `ix_items_geog`. The model maps it with
  `geoalchemy2.Geography` + `sqlalchemy.Computed(persisted=True)`
  (`models/item.py`, new `geoalchemy2` dependency).
- **7.3** `ItemEmbeddingRepository.search_found_candidates` accepts an
  optional `(lat, lon, radius_km)` tuple and applies
  `ST_DWithin(geog, reference, radius_m)` in SQL alongside the pgvector
  ordering; it also returns `ST_Distance` meters per row. Similarity
  ranking stays primary — geo is a filter, not a re-ranking.
- **7.4** `GET /items/found/feed` accepts `?latitude=` (`-90..90`),
  `?longitude=` (`-180..180`), `?radius_km=` (default 25, cap 1000).
  lat/lon must come together (400 otherwise); radius alone is ignored
  (unfiltered feed) — deliberate: a radius without a reference point is
  meaningless, and failing open to the unfiltered feed matches the
  endpoint's default behavior.
- **7.5** `FoundFeedItemResponse.distance_km` (`None` without a location
  filter) carries km from the reference point for "X km away" UI.

### Phase 8 — Ownership verification questionnaire (done, Oct 2026)
- **8.1/8.2/8.3** New `claim_questions` (id, unique category, question,
  is_active) and `claim_answers` (claimant, lost/found pair,
  question, SHA-256 `answer_hash`, nullable `claim_id`) tables, plus a
  partial unique index for one pending attempt per claimant/pair/question
  (`alembic d5e9f2c41a88`, seeded with all 7 categories:
  COLOR, MARK, LOCATION, CONTENTS, BRAND, MODEL, PERSONALIZATION).
  Plain-text answers are never stored or returned.
- **8.4/8.5/8.6** New `ClaimVerificationService`
  (`services/claim_verification_service.py`, repository
  `repositories/claim_verification_repository.py`):
  `POST /claims/questions` returns the active set after re-validating the
  pair through `verify_claim_pair` (ownership, types/statuses, 40%
  similarity); `POST /claims/answers` upserts pending answer hashes and
  scores groundedness — the fraction of answers sharing a content token
  with the claimant's own LOST title/description/category. Pass at
  ≥ 0.60 → 15-minute JWT scoped to (user, lost, found).
- **8.7** `POST /claims/` requires `verification_token`
  (`StartClaimRequest`); missing → 422, invalid/expired/mismatched → 403.
  Passing answers are linked to the created claim for audit. The gate
  lives at the router: service-level `create_manual_claim` is unchanged,
  so Phase 2 transaction tests still pass unmodified.
- **Honest scope (8.8):** questions target report details, not
  photo-visible facts, but the automated check is commitment + friction,
  NOT proof of ownership — a reporter can always echo their own report.
  The finder's accept/reject review remains decisive; hashes keep answers
  out of plaintext storage for the future finder-visible or LLM-judged
  step.
