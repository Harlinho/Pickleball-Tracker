import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MatchCard } from '../components/MatchCard';
import { useAppData } from '../state/AppDataContext';
import { formatDateLabel } from '../utils/date';
import { computePlayerProfile } from '../utils/stats';

export const PlayerProfileScreen = () => {
  const presetColors = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#84cc16',
    '#22c55e',
    '#14b8a6',
    '#06b6d4',
    '#0ea5e9',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#ec4899'
  ];
  const { id } = useParams();
  const { players, matches, updatePlayerColor, updatePlayerProfile } = useAppData();
  const player = players.find((p) => p.id === id);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editFavorite, setEditFavorite] = useState('');
  const [editError, setEditError] = useState('');
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const colorRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    if (!player) return undefined;
    return computePlayerProfile(player, players, matches);
  }, [player, players, matches]);

  useEffect(() => {
    if (!player) return;
    setEditName(player.name);
    setEditFavorite(player.favoriteTennisPlayer ?? '');
    setCustomColor(player.avatarColor ?? '#0ea5e9');
  }, [player]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!colorRef.current?.contains(event.target as Node)) setShowColorPopover(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  if (!player || !stats) return <section className="screen">Player not found.</section>;

  return (
    <section className="screen stack" data-testid="player-profile-screen">
      <div className="profile-head">
        <div className="avatar-picker" ref={colorRef}>
          <button
            type="button"
            className="avatar-button"
            title="Change player color"
            onClick={() => setShowColorPopover((prev) => !prev)}
          >
            <span className="avatar large" style={{ background: player.avatarColor ?? '#0284c7' }} />
          </button>
          <span className="avatar-hint">Color</span>

          {showColorPopover ? (
            <div className="color-popover">
              <h4>Team color</h4>
              <div className="color-swatch-grid">
                {presetColors.map((hex) => (
                  <button
                    type="button"
                    key={hex}
                    className={`color-swatch ${player.avatarColor === hex ? 'active' : ''}`}
                    style={{ background: hex }}
                    onClick={async () => {
                      await updatePlayerColor(player.id, hex);
                      setCustomColor(hex);
                    }}
                    aria-label={`Set color ${hex}`}
                  />
                ))}
              </div>

              <div className="color-custom-row">
                <input
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="#0ea5e9"
                  maxLength={7}
                />
                <button
                  type="button"
                  onClick={async () => {
                    const normalized = customColor.trim().toLowerCase();
                    if (!/^#[0-9a-f]{6}$/.test(normalized)) return;
                    await updatePlayerColor(player.id, normalized);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="profile-title-wrap">
          <div className="profile-name-row">
            <h2>{player.name}</h2>
            <button
              type="button"
              className="player-edit-trigger"
              aria-label="Edit player details"
              onClick={() => {
                setEditError('');
                setShowEditModal(true);
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 16.8V20h3.2L18.9 8.3l-3.2-3.2L4 16.8z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path d="M13.9 6.9l3.2 3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
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

      <section className="panel stack">
        <h3>Head-to-head</h3>
        {stats.h2h.length ? (
          <table className="h2h-table">
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

      {showEditModal ? (
        <div className="modal-overlay" role="presentation" onClick={() => setShowEditModal(false)}>
          <section className="modal-card" onClick={(e) => e.stopPropagation()} aria-modal="true" role="dialog">
            <header className="modal-head">
              <h3>Edit Player</h3>
              <p className="muted">Update player identity details.</p>
            </header>

            <div className="modal-grid">
              <label>
                Player name
                <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={40} />
              </label>
              <label>
                Favorite tennis player
                <input value={editFavorite} onChange={(e) => setEditFavorite(e.target.value)} maxLength={60} />
              </label>
            </div>

            {editError ? <div className="error">{editError}</div> : null}

            <footer className="modal-actions">
              <button type="button" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={async () => {
                  try {
                    await updatePlayerProfile(player.id, {
                      name: editName,
                      favoriteTennisPlayer: editFavorite
                    });
                    setShowEditModal(false);
                  } catch (err) {
                    setEditError((err as Error).message || 'Unable to save changes.');
                  }
                }}
              >
                Save changes
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
};
