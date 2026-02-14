import { useMemo, useState } from 'react';
import type { Match, MatchFormat, MatchStatus, Player, SetEntry, Side } from '../types';
import { toISODate } from '../utils/date';
import { DatePickerField } from './DatePickerField';
import { SelectField } from './SelectField';

interface MatchFormProps {
  players: Player[];
  initial?: Match;
  onSave: (match: Match) => Promise<void>;
}

const makeId = () => crypto.randomUUID();
const QUICK_ENTRY_KEY = 'pickleball-journal-quick-entry';

const defaultSets = (count: number): SetEntry[] => Array.from({ length: count }, () => ({}));
const hasNumericScore = (value: number | undefined): value is number => typeof value === 'number' && !Number.isNaN(value);
const deriveWinnerFromScores = (scoreA?: number, scoreB?: number): Side | undefined => {
  if (!hasNumericScore(scoreA) || !hasNumericScore(scoreB) || scoreA === scoreB) return undefined;
  return scoreA > scoreB ? 'A' : 'B';
};

interface QuickEntryDefaults {
  status: MatchStatus;
  format: MatchFormat;
  setCount: number;
  sides: { A: string[]; B: string[] };
}

const readQuickEntryDefaults = (): QuickEntryDefaults | null => {
  try {
    const raw = localStorage.getItem(QUICK_ENTRY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QuickEntryDefaults;
  } catch {
    return null;
  }
};

const writeQuickEntryDefaults = (payload: QuickEntryDefaults): void => {
  try {
    localStorage.setItem(QUICK_ENTRY_KEY, JSON.stringify(payload));
  } catch {
    // no-op
  }
};

export const MatchForm = ({ players, initial, onSave }: MatchFormProps) => {
  const quickDefaults = useMemo(() => readQuickEntryDefaults(), []);
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
  const playerOptions = players.map((p) => ({ value: p.id, label: p.name }));

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

  const updateScore = (index: number, key: 'scoreA' | 'scoreB', raw: string) => {
    setSets((prev) => {
      const next = [...prev];
      const current = next[index] ?? {};
      const updated = { ...current, [key]: raw === '' ? undefined : Number(raw) } as SetEntry;
      const derivedWinner = deriveWinnerFromScores(updated.scoreA, updated.scoreB);
      if (derivedWinner) {
        updated.winnerSide = derivedWinner;
      }
      next[index] = updated;
      return next;
    });
  };

  const stepScore = (index: number, key: 'scoreA' | 'scoreB', delta: number) => {
    const current = sets[index]?.[key];
    const next = Math.max(0, (current ?? 0) + delta);
    updateSet(index, { [key]: next } as Partial<SetEntry>);
  };

  const handleSetCount = (count: number) => {
    setSetCount(count);
    setSets((prev) => Array.from({ length: count }, (_, idx) => prev[idx] ?? {}));
  };

  const applyQuickEntry = () => {
    if (!quickDefaults) return;
    setStatus(quickDefaults.status);
    setFormat(quickDefaults.format);
    setSetCount(quickDefaults.setCount);
    setSets(defaultSets(quickDefaults.setCount));

    const validIds = new Set(players.map((p) => p.id));
    const filtered = {
      A: quickDefaults.sides.A.filter((id) => validIds.has(id)),
      B: quickDefaults.sides.B.filter((id) => validIds.has(id))
    };
    setSides({
      A: Array.from({ length: quickDefaults.format === 'Singles' ? 1 : 2 }, (_, i) => filtered.A[i] ?? ''),
      B: Array.from({ length: quickDefaults.format === 'Singles' ? 1 : 2 }, (_, i) => filtered.B[i] ?? '')
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const cleanSets = sets.slice(0, setCount).map((set) => {
      const derivedWinner = deriveWinnerFromScores(set.scoreA, set.scoreB);
      return derivedWinner ? { ...set, winnerSide: derivedWinner } : set;
    });

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
        setError('Each included set needs a winner (auto from scores, or select A/B for ties/blanks).');
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
    writeQuickEntryDefaults({
      status: record.status,
      format: record.format,
      setCount: record.setCount,
      sides: record.sides
    });
  };

  return (
    <form onSubmit={handleSubmit} className="stack match-form" data-testid="match-form">
      {quickDefaults ? (
        <div className="quick-entry-row">
          <button type="button" onClick={applyQuickEntry}>
            Use last match defaults
          </button>
        </div>
      ) : null}
      <div className="field-block">
        <span className="field-label">Date</span>
        <DatePickerField value={date} onChange={setDate} ariaLabel="Match date" />
      </div>

      <label>
        Status
        <SelectField
          value={status}
          onChange={(value) => setStatus(value as MatchStatus)}
          options={[
            { value: 'Completed', label: 'Completed' },
            { value: 'Not completed', label: 'Not completed' }
          ]}
          testId="match-status"
        />
      </label>

      <label>
        Format
        <SelectField
          value={format}
          onChange={(value) => {
            const next = value as MatchFormat;
            setFormat(next);
            setSides((prev) => ({
              A: Array.from({ length: next === 'Singles' ? 1 : 2 }, (_, i) => prev.A[i] ?? ''),
              B: Array.from({ length: next === 'Singles' ? 1 : 2 }, (_, i) => prev.B[i] ?? '')
            }));
          }}
          options={[
            { value: 'Singles', label: 'Singles' },
            { value: 'Doubles', label: 'Doubles' }
          ]}
          testId="match-format"
        />
      </label>

      <label>
        Set count
        <SelectField
          value={String(setCount)}
          onChange={(value) => handleSetCount(Number(value))}
          options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
          testId="set-count"
        />
      </label>

      <section className="side-picker">
        <h3>Side A</h3>
        {Array.from({ length: sideSlots }).map((_, idx) => (
          <SelectField
            key={`a-${idx}`}
            value={normalizedSides.A[idx] ?? ''}
            onChange={(value) => updateSide('A', idx, value)}
            testId={`side-a-${idx}`}
            placeholder="Select player"
            options={[{ value: '', label: 'Select player' }, ...playerOptions]}
          />
        ))}
      </section>

      <section className="side-picker">
        <h3>Side B</h3>
        {Array.from({ length: sideSlots }).map((_, idx) => (
          <SelectField
            key={`b-${idx}`}
            value={normalizedSides.B[idx] ?? ''}
            onChange={(value) => updateSide('B', idx, value)}
            testId={`side-b-${idx}`}
            placeholder="Select player"
            options={[{ value: '', label: 'Select player' }, ...playerOptions]}
          />
        ))}
      </section>

      <section className="sets-editor">
        <h3>Sets</h3>
        {Array.from({ length: setCount }).map((_, idx) => (
          <div key={idx} className="set-edit-row">
            <span>Set {idx + 1}</span>
            <div className="score-stepper">
              <input
                type="number"
                className="score-stepper-input"
                placeholder="A"
                value={sets[idx]?.scoreA ?? ''}
                onChange={(e) => updateScore(idx, 'scoreA', e.target.value)}
                min={0}
              />
              <div className="score-stepper-controls">
                <button
                  type="button"
                  className="score-stepper-btn"
                  onClick={() => stepScore(idx, 'scoreA', 1)}
                  aria-label={`Increase A score for set ${idx + 1}`}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="score-stepper-btn"
                  onClick={() => stepScore(idx, 'scoreA', -1)}
                  aria-label={`Decrease A score for set ${idx + 1}`}
                >
                  ▼
                </button>
              </div>
            </div>
            <div className="score-stepper">
              <input
                type="number"
                className="score-stepper-input"
                placeholder="B"
                value={sets[idx]?.scoreB ?? ''}
                onChange={(e) => updateScore(idx, 'scoreB', e.target.value)}
                min={0}
              />
              <div className="score-stepper-controls">
                <button
                  type="button"
                  className="score-stepper-btn"
                  onClick={() => stepScore(idx, 'scoreB', 1)}
                  aria-label={`Increase B score for set ${idx + 1}`}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="score-stepper-btn"
                  onClick={() => stepScore(idx, 'scoreB', -1)}
                  aria-label={`Decrease B score for set ${idx + 1}`}
                >
                  ▼
                </button>
              </div>
            </div>
            <SelectField
              value={sets[idx]?.winnerSide ?? ''}
              onChange={(value) => updateSet(idx, { winnerSide: (value || undefined) as Side | undefined })}
              testId={`set-winner-${idx}`}
              options={[
                { value: '', label: 'Winner' },
                { value: 'A', label: 'A' },
                { value: 'B', label: 'B' }
              ]}
            />
          </div>
        ))}
      </section>

      {status === 'Completed' ? (
        <label>
          Explicit match winner side (only needed if set result tied)
          <SelectField
            value={matchWinnerSide ?? ''}
            onChange={(value) => setMatchWinnerSide((value || undefined) as Side | undefined)}
            options={[
              { value: '', label: 'Auto from sets' },
              { value: 'A', label: 'A' },
              { value: 'B', label: 'B' }
            ]}
          />
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
