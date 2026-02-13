import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MatchCard } from '../components/MatchCard';
import { useAppData } from '../state/AppDataContext';
import { formatDateLabel } from '../utils/date';
import { computePlayerProfile } from '../utils/stats';

export const PlayerProfileScreen = () => {
  const { id } = useParams();
  const { players, matches, renamePlayer, deletePlayer, mergePlayer, updatePlayerColor } = useAppData();
  const [newName, setNewName] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');
  const player = players.find((p) => p.id === id);

  const stats = useMemo(() => {
    if (!player) return undefined;
    return computePlayerProfile(player, players, matches);
  }, [player, players, matches]);

  if (!player || !stats) return <section className="screen">Player not found.</section>;

  return (
    <section className="screen stack" data-testid="player-profile-screen">
      <div className="profile-head">
        <label className="avatar-picker" title="Change player color">
          <span className="avatar large" style={{ background: player.avatarColor ?? '#0284c7' }} />
          <input
            type="color"
            value={player.avatarColor ?? '#0284c7'}
            onChange={async (e) => {
              await updatePlayerColor(player.id, e.target.value);
            }}
            aria-label="Change player color"
          />
        </label>
        <div className="profile-title-wrap">
          <h2>{player.name}</h2>
          <div className="profile-meta-row">
            <span className="meta-chip">
              <span className="meta-label">Current streak</span>
              <strong>{stats.summary.currentStreak}</strong>
            </span>
            <span className="meta-chip">
              <span className="meta-label">Last played</span>
              <strong>{stats.summary.lastPlayedDate ? formatDateLabel(stats.summary.lastPlayedDate) : 'N/A'}</strong>
            </span>
            <span className="meta-chip">
              <span className="meta-label">Favorite tennis player</span>
              <strong>{player.favoriteTennisPlayer || 'Not set'}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Matches Played</span>
          <strong className="stat-value">{stats.summary.mp}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">W/L</span>
          <strong className="stat-value">
            {stats.summary.wins}/{stats.summary.losses}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Win Rate</span>
          <strong className="stat-value">{stats.summary.winPct}%</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Sets (W/L)</span>
          <strong className="stat-value">
            {stats.summary.setsWon}/{stats.summary.setsLost}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Set Difference</span>
          <strong className="stat-value">{stats.summary.setDiff}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Longest Win Streak</span>
          <strong className="stat-value">{stats.summary.longestWinStreak}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Form Trend</span>
          <strong className="stat-value trend-value">{stats.summary.trend}</strong>
        </div>
      </div>

      <section className="panel">
        <h3>Manage player</h3>
        <div className="manage-row">
          <input
            placeholder="Rename player"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            data-testid="rename-player-input"
          />
          <button
            type="button"
            onClick={async () => {
              await renamePlayer(player.id, newName);
              setNewName('');
            }}
          >
            Rename
          </button>
        </div>
        <div className="manage-row">
          <select value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)}>
            <option value="">Merge into...</option>
            {players
              .filter((p) => p.id !== player.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={async () => {
              if (!mergeTargetId) return;
              await mergePlayer(player.id, mergeTargetId);
            }}
          >
            Merge
          </button>
          <button
            type="button"
            className="danger"
            onClick={async () => {
              try {
                await deletePlayer(player.id);
              } catch (err) {
                alert((err as Error).message);
              }
            }}
          >
            Delete
          </button>
        </div>
      </section>

      <section className="panel stack">
        <h3>Head-to-head</h3>
        {stats.h2h.length ? (
          <table>
            <thead>
              <tr>
                <th>Opponent</th>
                <th>W</th>
                <th>L</th>
              </tr>
            </thead>
            <tbody>
              {stats.h2h.map((row) => (
                <tr key={row.opponentId}>
                  <td>{row.opponentName}</td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No opponent records yet.</p>
        )}
      </section>

      <section className="stack">
        <h3>Recent matches</h3>
        {stats.recentMatches.map((match) => (
          <MatchCard key={match.id} match={match} players={players} compact />
        ))}
      </section>
    </section>
  );
};
