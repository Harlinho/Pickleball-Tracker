import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from 'react';
import { GROUP_ID } from '../constants';
import { realtimeEndpoint, supabase } from '../supabaseClient';
import type { AppMeta, Match, Player, StoredData } from '../types';

interface DataContextValue {
  players: Player[];
  matches: Match[];
  meta: AppMeta;
  loading: boolean;
  syncStatus: 'online' | 'syncing' | 'offline' | 'error';
  lastSyncedAt?: string;
  syncError?: string;
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
const PLAYER_COLORS = ['#16a34a', '#0284c7', '#ea580c', '#4f46e5', '#ef4444', '#0f766e'];

interface PlayerRow {
  id: string;
  group_id: string;
  name: string;
  avatar_color: string | null;
  favorite_tennis_player: string | null;
  created_at: string;
  updated_at: string;
}

interface MatchRow {
  id: string;
  group_id: string;
  match_date: string;
  status: Match['status'];
  format: Match['format'];
  participants: unknown;
  set_count: number;
  sets: unknown;
  match_winner_side: Match['matchWinnerSide'] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type RealtimePayloadGroup = {
  new?: { group_id?: string | null; id?: string | null };
  old?: { group_id?: string | null; id?: string | null };
};

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
  const map = new Map<string, T>();
  items.forEach((item) => map.set(item.id, item));
  return [...map.values()];
};

const ensureSides = (participants: unknown): { A: string[]; B: string[] } => {
  if (!participants || typeof participants !== 'object') {
    return { A: [], B: [] };
  }
  const raw = participants as { A?: unknown; B?: unknown };
  return {
    A: Array.isArray(raw.A) ? raw.A.filter((v): v is string => typeof v === 'string') : [],
    B: Array.isArray(raw.B) ? raw.B.filter((v): v is string => typeof v === 'string') : []
  };
};

const ensureSets = (sets: unknown): Match['sets'] =>
  Array.isArray(sets)
    ? sets
        .filter((entry): entry is Match['sets'][number] => typeof entry === 'object' && entry !== null)
        .map((entry) => ({
          scoreA: typeof entry.scoreA === 'number' ? entry.scoreA : undefined,
          scoreB: typeof entry.scoreB === 'number' ? entry.scoreB : undefined,
          winnerSide: entry.winnerSide === 'A' || entry.winnerSide === 'B' ? entry.winnerSide : undefined,
          note: typeof entry.note === 'string' ? entry.note : undefined
        }))
    : [];

const rowToPlayer = (row: PlayerRow): Player => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  avatarColor: row.avatar_color ?? undefined,
  favoriteTennisPlayer: row.favorite_tennis_player ?? undefined
});

const rowToMatch = (row: MatchRow): Match => ({
  id: row.id,
  date: row.match_date,
  status: row.status,
  format: row.format,
  sides: ensureSides(row.participants),
  setCount: row.set_count,
  sets: ensureSets(row.sets),
  matchWinnerSide: row.match_winner_side ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const toPlayerRow = (player: Player) => ({
  id: player.id,
  group_id: GROUP_ID,
  name: player.name,
  avatar_color: player.avatarColor ?? null,
  favorite_tennis_player: player.favoriteTennisPlayer ?? null,
  created_at: player.createdAt
});

const toMatchRow = (match: Match) => ({
  id: match.id,
  group_id: GROUP_ID,
  match_date: match.date,
  status: match.status,
  format: match.format,
  participants: match.sides,
  set_count: match.setCount,
  sets: match.sets,
  match_winner_side: match.matchWinnerSide ?? null,
  notes: match.notes ?? null,
  created_at: match.createdAt,
  updated_at: match.updatedAt
});

const createPlayerRecord = (name: string, favoriteTennisPlayer?: string): Player => ({
  id: crypto.randomUUID(),
  name,
  createdAt: new Date().toISOString(),
  avatarColor: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)],
  favoriteTennisPlayer: favoriteTennisPlayer?.trim() || undefined
});

const payloadGroupId = (payload: unknown): string | undefined => {
  const typed = payload as RealtimePayloadGroup;
  return typed.new?.group_id ?? typed.old?.group_id ?? undefined;
};

const payloadRowId = (payload: unknown): string | undefined => {
  const typed = payload as RealtimePayloadGroup;
  return typed.new?.id ?? typed.old?.id ?? undefined;
};

export const AppDataProvider = ({ children }: PropsWithChildren) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [meta, setMetaState] = useState<AppMeta>({});
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'online' | 'syncing' | 'offline' | 'error'>('syncing');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(undefined);
  const [syncError, setSyncError] = useState<string | undefined>(undefined);
  const refreshInFlightRef = useRef(false);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setSyncStatus('syncing');
    setSyncError(undefined);
    if (!silent) {
      setLoading(true);
    }
    try {
      const [playersRes, matchesRes] = await Promise.all([
        supabase
          .from('players')
          .select('*')
          .eq('group_id', GROUP_ID)
          .order('created_at', { ascending: true }),
        supabase
          .from('matches')
          .select('*')
          .eq('group_id', GROUP_ID)
          .order('match_date', { ascending: false })
          .order('created_at', { ascending: false })
      ]);

      if (playersRes.error) throw playersRes.error;
      if (matchesRes.error) throw matchesRes.error;

      setPlayers(((playersRes.data ?? []) as PlayerRow[]).map(rowToPlayer));
      setMatches(((matchesRes.data ?? []) as MatchRow[]).map(rowToMatch));
      setSyncStatus(navigator.onLine ? 'online' : 'offline');
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      console.error('[Data] Failed to load from Supabase:', error);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      setSyncError((error as Error)?.message ?? 'Unable to sync right now.');
    } finally {
      refreshInFlightRef.current = false;
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const playersChannelName = `group-players-sync-${GROUP_ID}`;
    const matchesChannelName = `group-matches-sync-${GROUP_ID}`;
    console.info('[Realtime] Creating channel:', playersChannelName);
    console.info('[Realtime] Creating channel:', matchesChannelName);
    console.info('[Realtime] Endpoint:', realtimeEndpoint);

    const playersChannel = supabase
      .channel(playersChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players'
        },
        (payload) => {
          const changedGroupId = payloadGroupId(payload);
          console.info('[Realtime] players change:', payload.eventType, {
            group_id: changedGroupId,
            id: payloadRowId(payload)
          });
          if (changedGroupId !== GROUP_ID) {
            return;
          }
          void reload({ silent: true });
        }
      )
      .subscribe((status, error) => {
        switch (status) {
          case 'SUBSCRIBED':
            console.info('[Realtime] SUBSCRIBED:', playersChannelName);
            break;
          case 'TIMED_OUT':
            console.warn('[Realtime] TIMED_OUT:', playersChannelName);
            break;
          case 'CLOSED':
            console.warn('[Realtime] CLOSED:', playersChannelName);
            break;
          case 'CHANNEL_ERROR':
            console.error('[Realtime] CHANNEL_ERROR:', playersChannelName, error);
            break;
          default:
            console.debug('[Realtime] status:', status, playersChannelName);
        }

        if (error) {
          console.error('[Realtime] subscribe() returned error:', playersChannelName, error);
        }
      });

    const matchesChannel = supabase
      .channel(matchesChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `group_id=eq.${GROUP_ID}`
        },
        (payload) => {
          console.info('[Realtime] matches change:', payload.eventType, payload);
          void reload({ silent: true });
        }
      )
      .subscribe((status, error) => {
        switch (status) {
          case 'SUBSCRIBED':
            console.info('[Realtime] SUBSCRIBED:', matchesChannelName);
            break;
          case 'TIMED_OUT':
            console.warn('[Realtime] TIMED_OUT:', matchesChannelName);
            break;
          case 'CLOSED':
            console.warn('[Realtime] CLOSED:', matchesChannelName);
            break;
          case 'CHANNEL_ERROR':
            console.error('[Realtime] CHANNEL_ERROR:', matchesChannelName, error);
            break;
          default:
            console.debug('[Realtime] status:', status, matchesChannelName);
        }

        if (error) {
          console.error('[Realtime] subscribe() returned error:', matchesChannelName, error);
        }
      });

    return () => {
      console.info('[Realtime] Removing channel:', playersChannelName);
      console.info('[Realtime] Removing channel:', matchesChannelName);
      void supabase.removeChannel(playersChannel);
      void supabase.removeChannel(matchesChannel);
    };
  }, [reload]);

  useEffect(() => {
    const refreshVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void reload({ silent: true });
    };

    const intervalId = window.setInterval(refreshVisible, 10000);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [reload]);

  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('syncing');
      void reload({ silent: true });
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [reload]);

  const createPlayer = useCallback(async (input: string | { name: string; favoriteTennisPlayer?: string }) => {
    const payload = typeof input === 'string' ? { name: input } : input;
    const trimmed = payload.name.trim();
    if (!trimmed) {
      throw new Error('Player name is required');
    }
    const player = createPlayerRecord(trimmed, payload.favoriteTennisPlayer);
    const { error } = await supabase.from('players').insert(toPlayerRow(player));
    if (error) throw error;
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
      const { error } = await supabase
        .from('players')
        .update({ name: trimmed })
        .eq('group_id', GROUP_ID)
        .eq('id', id);
      if (error) throw error;
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
      const { error } = await supabase
        .from('players')
        .update({ name: trimmedName, favorite_tennis_player: nextFavorite ?? null })
        .eq('group_id', GROUP_ID)
        .eq('id', id);
      if (error) throw error;
      setPlayers((prev) => prev.map((p) => (p.id === id ? updated : p)));
    },
    [players]
  );

  const updatePlayerColor = useCallback(
    async (id: string, color: string) => {
      const target = players.find((p) => p.id === id);
      if (!target) return;
      const updated = { ...target, avatarColor: color };
      const { error } = await supabase
        .from('players')
        .update({ avatar_color: color })
        .eq('group_id', GROUP_ID)
        .eq('id', id);
      if (error) throw error;
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
      if (rewritten.length) {
        const { error: upsertError } = await supabase.from('matches').upsert(rewritten.map(toMatchRow));
        if (upsertError) throw upsertError;
      }
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('group_id', GROUP_ID)
        .eq('id', fromId);
      if (deleteError) throw deleteError;
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
      const { error } = await supabase.from('players').delete().eq('group_id', GROUP_ID).eq('id', id);
      if (error) throw error;
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    },
    [matches]
  );

  const saveMatchRecord = useCallback(async (match: Match) => {
    const { error } = await supabase.from('matches').upsert(toMatchRow(match));
    if (error) throw error;
    setMatches((prev) => {
      const has = prev.some((m) => m.id === match.id);
      return has ? prev.map((m) => (m.id === match.id ? match : m)) : [...prev, match];
    });
  }, []);

  const deleteMatch = useCallback(async (id: string) => {
    const { error } = await supabase.from('matches').delete().eq('group_id', GROUP_ID).eq('id', id);
    if (error) throw error;
    setMatches((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const importData = useCallback(
    async (data: StoredData, mode: 'overwrite' | 'merge') => {
      if (data.schemaVersion !== SCHEMA_VERSION) {
        throw new Error(`Unsupported schema version: ${data.schemaVersion}`);
      }
      if (mode === 'overwrite') {
        const [clearPlayers, clearMatches] = await Promise.all([
          supabase.from('players').delete().eq('group_id', GROUP_ID),
          supabase.from('matches').delete().eq('group_id', GROUP_ID)
        ]);
        if (clearPlayers.error) throw clearPlayers.error;
        if (clearMatches.error) throw clearMatches.error;

        if (data.players.length) {
          const playersInsert = await supabase.from('players').upsert(data.players.map(toPlayerRow));
          if (playersInsert.error) throw playersInsert.error;
        }
        if (data.matches.length) {
          const matchesInsert = await supabase.from('matches').upsert(data.matches.map(toMatchRow));
          if (matchesInsert.error) throw matchesInsert.error;
        }
        setPlayers(data.players);
        setMatches(data.matches);
        return;
      }

      const mergedPlayers = dedupeById([...players, ...data.players]);
      const mergedMatches = dedupeById([...matches, ...data.matches]);
      if (mergedPlayers.length) {
        const playersUpsert = await supabase.from('players').upsert(mergedPlayers.map(toPlayerRow));
        if (playersUpsert.error) throw playersUpsert.error;
      }
      if (mergedMatches.length) {
        const matchesUpsert = await supabase.from('matches').upsert(mergedMatches.map(toMatchRow));
        if (matchesUpsert.error) throw matchesUpsert.error;
      }
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
    setMetaState(nextMeta);
  }, [meta]);

  const value = useMemo(
    () => ({
      players,
      matches,
      meta,
      loading,
      syncStatus,
      lastSyncedAt,
      syncError,
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
      syncStatus,
      lastSyncedAt,
      syncError,
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
