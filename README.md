# Pickleball Match Journal

Offline-first journal app for singles and doubles pickleball matches with auto-derived standings, player profiles, weekly snapshots, and shareable match cards.

## Run locally

```bash
npm install
npm run dev
```

Then open the printed URL (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Storage model

- Local database: IndexedDB (`pickleball-match-journal`) via `idb`
- Stores:
  - `players`
  - `matches`
  - `meta` (includes `lastBackupAt`)
- Schema version is stored in exported JSON (`schemaVersion: 1`)
- Source of truth is always match history; aggregate totals are derived at runtime

## Journal behavior and aggregation

- Match status can be `Completed` or `Not completed`
- Only `Completed` matches count in standings/profile totals by default
- Winner resolution:
  - derive from set winners
  - if set winner counts tie, use explicit `matchWinnerSide`
- Singles and doubles are both supported
- For doubles, each teammate gets the same match W/L and set W/L attribution
- Standings sort: SD desc, W desc, MP desc, alphabetical

## Import/Export

- `Export JSON` downloads full data snapshot (`players + matches + schemaVersion`)
- App updates visible `Last backup` timestamp after export
- `Import JSON` validates schema and supports:
  - Merge (dedupe by id)
  - Overwrite (replace all local data)

## Tests

Playwright key flows:

```bash
npx playwright install chromium
npm run test:e2e
```

Covered flows:
- inline player creation
- completed singles match updates standings
- doubles match updates all four players
- not-completed match excluded from standings
- player tap opens profile
- date chip navigation + today jump
- export/import round-trip

## GitHub Pages deployment

This project is Vite-based and uses `base: './'` in `vite.config.ts` for static hosting portability.

1. Build artifacts:
```bash
npm run build
```
2. Publish `dist/` to GitHub Pages (for example with `gh-pages` branch or GitHub Action).
3. If using GitHub Actions, deploy `dist` as the Pages artifact.

Example manual deploy flow:
- create `gh-pages` branch
- copy contents of `dist/` to that branch root
- push and set Pages source to `gh-pages`

## Architecture snapshot

- Routing and shell: `src/App.tsx`
- IndexedDB and seed data: `src/db.ts`
- App state + CRUD + import/export: `src/state/AppDataContext.tsx`
- Aggregation engine (standings/profile/weekly): `src/utils/stats.ts`
- Main screens:
  - `src/screens/MatchesScreen.tsx`
  - `src/screens/StandingsScreen.tsx`
  - `src/screens/MatchEditorScreen.tsx`
  - `src/screens/MatchDetailScreen.tsx`
  - `src/screens/PlayerProfileScreen.tsx`

## Future extensions (seasons/tournaments)

Recommended additive model:

- Add `seasonId` and `tournamentId` optional fields to `Match`
- Introduce `Season` / `Tournament` entities with metadata and active filters
- Keep stats derivation pure by passing filtered match sets into existing `compute*` functions
- Support archive views by date + season filters without mutating source data
