import type {
  H2HRecord,
  Match,
  Player,
  PlayerProfileStats,
  PlayerStanding,
  Side,
  WeeklySnapshot
} from '../types';
import { weekKey, weekLabel } from './date';

interface MatchResolution {
  winnerSide?: Side;
  setWinsA: number;
  setWinsB: number;
}

export const isSetIncluded = (set: Match['sets'][number]): boolean =>
  set.winnerSide !== undefined || set.scoreA !== undefined || set.scoreB !== undefined || Boolean(set.note);

export const resolveMatch = (match: Match): MatchResolution => {
  let setWinsA = 0;
  let setWinsB = 0;
  match.sets.forEach((set) => {
    if (!isSetIncluded(set) || !set.winnerSide) {
      return;
    }
    if (set.winnerSide === 'A') {
      setWinsA += 1;
    } else {
      setWinsB += 1;
    }
  });

  if (setWinsA > setWinsB) {
    return { winnerSide: 'A', setWinsA, setWinsB };
  }
  if (setWinsB > setWinsA) {
    return { winnerSide: 'B', setWinsA, setWinsB };
  }
  return { winnerSide: match.matchWinnerSide, setWinsA, setWinsB };
};

const completedMatches = (matches: Match[], includeNotCompleted = false): Match[] =>
  matches
    .filter((match) => includeNotCompleted || match.status === 'Completed')
    .slice()
    .sort((a, b) => `${a.date}-${a.createdAt}`.localeCompare(`${b.date}-${b.createdAt}`));

export const computeStandings = (
  players: Player[],
  matches: Match[],
  includeNotCompleted = false
): PlayerStanding[] => {
  const standings = new Map<string, PlayerStanding>();

  players.forEach((player) => {
    standings.set(player.id, {
      playerId: player.id,
      playerName: player.name,
      avatarColor: player.avatarColor,
      mp: 0,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      setDiff: 0,
      form: []
    });
  });

  const sortedMatches = completedMatches(matches, includeNotCompleted).filter((m) =>
    includeNotCompleted ? true : m.status === 'Completed'
  );

  sortedMatches.forEach((match) => {
    if (match.status !== 'Completed' && !includeNotCompleted) {
      return;
    }

    const resolution = resolveMatch(match);
    if (!resolution.winnerSide) {
      return;
    }

    const aPlayers = match.sides.A.map((id) => standings.get(id)).filter(Boolean) as PlayerStanding[];
    const bPlayers = match.sides.B.map((id) => standings.get(id)).filter(Boolean) as PlayerStanding[];
    if (aPlayers.length === 0 || bPlayers.length === 0) {
      return;
    }

    const winners = resolution.winnerSide === 'A' ? aPlayers : bPlayers;
    const losers = resolution.winnerSide === 'A' ? bPlayers : aPlayers;
    const winningSetCount = resolution.winnerSide === 'A' ? resolution.setWinsA : resolution.setWinsB;
    const losingSetCount = resolution.winnerSide === 'A' ? resolution.setWinsB : resolution.setWinsA;

    winners.forEach((player) => {
      player.mp += 1;
      player.wins += 1;
      player.setsWon += winningSetCount;
      player.setsLost += losingSetCount;
      player.form = [...player.form.slice(-4), 'W'];
    });

    losers.forEach((player) => {
      player.mp += 1;
      player.losses += 1;
      player.setsWon += losingSetCount;
      player.setsLost += winningSetCount;
      player.form = [...player.form.slice(-4), 'L'];
    });
  });

  const rows = [...standings.values()].map((row) => ({
    ...row,
    setDiff: row.setsWon - row.setsLost
  }));

  rows.sort((a, b) => {
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.mp !== a.mp) return b.mp - a.mp;
    return a.playerName.localeCompare(b.playerName);
  });

  return rows;
};

export const computePlayerProfile = (
  player: Player,
  players: Player[],
  matches: Match[],
  includeNotCompleted = false
): PlayerProfileStats => {
  const standings = computeStandings(players, matches, includeNotCompleted);
  const base = standings.find((row) => row.playerId === player.id) ?? {
    playerId: player.id,
    playerName: player.name,
    avatarColor: player.avatarColor,
    mp: 0,
    wins: 0,
    losses: 0,
    setsWon: 0,
    setsLost: 0,
    setDiff: 0,
    form: [] as ('W' | 'L')[]
  };

  const eligible = completedMatches(matches, includeNotCompleted).filter((match) =>
    includeNotCompleted ? true : match.status === 'Completed'
  );
  const playerMatches = eligible.filter(
    (match) => match.sides.A.includes(player.id) || match.sides.B.includes(player.id)
  );

  let currentStreakType: 'W' | 'L' | '' = '';
  let currentStreakCount = 0;
  let longestWinStreak = 0;
  let rollingWinStreak = 0;

  const h2hMap = new Map<string, H2HRecord>();
  const outcomes: ('W' | 'L')[] = [];

  playerMatches.forEach((match) => {
    const res = resolveMatch(match);
    if (!res.winnerSide) return;
    const playerSide = match.sides.A.includes(player.id) ? 'A' : 'B';
    const won = playerSide === res.winnerSide;
    const result: 'W' | 'L' = won ? 'W' : 'L';
    outcomes.push(result);

    if (currentStreakType === result || currentStreakType === '') {
      currentStreakType = result;
      currentStreakCount += 1;
    } else {
      currentStreakType = result;
      currentStreakCount = 1;
    }

    if (won) {
      rollingWinStreak += 1;
      if (rollingWinStreak > longestWinStreak) longestWinStreak = rollingWinStreak;
    } else {
      rollingWinStreak = 0;
    }

    const oppIds = playerSide === 'A' ? match.sides.B : match.sides.A;
    oppIds.forEach((oppId) => {
      const opponent = players.find((p) => p.id === oppId);
      if (!opponent) return;
      const prev = h2hMap.get(oppId) ?? {
        opponentId: oppId,
        opponentName: opponent.name,
        wins: 0,
        losses: 0
      };
      if (won) prev.wins += 1;
      else prev.losses += 1;
      h2hMap.set(oppId, prev);
    });
  });

  const last5 = outcomes.slice(-5);
  const prev5 = outcomes.slice(-10, -5);
  const score = (arr: ('W' | 'L')[]) => arr.reduce((sum, r) => sum + (r === 'W' ? 1 : -1), 0);
  const trend = score(last5) > score(prev5) ? 'up' : score(last5) < score(prev5) ? 'down' : 'flat';

  return {
    summary: {
      ...base,
      winPct: base.mp ? Math.round((base.wins / base.mp) * 1000) / 10 : 0,
      lastPlayedDate: playerMatches.at(-1)?.date,
      currentStreak: currentStreakType ? `${currentStreakType}${currentStreakCount}` : 'None',
      longestWinStreak,
      trend
    },
    recentMatches: playerMatches.slice(-10).reverse(),
    h2h: [...h2hMap.values()].sort((a, b) => {
      const diffA = a.wins - a.losses;
      const diffB = b.wins - b.losses;
      if (diffB !== diffA) return diffB - diffA;
      return a.opponentName.localeCompare(b.opponentName);
    })
  };
};

export const computeWeeklySnapshots = (players: Player[], matches: Match[]): WeeklySnapshot[] => {
  const byWeek = new Map<string, Match[]>();
  matches.forEach((match) => {
    if (match.status !== 'Completed') return;
    const key = weekKey(match.date);
    const prev = byWeek.get(key) ?? [];
    prev.push(match);
    byWeek.set(key, prev);
  });

  return [...byWeek.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, weekMatches]) => {
      const rows = computeStandings(players, weekMatches)
        .map((row) => ({
          playerId: row.playerId,
          playerName: row.playerName,
          wins: row.wins,
          losses: row.losses,
          setsWon: row.setsWon,
          setsLost: row.setsLost
        }))
        .sort(
          (a, b) =>
            b.wins - a.wins ||
            b.setsWon - b.setsLost - (a.setsWon - a.setsLost) ||
            a.playerName.localeCompare(b.playerName)
        );

      return {
        weekLabel: weekLabel(key),
        topPlayerId: rows[0]?.playerId,
        topPlayerName: rows[0]?.playerName,
        rows
      };
    });
};

export const findMatchWinnerName = (match: Match, players: Player[]): string | undefined => {
  const res = resolveMatch(match);
  if (!res.winnerSide) return undefined;
  const names = (res.winnerSide === 'A' ? match.sides.A : match.sides.B)
    .map((id) => players.find((p) => p.id === id)?.name)
    .filter(Boolean);
  return names.join(' / ');
};
