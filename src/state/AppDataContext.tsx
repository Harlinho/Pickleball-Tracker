import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';
import {
  createPlayerDraft,
  deleteMatchById,
  deletePlayerById,
  loadData,
  replaceAllData,
  saveMatch,
  savePlayer,
  setMeta
} from '../db';
import type { AppMeta, Match, Player, StoredData } from '../types';

interface DataContextValue {
  players: Player[];
  matches: Match[];
  meta: AppMeta;
  loading: boolean;
  createPlayer: (input: string | { name: string; favoriteTennisPlayer?: string }) => Promise<Player>;
  renamePlayer: (id: string, name: string) => Promise<void>;
  updatePlayerProfile: (
    id: string,
    updates: { name: string; favoriteTennisPlayer?: string }
  ) => Promise<void>;
  updatePlayerColor: (id: string, color: string) => Promise<void>;
  mergePlayer: (fromId: string, toId: string) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  saveMatchRecord: (match: Match) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  importData: (data: StoredData, mode: 'overwrite' | 'merge') => Promise<void>;
  exportData: () => Promise<StoredData>;
  updateLastBackup: () => Promise<void>;
  reload: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);
const SCHEMA_VERSION = 1;

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
  const map = new Map<string, T>();
  items.forEach((item) => map.set(item.id, item));
  return [...map.values()];
};

export const AppDataProvider = ({ children }: PropsWithChildren) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [meta, setMetaState] = useState<AppMeta>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await loadData();
    setPlayers(data.players);
    setMatches(data.matches);
    setMetaState(data.meta);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createPlayer = useCallback(async (input: string | { name: string; favoriteTennisPlayer?: string }) => {
    const payload = typeof input === 'string' ? { name: input } : input;
    const trimmed = payload.name.trim();
    if (!trimmed) {
      throw new Error('Player name is required');
    }
    const player = createPlayerDraft(trimmed, payload.favoriteTennisPlayer);
    await savePlayer(player);
    setPlayers((prev) => [...prev, player]);
    return player;
  }, []);

  const renamePlayer = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const target = players.find((p) => p.id === id);
      if (!target) return;
      const updated = { ...target, name: trimmed };
      await savePlayer(updated);
      setPlayers((prev) => prev.map((p) => (p.id === id ? updated : p)));
    },
    [players]
  );

  const updatePlayerProfile = useCallback(
    async (id: string, updates: { name: string; favoriteTennisPlayer?: string }) => {
      const target = players.find((p) => p.id === id);
      if (!target) return;
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        throw new Error('Player name is required');
      }
      const nextFavorite = updates.favoriteTennisPlayer?.trim() || undefined;
      const updated = { ...target, name: trimmedName, favoriteTennisPlayer: nextFavorite };
      await savePlayer(updated);
      setPlayers((prev) => prev.map((p) => (p.id === id ? updated : p)));
    },
    [players]
  );

  const updatePlayerColor = useCallback(
    async (id: string, color: string) => {
      const target = players.find((p) => p.id === id);
      if (!target) return;
      const updated = { ...target, avatarColor: color };
      await savePlayer(updated);
      setPlayers((prev) => prev.map((p) => (p.id === id ? updated : p)));
    },
    [players]
  );

  const mergePlayer = useCallback(
    async (fromId: string, toId: string) => {
      if (fromId === toId) return;
      const rewritten = matches.map((match) => ({
        ...match,
        sides: {
          A: match.sides.A.map((id) => (id === fromId ? toId : id)),
          B: match.sides.B.map((id) => (id === fromId ? toId : id))
        },
        updatedAt: new Date().toISOString()
      }));
      await Promise.all(rewritten.map((match) => saveMatch(match)));
      await deletePlayerById(fromId);
      setMatches(rewritten);
      setPlayers((prev) => prev.filter((p) => p.id !== fromId));
    },
    [matches]
  );

  const deletePlayer = useCallback(
    async (id: string) => {
      const referenced = matches.some((m) => m.sides.A.includes(id) || m.sides.B.includes(id));
      if (referenced) {
        throw new Error('Player is referenced in match history. Merge player before deletion.');
      }
      await deletePlayerById(id);
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    },
    [matches]
  );

  const saveMatchRecord = useCallback(async (match: Match) => {
    await saveMatch(match);
    setMatches((prev) => {
      const has = prev.some((m) => m.id === match.id);
      return has ? prev.map((m) => (m.id === match.id ? match : m)) : [...prev, match];
    });
  }, []);

  const deleteMatch = useCallback(async (id: string) => {
    await deleteMatchById(id);
    setMatches((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const importData = useCallback(
    async (data: StoredData, mode: 'overwrite' | 'merge') => {
      if (data.schemaVersion !== SCHEMA_VERSION) {
        throw new Error(`Unsupported schema version: ${data.schemaVersion}`);
      }
      if (mode === 'overwrite') {
        await replaceAllData(data);
        setPlayers(data.players);
        setMatches(data.matches);
        return;
      }

      const mergedPlayers = dedupeById([...players, ...data.players]);
      const mergedMatches = dedupeById([...matches, ...data.matches]);
      await replaceAllData({ schemaVersion: SCHEMA_VERSION, players: mergedPlayers, matches: mergedMatches });
      setPlayers(mergedPlayers);
      setMatches(mergedMatches);
    },
    [matches, players]
  );

  const exportData = useCallback(async (): Promise<StoredData> => ({ schemaVersion: SCHEMA_VERSION, players, matches }), [
    matches,
    players
  ]);

  const updateLastBackup = useCallback(async () => {
    const nextMeta = { ...meta, lastBackupAt: new Date().toISOString() };
    await setMeta(nextMeta);
    setMetaState(nextMeta);
  }, [meta]);

  const value = useMemo(
    () => ({
      players,
      matches,
      meta,
      loading,
      createPlayer,
      renamePlayer,
      updatePlayerProfile,
      updatePlayerColor,
      mergePlayer,
      deletePlayer,
      saveMatchRecord,
      deleteMatch,
      importData,
      exportData,
      updateLastBackup,
      reload
    }),
    [
      players,
      matches,
      meta,
      loading,
      createPlayer,
      renamePlayer,
      updatePlayerProfile,
      updatePlayerColor,
      mergePlayer,
      deletePlayer,
      saveMatchRecord,
      deleteMatch,
      importData,
      exportData,
      updateLastBackup,
      reload
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useAppData = (): DataContextValue => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
};
