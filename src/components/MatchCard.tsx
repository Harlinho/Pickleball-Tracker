import { Link, useNavigate } from 'react-router-dom';
import type { Match, Player } from '../types';
import { formatDateLabel } from '../utils/date';
import { resolveMatch } from '../utils/stats';

interface MatchCardProps {
  match: Match;
  players: Player[];
  compact?: boolean;
}

const playerById = (players: Player[], id: string) => players.find((p) => p.id === id);
export const MatchCard = ({ match, players, compact = false }: MatchCardProps) => {
  const navigate = useNavigate();
  const resolution = resolveMatch(match);
  const winner = resolution.winnerSide;
  const boardColumns = {
    gridTemplateColumns: `minmax(180px, 1.8fr) repeat(${match.setCount}, minmax(36px, 0.4fr))`
  };

  return (
    <article
      className={`match-card ${compact ? 'compact' : ''}`}
      data-testid={`match-card-${match.id}`}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/matches/${match.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/matches/${match.id}`);
        }
      }}
    >
      <div className="match-head">
        <div>
          <strong>{formatDateLabel(match.date)}</strong>
          <div className="small muted">{match.format}</div>
        </div>
        <span className={`status-pill ${match.status === 'Completed' ? 'done' : 'pending'}`}>{match.status}</span>
      </div>

      <div className="scoreboard">
        <div className="scoreboard-row scoreboard-head" style={boardColumns}>
          <div />
          {Array.from({ length: match.setCount }).map((_, idx) => (
            <div key={idx} className="set-head">
              S{idx + 1}
            </div>
          ))}
        </div>

        <div className={`scoreboard-row ${winner === 'A' ? 'winner' : ''}`} style={boardColumns}>
          <div className="team-name-cell">
            <span className="team-label">A</span>
            <span className="team-name">
              {match.sides.A.map((id, idx) => {
                const p = playerById(players, id);
                if (!p) return null;
                return (
                  <span key={id}>
                    {idx > 0 ? <span className="muted"> • </span> : null}
                    <Link
                      to={`/players/${p.id}`}
                      className="player-inline-link"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {p.name}
                    </Link>
                  </span>
                );
              })}
            </span>
          </div>
          {Array.from({ length: match.setCount }).map((_, idx) => (
            <div key={idx} className="set-score">
              {match.sets[idx]?.scoreA ?? '-'}
            </div>
          ))}
        </div>

        <div className={`scoreboard-row ${winner === 'B' ? 'winner' : ''}`} style={boardColumns}>
          <div className="team-name-cell">
            <span className="team-label">B</span>
            <span className="team-name">
              {match.sides.B.map((id, idx) => {
                const p = playerById(players, id);
                if (!p) return null;
                return (
                  <span key={id}>
                    {idx > 0 ? <span className="muted"> • </span> : null}
                    <Link
                      to={`/players/${p.id}`}
                      className="player-inline-link"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {p.name}
                    </Link>
                  </span>
                );
              })}
            </span>
          </div>
          {Array.from({ length: match.setCount }).map((_, idx) => (
            <div key={idx} className="set-score">
              {match.sets[idx]?.scoreB ?? '-'}
            </div>
          ))}
        </div>
      </div>

    </article>
  );
};
