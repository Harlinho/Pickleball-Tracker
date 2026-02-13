import { toPng } from 'html-to-image';
import { useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MatchCard } from '../components/MatchCard';
import { useAppData } from '../state/AppDataContext';

export const MatchDetailScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { matches, players, deleteMatch } = useAppData();
  const match = matches.find((m) => m.id === id);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasMatchNotes = Boolean(match?.notes?.trim());
  const setNotes = (match?.sets ?? [])
    .map((set, idx) => ({ index: idx + 1, note: set.note?.trim() ?? '' }))
    .filter((entry) => Boolean(entry.note));

  if (!match) {
    return <section className="screen">Match not found.</section>;
  }

  const shareAsImage = async () => {
    if (!cardRef.current) return;
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `pickleball-match-${match.date}.png`;
    anchor.click();
  };

  return (
    <section className="screen stack" data-testid="match-detail-screen">
      <div className="toolbar">
        <h2>Match Detail</h2>
        <div className="actions">
          <Link to={`/matches/${match.id}/edit`} className="button-link">
            Edit
          </Link>
          <button type="button" onClick={shareAsImage}>
            Share
          </button>
          <button
            type="button"
            className="danger"
            onClick={async () => {
              if (!confirm('Delete this match?')) return;
              await deleteMatch(match.id);
              navigate('/');
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div ref={cardRef} className="share-surface">
        <MatchCard match={match} players={players} />
      </div>

      {hasMatchNotes ? (
        <section className="panel stack">
          <h3>Match Notes</h3>
          <p>{match.notes}</p>
        </section>
      ) : null}

      {setNotes.length ? (
        <section className="panel stack">
          <h3>Set Notes</h3>
          {setNotes.map((entry) => (
            <p key={entry.index}>
              <strong>Set {entry.index}:</strong> {entry.note}
            </p>
          ))}
        </section>
      ) : null}
    </section>
  );
};
