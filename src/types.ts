export type MatchStatus = 'Completed' | 'Not completed';
export type MatchFormat = 'Singles' | 'Doubles';
export type Side = 'A' | 'B';

export interface Player {
  id: string;
  name: string;
  createdAt: string;
  avatarColor?: string;
  favoriteTennisPlayer?: string;
}

export interface SetEntry {
  scoreA?: number;
  scoreB?: number;
  winnerSide?: Side;
  note?: string;
}

export interface Match {
  id: string;
  date: string;
  status: MatchStatus;
  format: MatchFormat;
  sides: {
    A: string[];
    B: string[];
  };
  setCount: number;
  sets: SetEntry[];
  matchWinnerSide?: Side;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredData {
  schemaVersion: number;
  players: Player[];
  matches: Match[];
}

export interface PlayerStanding {
  playerId: string;
  playerName: string;
  avatarColor?: string;
  mp: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setDiff: number;
  form: ('W' | 'L')[];
}

export interface H2HRecord {
  opponentId: string;
  opponentName: string;
  wins: number;
  losses: number;
}

export interface PlayerProfileStats {
  summary: PlayerStanding & {
    winPct: number;
    lastPlayedDate?: string;
    currentStreak: string;
    longestWinStreak: number;
    trend: 'up' | 'down' | 'flat';
  };
  recentMatches: Match[];
  h2h: H2HRecord[];
}

export interface WeeklySnapshot {
  weekLabel: string;
  topPlayerId?: string;
  topPlayerName?: string;
  rows: Array<{
    playerId: string;
    playerName: string;
    wins: number;
    losses: number;
    setsWon: number;
    setsLost: number;
  }>;
}

export interface MatchFilters {
  status: 'All' | MatchStatus;
  playerId: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface StandingsFilters {
  minMatches: number;
  includeNotCompleted: boolean;
}

export interface AppMeta {
  lastBackupAt?: string;
  didRunProdCleanup?: boolean;
}
