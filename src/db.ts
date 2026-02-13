import { openDB } from 'idb';
import type { AppMeta, Match, Player, StoredData } from './types';
import { toISODate } from './utils/date';

const DB_NAME = 'pickleball-match-journal';
const DB_VERSION = 1;
const META_KEY = 'app-meta';
const SCHEMA_VERSION = 1;

type StoreName = 'players' | 'matches' | 'meta';

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('players')) {
      db.createObjectStore('players', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('matches')) {
      db.createObjectStore('matches', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('meta')) {
      db.createObjectStore('meta');
    }
  }
});

const colors = ['#16a34a', '#0284c7', '#ea580c', '#4f46e5', '#ef4444', '#0f766e'];

const makeId = () => crypto.randomUUID();

export const createPlayerDraft = (name: string, favoriteTennisPlayer?: string): Player => ({
  id: makeId(),
  name,
  createdAt: new Date().toISOString(),
  avatarColor: colors[Math.floor(Math.random() * colors.length)],
  favoriteTennisPlayer: favoriteTennisPlayer?.trim() || undefined
});

export const createInitialSeed = (): StoredData => {
  const now = new Date().toISOString();
  const today = toISODate(new Date());

  const players = ['Ari', 'Blake', 'Casey', 'Dev'].map((name) => ({
    id: makeId(),
    name,
    createdAt: now,
    avatarColor: colors[Math.floor(Math.random() * colors.length)]
  }));

  return {
    schemaVersion: SCHEMA_VERSION,
    players,
    matches: [
      {
        id: makeId(),
        date: today,
        status: 'Completed',
        format: 'Singles',
        sides: { A: [players[0].id], B: [players[1].id] },
        setCount: 3,
        sets: [
          { scoreA: 11, scoreB: 8, winnerSide: 'A' },
          { scoreA: 9, scoreB: 11, winnerSide: 'B' },
          { scoreA: 11, scoreB: 7, winnerSide: 'A' }
        ],
        notes: 'Warm-up match',
        createdAt: now,
        updatedAt: now
      },
      {
        id: makeId(),
        date: today,
        status: 'Completed',
        format: 'Doubles',
        sides: { A: [players[0].id, players[2].id], B: [players[1].id, players[3].id] },
        setCount: 3,
        sets: [
          { scoreA: 11, scoreB: 4, winnerSide: 'A' },
          { scoreA: 11, scoreB: 9, winnerSide: 'A' }
        ],
        createdAt: now,
        updatedAt: now
      }
    ]
  };
};

const readAll = async <T>(storeName: StoreName): Promise<T[]> => {
  const db = await dbPromise;
  return db.getAll(storeName) as Promise<T[]>;
};

export const loadData = async (): Promise<{ players: Player[]; matches: Match[]; meta: AppMeta }> => {
  const [players, matches] = await Promise.all([readAll<Player>('players'), readAll<Match>('matches')]);
  const db = await dbPromise;
  const meta = ((await db.get('meta', META_KEY)) as AppMeta | undefined) ?? {};

  if (players.length || matches.length) {
    return { players, matches, meta };
  }

  // Keep production clean: no auto-demo data on first load in deployed app.
  if (!import.meta.env.DEV) {
    await db.put('meta', meta, META_KEY);
    return { players: [], matches: [], meta };
  }

  const seed = createInitialSeed();
  const tx = db.transaction(['players', 'matches', 'meta'], 'readwrite');
  await Promise.all([
    ...seed.players.map((p) => tx.objectStore('players').put(p)),
    ...seed.matches.map((m) => tx.objectStore('matches').put(m)),
    tx.objectStore('meta').put({}, META_KEY),
    tx.done
  ]);

  return { players: seed.players, matches: seed.matches, meta: {} };
};

export const savePlayer = async (player: Player): Promise<void> => {
  const db = await dbPromise;
  await db.put('players', player);
};

export const saveMatch = async (match: Match): Promise<void> => {
  const db = await dbPromise;
  await db.put('matches', match);
};

export const deleteMatchById = async (id: string): Promise<void> => {
  const db = await dbPromise;
  await db.delete('matches', id);
};

export const deletePlayerById = async (id: string): Promise<void> => {
  const db = await dbPromise;
  await db.delete('players', id);
};

export const replaceAllData = async (data: StoredData): Promise<void> => {
  const db = await dbPromise;
  const tx = db.transaction(['players', 'matches'], 'readwrite');
  await tx.objectStore('players').clear();
  await tx.objectStore('matches').clear();
  await Promise.all([
    ...data.players.map((p) => tx.objectStore('players').put(p)),
    ...data.matches.map((m) => tx.objectStore('matches').put(m)),
    tx.done
  ]);
};

export const setMeta = async (meta: AppMeta): Promise<void> => {
  const db = await dbPromise;
  await db.put('meta', meta, META_KEY);
};
