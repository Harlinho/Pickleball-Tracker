import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MatchCard } from '../components/MatchCard';
import { useAppData } from '../state/AppDataContext';
import { formatDateLabel } from '../utils/date';
import { computePlayerProfile, resolveMatch } from '../utils/stats';

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
  const { players, matches, updatePlayerColor, updatePlayerProfile, deletePlayer } = useAppData();
  const navigate = useNavigate();
  const player = players.find((p) => p.id === id);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editFavorite, setEditFavorite] = useState('');
  const [editError, setEditError] = useState('');
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    if (!player) return undefined;
    return computePlayerProfile(player, players, matches);
  }, [player, players, matches]);

  const insights = useMemo(() => {
    if (!player) return undefined;
    const completed = matches.filter(
      (match) => match.status === 'Completed' && (match.sides.A.includes(player.id) || match.sides.B.includes(player.id))
    );

    const formatSplit = {
      Singles: { mp: 0, wins: 0, losses: 0 },
      Doubles: { mp: 0, wins: 0, losses: 0 }
    };
    const sideSplit = {
      A: { mp: 0, wins: 0, losses: 0 },
      B: { mp: 0, wins: 0, losses: 0 }
    };
    const partnerMap = new Map<string, { name: string; mp: number; wins: number; losses: number }>();

    completed.forEach((match) => {
      const res = resolveMatch(match);
      if (!res.winnerSide) return;
      const playerSide = match.sides.A.includes(player.id) ? 'A' : 'B';
      const won = res.winnerSide === playerSide;
      const formatRow = formatSplit[match.format];
      const sideRow = sideSplit[playerSide];
      formatRow.mp += 1;
      sideRow.mp += 1;
      if (won) {
        formatRow.wins += 1;
        sideRow.wins += 1;
      } else {
        formatRow.losses += 1;
        sideRow.losses += 1;
      }

      if (match.format === 'Doubles') {
        const partners = (playerSide === 'A' ? match.sides.A : match.sides.B).filter((id) => id !== player.id);
        partners.forEach((partnerId) => {
          const partnerName = players.find((p) => p.id === partnerId)?.name;
          if (!partnerName) return;
          const prev = partnerMap.get(partnerId) ?? { name: partnerName, mp: 0, wins: 0, losses: 0 };
          prev.mp += 1;
          if (won) prev.wins += 1;
          else prev.losses += 1;
          partnerMap.set(partnerId, prev);
        });
      }
    });

    const bestPartner = [...partnerMap.values()]
      .filter((row) => row.mp > 0)
      .sort(
        (a, b) =>
          b.wins / b.mp - a.wins / a.mp || b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name)
      )[0];

    const hardestOpponent = stats?.h2h
      ?.filter((row) => row.wins + row.losses > 0)
      .sort(
        (a, b) =>
          a.wins - a.losses - (b.wins - b.losses) ||
          b.losses - b.wins - (a.losses - a.wins) ||
          a.opponentName.localeCompare(b.opponentName)
      )[0];

    return {
      formatSplit,
      sideSplit,
      bestPartner,
      hardestOpponent
    };
  }, [matches, player, players, stats?.h2h]);

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
            <div className="profile-name-left">
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
            <div className="player-header-actions">
              <button
                type="button"
                className="player-delete-trigger"
                disabled={deleting}
                onClick={() => {
                  setDeleteError('');
                  setShowDeleteModal(true);
                }}
              >
                {deleting ? 'Deleting...' : 'Delete player'}
              </button>
            </div>
          </div>
          {deleteError ? <div className="profile-action-error">{deleteError}</div> : null}
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
            <span className="meta-chip">
              <span className="meta-label">Best partner</span>
              <strong>{insights?.bestPartner ? `${insights.bestPartner.name} (${insights.bestPartner.wins}-${insights.bestPartner.losses})` : 'N/A'}</strong>
            </span>
            <span className="meta-chip">
              <span className="meta-label">Toughest opponent</span>
              <strong>
                {insights?.hardestOpponent
                  ? `${insights.hardestOpponent.opponentName} (${insights.hardestOpponent.wins}-${insights.hardestOpponent.losses})`
                  : 'N/A'}
              </strong>
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
        <div className="stat-card">
          <span className="stat-label">Singles (W/L)</span>
          <strong className="stat-value">
            {insights?.formatSplit.Singles.wins ?? 0}/{insights?.formatSplit.Singles.losses ?? 0}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Doubles (W/L)</span>
          <strong className="stat-value">
            {insights?.formatSplit.Doubles.wins ?? 0}/{insights?.formatSplit.Doubles.losses ?? 0}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Side A (W/L)</span>
          <strong className="stat-value">
            {insights?.sideSplit.A.wins ?? 0}/{insights?.sideSplit.A.losses ?? 0}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Side B (W/L)</span>
          <strong className="stat-value">
            {insights?.sideSplit.B.wins ?? 0}/{insights?.sideSplit.B.losses ?? 0}
          </strong>
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
              <h3>Edit player</h3>
              <p className="muted">Update player details for this journal.</p>
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
                Save
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {showDeleteModal ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => {
            if (!deleting) setShowDeleteModal(false);
          }}
        >
          <section className="modal-card" onClick={(e) => e.stopPropagation()} aria-modal="true" role="dialog">
            <header className="modal-head">
              <h3>Delete player</h3>
              <p className="muted">
                This action cannot be undone. Deletion only works when this player is not referenced in match history.
              </p>
            </header>

            {deleteError ? <div className="error">{deleteError}</div> : null}

            <footer className="modal-actions">
              <button type="button" disabled={deleting} onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                disabled={deleting}
                onClick={async () => {
                  setDeleteError('');
                  setDeleting(true);
                  try {
                    await deletePlayer(player.id);
                    navigate('/standings');
                  } catch (err) {
                    setDeleteError((err as Error).message || 'Unable to delete player.');
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
};
