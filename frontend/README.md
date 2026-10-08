# Lost & Found — Frontend (Next.js + Auth.js bridge)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Decision & Change Log (mirror of backend implementation_plan.md)

### Redesign / theme (done, Oct 2026)
- Fonts: Geist → `Fraunces` (`--font-fraunces`) + `Manrope` (`--font-manrope`)
  (`app/layout.tsx`); `--font-sans` / `--font-display` wired in `@theme inline`
  (`app/globals.css`).
- Dark ink/ivory/teal theme tokens in `:root` + `.dark`; sidebar/chart tokens
  retained so shadcn refs don't break.
- New layout primitives: `components/layout/page-shell.tsx`,
  `page-header.tsx`, `empty-state.tsx`; UI primitives:
  `components/ui/link-button.tsx` (Base-UI `render={<Link/>}` pattern —
  `asChild` does not exist on this Button), `form-field.tsx`, `form-error.tsx`.
- Item UI rebuilt around `item-card-layout.tsx` / `item-grid.tsx` /
  `item-image.tsx` / `item-type-toggle.tsx` / `detail-section.tsx`; pages
  `dashboard`, `found`, `items/new`, `items/[itemId]` wrapped in `PageShell`.
- Import rule: types live in `@/types/items` (plural), not `@/types/item`.

### `asChild` cleanup (done, Oct 2026)
- Removed all 5 `asChild` usages (React DOM warning) in
  `app/found/[itemId]/page.tsx`, `app/found/[itemId]/error.tsx`,
  `app/found/[itemId]/claim/page.tsx`; replaced with `LinkButton`.

### Phase 3 — Matches API cleanup (backend-only, Oct 2026)
- No frontend changes required: no `/matches` UI route exists yet.
- When a matches UI is built, use the new backend contracts:
  `GET /matches` → `MatchResponse[]` and `GET /matches/{id}` →
  `MatchResponse`, both already including `lost_item` / `found_item`
  summaries. Auth via the existing server-side backend-JWT bridge.

### Phase 4 — FOUND feed production readiness (backend-only, Oct 2026)
- No frontend changes required: `GET /items/found/feed` still returns
  `FoundFeedItem[]`, so `lib/found.ts` is untouched.
- New optional query params are available when the feed UI wants them:
  `?page=` / `?limit=` (pagination), `?category=` (filter), `?q=` (text
  search). Extend `getFoundFeed` with these params at that point.

### Phase 5 — Items API cleanup (frontend fix, Oct 2026)
- **Bug fix:** `getMyItems()` in `lib/items.ts` called the generic
  `GET /items`, so the dashboard (and the claim flow's `getMyLostItems`)
  received *everyone's* items and filtered client-side. It now calls
  `GET /items/me` (scoped, newest-first). This was the client half of the
  backend 5.1 exposure; the backend generic list now also requires auth
  and is deprecated.
- No UI changes: `ItemCard` / `ItemDetails` shapes for own items are
  unchanged. Note `GET /items/{id}` can now return a found-item *detail*
  shape (with `similarity_score`) for other users' FOUND items — the item
  page only links own items, so no handling was added.

### Phase 6 — Storage authorization (backend-only, Oct 2026)
- No frontend changes required. Expiry handling verified: the item page
  resolves fresh download URLs server-side on every navigation
  (`getItemImageUrl` per image), the feed carries per-request signed URLs,
  and the uploader previews from a local blob URL — none of these cache
  a URL past its 300s TTL (`StorageService.SIGNED_URL_TTL_SECONDS`).
- Rule for future work: never persist an `image_url` (feed/detail/download
  responses) in client state; always re-request per view.

### Phase 7 — Geospatial search (type-only, Oct 2026)
- `types/found.ts` gained `distance_km: number | null` to match the new
  backend field — render as "X km away" when non-null, hide otherwise.
- New backend params `?latitude=&longitude=&radius_km=` are not wired
  into `getFoundFeed` yet; extend it (e.g. from `navigator.geolocation`,
  with user consent) when the nearby-filter UI is built.

### Stitch screen 1 — home/discover feed (done, Oct 2026)
- Source: `stitch_lost_found_mobile_ui/1._home_discover_feed/` (code.html + screen.png).
- `FoundItemCard` rebuilt to the design: FOUND pill, match-% overlay on the photo, category caps, serif title, time-ago + circular arrow action; low-match cards show the lock state with "Private" label and shield action instead of a photo.
- `/found` rebuilt: sticky debounced search (`?q=`), category chips, "Near me" row (geolocation → `?latitude=&longitude=&radius_km=5` with live-radar indicator, tap again to clear), "Recent discoveries (N)" header, Best match/Newest sort toggle, report CTA banner. Filters travel in the URL (shareable, server-rendered); sort is server-side.
- Mobile chrome: `MobileHeader` (brand + bell + avatar, `md:hidden`) and `BottomTabBar` (Home/Search/+Report/Matches/Profile with active state, center teal FAB). Desktop `Navbar` is now desktop-only. Bell → `/matches`, avatar → `/profile` — those pages land with Stitch screens 4 and 6.
- New `lib/format.ts` `timeAgo()` helper.
- Deviation noted: banner button reads "Report item" (links to `/items/new`) instead of the mock's "Post Alert" — no anonymous-broadcast feature exists.

### Stitch screen 3 — report wizard (done, Oct 2026)
- Source: `stitch_lost_found_mobile_ui/3._report_item_flow/`.
- `ItemForm` is now a 3-step wizard with segmented progress bar, step
  labels, cancel (X → dashboard), and Back/Edit navigation: 1 Recovery
  type (big toggle) → 2 Item telemetry (type summary card with Edit,
  title, category **dropdown** of fixed options, optional date/time
  labeled by type, details textarea, multi-photo uploader) → 3 Pin
  location (map + submit). Per-step `<form>` gates Continue on native
  validation; submit behavior/redirect unchanged.
- `ImageUploader` rewritten for up to 5 photos (backend `image_keys`
  limit): dashed drop box, thumbnail grid with per-photo remove,
  "Add more" tile, parallel uploads, per-file type/size errors.
- New optional `occurred_at` (`datetime-local` → UTC ISO): backend
  migration `e7b3c9d52f41`, model/schema/service passthrough, shown on
  own-item detail as "Lost on / Found on". Tested persisting + null.
- Deviations: no "Report #LF-xxxx / radar scanning" status toast (no
  draft-ID concept — submit spinner instead); category is a fixed
  dropdown while the backend still accepts any string.

### Phase 9 — notification bell flow (done, Oct 2026)
- Both headers (mobile + desktop navbar) render a `NotificationBell`:
  red dot only when the server-reported unread count > 0, dropdown
  panel listing unread notifications (title, message, time), red-dot
  items, empty state ("You're all caught up"), and "Mark all read".
- Clicking a notification marks it read, then deep-links to
  `/matches?match=<match_id>` — every notification type carries a
  `match_id` (claim updates included), and the matches page follows the
  linked match's status to the right tab with it preselected.
- New client-safe `lib/notifications.ts` + server-only
  `lib/notifications-server.ts` (fetch-layer split, same hygiene as
  screen 6) with four proxy routes (`GET /api/notifications`,
  `GET .../unread-count`, `PATCH .../[id]/read`, `PATCH .../read-all`).
  Bell revalidates on open; first paint uses the server snapshot.

### Stitch screen 6 — profile (done, Oct 2026)
- Source: `stitch_lost_found_mobile_ui/6._user_profile_reports/`.
- New `/profile` page (tab bar + avatars already pointed here): header
  with avatar, handle (email prefix), member-since, and a "Google
  verified account" badge; stat cards Reported / Found / Reunited from
  `GET /users/me`; tabs for My Active Reports (count) and Claim History
  (count).
- Report cards reuse the photo-first pattern with type pills: real
  per-item match context joined client-side from `GET /matches` +
  `GET /claims` (no new backend needed) — best-match banner + "Review N
  Potential Matches" for lost reports, red "Action needed" banner +
  "Review claim" for finds with incoming pending claims, pending-review
  note for outgoing claims, honest status + "Reported Xm ago" lines
  (`ItemResponse.created_at` added for this — zero-logic field).
- Claim history rows show role (made/received), found-item title via the
  match join, status pill, and time. Sign out uses the existing server
  action; footer is neutral (no invented version number).
- Deviations: no handle/location line beyond the email prefix (no user
  location stored), no "verified citizen" tier (no such system), no
  settings rows (no notification/privacy backends — omitted rather than
  dead buttons).
- Fetch-layer hygiene fix: `updateMatchStatus` moved from `lib/matches`
  (server-only `backendFetch`) to client-safe `lib/claims`; new
  `lib/claims-server.ts` holds server-only `getClaims`; `types/claim.ts`
  added. This closed a latent client-bundle bug from screen 4.

### Stitch screen 5 — verify wizard (done, Oct 2026)
- Source: `stitch_lost_found_mobile_ui/5._verify_ownership_wizard/`.
- Claim verify page rebuilt Duolingo-style: "Question N of 7" + answered-%
  progress bar, "Verification Step N" badge, big serif question, answer
  box with live char counter, Back (per-step, answers preserved) and
  Continue gating on non-empty answers; final step submits all answers,
  then creates the claim with the token.
- Success bottom sheet: score pill, serif title, real verification %,
  `Claim Receipt #<claim.id>` ("Answers sealed as hashes only"),
  primary action back to My Items + Dismiss revealing a success panel.
- Honesty deviations: security copy rewritten — no "matched against the
  finder's sealed notes" (our check is groundedness vs your own report;
  finder holds no sealed notes), no finder name in success copy
  (anonymous by design), "Track Claim in My Claims" points to
  `/dashboard` (no claims-tracker page exists yet).

### Stitch screen 4 — matches inbox (done, Oct 2026)
- Source: `stitch_lost_found_mobile_ui/4._matches_comparison/`.
- New `/matches` page (the tab bar and bell already pointed here):
  Unresolved/Reviewed/Archived tabs (`?tab=`, counts, pending pill),
  "Detected matches" header with active-sync indicator, a featured
  side-by-side comparison (score header, `Match #id`, both photos with
  type pills + time chips, honest match-signal rows — visual %,
  category same/different, haversine distance or "No location" —
  instead of the mock's invented attribute claims), Confirm & Request /
  Not a Match actions (lost owner only, otherwise an explanatory note),
  and an incoming queue where tapping a row swaps the featured card.
- New `lib/matches.ts` (`getMatches` via `backendFetch`,
  `updateMatchStatus` via `app/api/matches/[matchId]/status` PATCH
  proxy) + `lib/geo.ts` haversine + `types/match.ts`.
- LOST pill stays teal per `design.md` (the mock shows it red).
- No separate match-detail route: queue selection happens in-page.

### Stitch screen 2 — found-item detail (done, Oct 2026)
- Source: `stitch_lost_found_mobile_ui/2._item_detail_view/`.
- `/found/[itemId]` rebuilt: item-log utility bar (`Item Log #id`) with a
  working share button (Web Share API, clipboard fallback — no bookmark
  button, no watchlist backend), swipeable photo gallery with dots +
  counter (`components/found/photo-gallery.tsx`), match banner tiered by
  score (≥70% "High probability match", else "Possible match"), FOUND
  pill + "Found Xm ago", serif title, 2×2 attribute grid (all real data:
  Category, Reported, Match %, Claimable/Locked), Detailed notes (lock
  disclaimer only when the photo is hidden), Recovery area mini-map with
  coordinates (section hidden without location), anonymous finder card,
  protocol footer, and a sticky bottom CTA ("Step 1 of 2: Proof match"
  + Claim button, or an honest not-eligible state).
- Honesty deviations from the mock (all deliberate): no fabricated
  color/brand/cue attributes (we don't store them), no finder name or
  address (privacy by design — reporter stays anonymous until a claim is
  accepted), no bookmark button.
- New `lib/users.ts` `getUserProfile()` fetcher against `GET /users/me`
  (renders in screen 6); `FoundItemDetail` type gained `latitude` /
  `longitude`.

### Responsive navbar (done, Oct 2026)
- Global `Navbar` (server component, in `RootLayout`) with logo/home,
  My items, Found items, and a Report item button. Desktop shows links
  inline; mobile gets a hamburger toggling a dropdown panel
  (`navbar-mobile-menu.tsx`, lucide Menu/X).
- Auth-aware via `auth()`: signed-in users see avatar + name and a
  Sign out button; signed-out users see Sign in. Both use server
  actions (`components/auth/actions.ts` → Google provider).

### Location reporting with map pin (done, Oct 2026)
- Report form (`ItemForm`) has an "Add location" button revealing a
  Leaflet/OpenStreetMap picker (`components/items/location-picker.tsx`,
  `leaflet` + `react-leaflet`, no API key): tap to drop a pin, drag to
  move it, "Use my live location" via `navigator.geolocation`
  (permission-denied and unavailable states handled), "Remove location"
  to clear. Coordinates ride the existing `POST /items`
  `latitude`/`longitude` fields (backend range-validates them).
- Leaflet needs `window`, so both maps load via `next/dynamic` with
  `ssr: false` and loading skeletons. Item detail shows a read-only
  mini-map (`location-mini-map.tsx`, all interaction disabled) above the
  coordinate text. Tiles/attribution: OpenStreetMap.
- Follow-up when wanted: a "near me" feed filter using `?latitude=`
  `&longitude=&radius_km=` (backend ready, `distance_km` typed).

### Phase 8 — Ownership questionnaire UI (done, Oct 2026)
- The claim verify page (`/found/[itemId]/claim/verify?lostItemId=`)
  finally implements its placeholder copy: after pair verification it
  loads `POST /api/claims/questions`, renders one textarea per question,
  submits to `/api/claims/answers`, and on pass creates the claim via
  `POST /api/claims` with the returned `verification_token`. Failures
  show the score and allow retry; success links back to `/dashboard`
  (no `/claims` page exists yet — success copy says the finder is
  notified, which the backend does via `notify_claim_created`).
- New `lib/claims.ts` helpers (`getClaimQuestions`,
  `submitClaimAnswers`, `createClaim`) + proxy routes
  `app/api/claims/questions|answers|route.ts` following the existing
  `backendFetch` pattern.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
