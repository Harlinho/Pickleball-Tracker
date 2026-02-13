import { useMemo, useState } from 'react';
import type { Match, MatchFormat, MatchStatus, Player, SetEntry, Side } from '../types';
import { toISODate } from '../utils/date';

interface MatchFormProps {
  players: Player[];
  initial?: Match;
  onSave: (match: Match) => Promise<void>;
}

const makeId = () => crypto.randomUUID();

const defaultSets = (count: number): SetEntry[] => Array.from({ length: count }, () => ({}));

export const MatchForm = ({ players, initial, onSave }: MatchFormProps) => {
  const [date, setDate] = useState(initial?.date ?? toISODate(new Date()));
  const [status, setStatus] = useState<MatchStatus>(initial?.status ?? 'Completed');
  const [format, setFormat] = useState<MatchFormat>(initial?.format ?? 'Singles');
  const [setCount, setSetCount] = useState(initial?.setCount ?? 3);
  const [sides, setSides] = useState(initial?.sides ?? { A: [''], B: [''] });
  const [sets, setSets] = useState<SetEntry[]>(initial?.sets ?? defaultSets(3));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [matchWinnerSide, setMatchWinnerSide] = useState<Side | undefined>(initial?.matchWinnerSide);
  const [error, setError] = useState('');

  const sideSlots = format === 'Singles' ? 1 : 2;

  const normalizedSides = useMemo(
    () => ({
      A: [...sides.A.slice(0, sideSlots)],
      B: [...sides.B.slice(0, sideSlots)]
    }),
    [sideSlots, sides]
  );

  const updateSide = (side: 'A' | 'B', slot: number, value: string) => {
    setSides((prev) => {
      const next = { ...prev, [side]: [...prev[side]] };
      next[side][slot] = value;
      return next;
    });
  };

  const updateSet = (index: number, patch: Partial<SetEntry>) => {
    setSets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleSetCount = (count: number) => {
    setSetCount(count);
    setSets((prev) => Array.from({ length: count }, (_, idx) => prev[idx] ?? {}));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const cleanSets = sets.slice(0, setCount);

    const playersSelected = [...normalizedSides.A, ...normalizedSides.B].every(Boolean);
    if (!playersSelected) {
      setError('Select all players for both sides.');
      return;
    }

    const allUnique = new Set([...normalizedSides.A, ...normalizedSides.B]).size === sideSlots * 2;
    if (!allUnique) {
      setError('A player cannot appear on both sides in the same match.');
      return;
    }

    for (const set of cleanSets) {
      const included = set.winnerSide || set.scoreA !== undefined || set.scoreB !== undefined || set.note;
      if (included && !set.winnerSide) {
        setError('Each included set requires winner selection (A or B).');
        return;
      }
    }

    const setWinsA = cleanSets.filter((set) => set.winnerSide === 'A').length;
    const setWinsB = cleanSets.filter((set) => set.winnerSide === 'B').length;
    const ambiguousCompleted = status === 'Completed' && setWinsA === setWinsB && !matchWinnerSide;
    if (ambiguousCompleted) {
      setError('Completed tied/ambiguous matches require explicit match winner side.');
      return;
    }

    const now = new Date().toISOString();
    const record: Match = {
      id: initial?.id ?? makeId(),
      date,
      status,
      format,
      sides: normalizedSides,
      setCount,
      sets: cleanSets,
      matchWinnerSide,
      notes,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now
    };

    await onSave(record);
  };

  return (
    <form onSubmit={handleSubmit} className="stack match-form" data-testid="match-form">
      <label>
        Date
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <label>
        Status
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MatchStatus)}
          data-testid="match-status"
        >
          <option>Completed</option>
          <option>Not completed</option>
        </select>
      </label>

      <label>
        Format
        <select
          value={format}
          data-testid="match-format"
          onChange={(e) => {
            const next = e.target.value as MatchFormat;
            setFormat(next);
            setSides((prev) => ({
              A: Array.from({ length: next === 'Singles' ? 1 : 2 }, (_, i) => prev.A[i] ?? ''),
              B: Array.from({ length: next === 'Singles' ? 1 : 2 }, (_, i) => prev.B[i] ?? '')
            }));
          }}
        >
          <option>Singles</option>
          <option>Doubles</option>
        </select>
      </label>

      <label>
        Set count
        <select value={setCount} onChange={(e) => handleSetCount(Number(e.target.value))} data-testid="set-count">
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <section className="side-picker">
        <h3>Side A</h3>
        {Array.from({ length: sideSlots }).map((_, idx) => (
          <select
            key={`a-${idx}`}
            value={normalizedSides.A[idx] ?? ''}
            onChange={(e) => updateSide('A', idx, e.target.value)}
            data-testid={`side-a-${idx}`}
          >
            <option value="">Select player</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ))}
      </section>

      <section className="side-picker">
        <h3>Side B</h3>
        {Array.from({ length: sideSlots }).map((_, idx) => (
          <select
            key={`b-${idx}`}
            value={normalizedSides.B[idx] ?? ''}
            onChange={(e) => updateSide('B', idx, e.target.value)}
            data-testid={`side-b-${idx}`}
          >
            <option value="">Select player</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ))}
      </section>

      <section className="sets-editor">
        <h3>Sets</h3>
        {Array.from({ length: setCount }).map((_, idx) => (
          <div key={idx} className="set-edit-row">
            <span>Set {idx + 1}</span>
            <input
              type="number"
              placeholder="A"
              value={sets[idx]?.scoreA ?? ''}
              onChange={(e) =>
                updateSet(idx, {
                  scoreA: e.target.value === '' ? undefined : Number(e.target.value)
                })
              }
              min={0}
            />
            <input
              type="number"
              placeholder="B"
              value={sets[idx]?.scoreB ?? ''}
              onChange={(e) =>
                updateSet(idx, {
                  scoreB: e.target.value === '' ? undefined : Number(e.target.value)
                })
              }
              min={0}
            />
            <select
              value={sets[idx]?.winnerSide ?? ''}
              onChange={(e) => updateSet(idx, { winnerSide: (e.target.value || undefined) as Side | undefined })}
              data-testid={`set-winner-${idx}`}
            >
              <option value="">Winner</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
          </div>
        ))}
      </section>

      {status === 'Completed' ? (
        <label>
          Explicit match winner side (only needed if set result tied)
          <select
            value={matchWinnerSide ?? ''}
            onChange={(e) => setMatchWinnerSide((e.target.value || undefined) as Side | undefined)}
          >
            <option value="">Auto from sets</option>
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </label>
      ) : null}

      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>

      {error ? <div className="error">{error}</div> : null}
      <button type="submit" className="primary" data-testid="save-match-btn">
        Save Match
      </button>
    </form>
  );
};
