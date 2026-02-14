import { useEffect, useRef, useState } from 'react';

interface NewPlayerModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: { name: string; favoriteTennisPlayer?: string }) => Promise<void>;
}

export const NewPlayerModal = ({ open, onClose, onCreate }: NewPlayerModalProps) => {
  const [name, setName] = useState('');
  const [favoriteTennisPlayer, setFavoriteTennisPlayer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setFavoriteTennisPlayer('');
    setError('');
    const timer = setTimeout(() => firstInputRef.current?.focus(), 10);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, submitting]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={() => (!submitting ? onClose() : undefined)} role="presentation">
      <section className="modal-card" onClick={(e) => e.stopPropagation()} aria-modal="true" role="dialog">
        <header className="modal-head">
          <h3>New player</h3>
          <p className="muted">Add a player to this journal.</p>
        </header>

        <div className="modal-grid">
          <label>
            Name
            <input
              ref={firstInputRef}
              placeholder="Player name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
          </label>

          <label>
            Favorite tennis player
            <input
              placeholder="Optional"
              value={favoriteTennisPlayer}
              onChange={(e) => setFavoriteTennisPlayer(e.target.value)}
              maxLength={60}
            />
          </label>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <footer className="modal-actions">
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            disabled={submitting}
            onClick={async () => {
              const trimmed = name.trim();
              if (!trimmed) {
                setError('Name is required.');
                return;
              }
              setSubmitting(true);
              setError('');
              try {
                await onCreate({ name: trimmed, favoriteTennisPlayer: favoriteTennisPlayer.trim() || undefined });
                onClose();
              } catch (err) {
                setError((err as Error).message || 'Could not create player.');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? 'Adding...' : 'Add player'}
          </button>
        </footer>
      </section>
    </div>
  );
};
