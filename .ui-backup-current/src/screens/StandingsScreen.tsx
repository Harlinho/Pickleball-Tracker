import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Last5Dots } from '../components/Last5Dots';
import { useAppData } from '../state/AppDataContext';
import type { StandingsFilters } from '../types';
import { computeStandings, computeWeeklySnapshots } from '../utils/stats';

export const StandingsScreen = () => {
  const { players, matches, createPlayer, renamePlayer } = useAppData();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<StandingsFilters>({ minMatches: 0, includeNotCompleted: false });
  const [weekly, setWeekly] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [renamePlayerId, setRenamePlayerId] = useState('');
  const [renameTo, setRenameTo] = useState('');

  const standings = useMemo(
    () =>
      computeStandings(players, matches, filters.includeNotCompleted)
        .filter((row) => row.mp >= filters.minMatches)
        .filter((row) => row.playerName.toLowerCase().includes(search.toLowerCase())),
    [players, matches, filters, search]
  );

  const weeklySnapshots = useMemo(() => computeWeeklySnapshots(players, matches), [players, matches]);

  return (
    <section className="screen stack" data-testid="standings-screen">
      <div className="toolbar">
        <input
          placeholder="Search player or date"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="global-search"
        />
        <label className="inline-check">
          <input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} />
          Weekly
        </label>
      </div>

      <div className="filters-row">
        <label>
          Min MP
          <input
            type="number"
            min={0}
            value={filters.minMatches}
            onChange={(e) => setFilters((prev) => ({ ...prev, minMatches: Number(e.target.value) || 0 }))}
          />
        </label>
        <label className="inline-check">
          <input
            type="checkbox"
            checked={filters.includeNotCompleted}
            onChange={(e) => setFilters((prev) => ({ ...prev, includeNotCompleted: e.target.checked }))}
          />
          Include not completed
        </label>
      </div>

      <section className="panel">
        <h3>Manage players</h3>
        <div className="manage-row">
          <input
            placeholder="New player name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
          />
          <button
            type="button"
            onClick={async () => {
              const name = newPlayerName.trim();
              if (!name) return;
              await createPlayer(name);
              setNewPlayerName('');
            }}
          >
            Add player
          </button>
        </div>
        <div className="manage-row">
          <select value={renamePlayerId} onChange={(e) => setRenamePlayerId(e.target.value)}>
            <option value="">Select player</option>
            {players
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
          </select>
          <input
            placeholder="Rename to..."
            value={renameTo}
            onChange={(e) => setRenameTo(e.target.value)}
          />
          <button
            type="button"
            onClick={async () => {
              if (!renamePlayerId || !renameTo.trim()) return;
              await renamePlayer(renamePlayerId, renameTo);
              setRenameTo('');
              setRenamePlayerId('');
            }}
          >
            Save name
          </button>
        </div>
      </section>

      {weekly ? (
        <div className="weekly-grid" data-testid="weekly-view">
          {weeklySnapshots.map((snapshot) => (
            <article key={snapshot.weekLabel} className="weekly-card">
              <h3>{snapshot.weekLabel}</h3>
              <p className="muted">Top player: {snapshot.topPlayerName ?? 'N/A'}</p>
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>W/L</th>
                    <th>SW/SL</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.rows.map((row) => (
                    <tr key={row.playerId}>
                      <td>
                        <Link to={`/players/${row.playerId}`}>{row.playerName}</Link>
                      </td>
                      <td>
                        {row.wins}/{row.losses}
                      </td>
                      <td>
                        {row.setsWon}/{row.setsLost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="standings-table" data-testid="standings-table">
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th title="Matches Played">MP</th>
                <th title="Wins">W</th>
                <th title="Losses">L</th>
                <th title="Sets Won">SW</th>
                <th title="Sets Lost">SL</th>
                <th title="Set Difference (Sets Won minus Sets Lost)">SD</th>
                <th title="Most recent five match results">Last 5</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, idx) => (
                <tr key={row.playerId}>
                  <td>{idx + 1}</td>
                  <td>
                    <Link to={`/players/${row.playerId}`} data-testid={`player-link-${row.playerId}`}>
                      {row.playerName}
                    </Link>
                  </td>
                  <td>{row.mp}</td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                  <td>{row.setsWon}</td>
                  <td>{row.setsLost}</td>
                  <td>{row.setDiff}</td>
                  <td>
                    <Last5Dots form={row.form} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!standings.length ? <p className="muted">No standings rows for current filters.</p> : null}
        </div>
      )}
    </section>
  );
};
