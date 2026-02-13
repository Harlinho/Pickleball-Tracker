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

Target repo and URL:
- Repo: `https://github.com/Harlinho/Pickleball-Tracker`
- Site: `https://harlinho.github.io/Pickleball-Tracker/`

This project is configured for a GitHub Pages project site subpath:
- Vite base path in `vite.config.ts`: `/Pickleball-Tracker/`
- Router basename in `src/main.tsx`: `import.meta.env.BASE_URL`

### One-time GitHub setup

1. Push this project to the `main` branch of `Harlinho/Pickleball-Tracker`.
2. In GitHub, open:
   - `Settings` → `Pages`
3. Under **Build and deployment**:
   - **Source**: select `GitHub Actions`
4. In `Settings` → `Actions` → `General`, ensure workflow permissions allow Pages deployment:
   - `Read and write permissions` (or at minimum Pages deploy permissions).

### Deploy workflow

Workflow file:
- `.github/workflows/deploy-pages.yml`

What it does:
1. Runs on push to `main` (and manual `workflow_dispatch`)
2. Installs dependencies with `npm ci`
3. Builds with `npm run build`
4. Copies `dist/index.html` to `dist/404.html` (SPA refresh/deep-link fallback on Pages)
5. Uploads `dist/` as Pages artifact
6. Deploys with `actions/deploy-pages`

### Local verification before push

```bash
npm install
npm run build
```

If build succeeds, push to `main` and GitHub Actions will deploy automatically.

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
