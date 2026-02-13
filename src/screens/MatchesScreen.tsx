import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DatePickerField } from '../components/DatePickerField';
import { MatchCard } from '../components/MatchCard';
import { NewPlayerModal } from '../components/NewPlayerModal';
import { SelectField } from '../components/SelectField';
import { useAppData } from '../state/AppDataContext';
import type { MatchFilters } from '../types';

const defaultFilters: MatchFilters = {
  status: 'All',
  playerId: '',
  dateFrom: '',
  dateTo: ''
};

export const MatchesScreen = () => {
  const { matches, players, createPlayer } = useAppData();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<MatchFilters>(defaultFilters);
  const [showNewPlayerModal, setShowNewPlayerModal] = useState(false);

  const filtered = useMemo(() => {
    return matches
      .filter((match) => {
        if (filters.status !== 'All' && match.status !== filters.status) return false;
        if (filters.playerId && !match.sides.A.concat(match.sides.B).includes(filters.playerId)) return false;
        if (filters.dateFrom && match.date < filters.dateFrom) return false;
        if (filters.dateTo && match.date > filters.dateTo) return false;

        if (!search.trim()) return true;
        const lower = search.toLowerCase();
        const names = [...match.sides.A, ...match.sides.B]
          .map((id) => players.find((p) => p.id === id)?.name.toLowerCase() ?? '')
          .join(' ');
        return names.includes(lower) || match.date.includes(lower);
      })
      .sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`));
  }, [filters, matches, players, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((match) => {
      const list = map.get(match.date) ?? [];
      list.push(match);
      map.set(match.date, list);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const [activeDate, setActiveDate] = useState<string | undefined>(() => grouped[0]?.[0]);
  const effectiveActive = grouped.find(([date]) => date === activeDate)?.[0] ?? grouped[0]?.[0];

  return (
    <section className="screen stack" data-testid="matches-screen">
      <div className="toolbar">
        <input
          placeholder="Search player or date"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="global-search"
        />
        <button
          type="button"
          className="primary"
          onClick={() => setShowNewPlayerModal(true)}
        >
          + New Player
        </button>
        <Link to="/matches/new" className="primary button-link" data-testid="new-match-btn">
          + New Match
        </Link>
      </div>

      <div className="filters-row">
        <SelectField
          value={filters.status}
          onChange={(value) => setFilters((prev) => ({ ...prev, status: value as MatchFilters['status'] }))}
          options={[
            { value: 'All', label: 'All statuses' },
            { value: 'Completed', label: 'Completed' },
            { value: 'Not completed', label: 'Not completed' }
          ]}
        />
        <SelectField
          value={filters.playerId}
          onChange={(value) => setFilters((prev) => ({ ...prev, playerId: value }))}
          options={[{ value: '', label: 'All players' }, ...players.map((p) => ({ value: p.id, label: p.name }))]}
          testId="player-filter"
        />
        <DatePickerField
          value={filters.dateFrom}
          onChange={(value) => setFilters((prev) => ({ ...prev, dateFrom: value }))}
          ariaLabel="Date from"
        />
        <DatePickerField
          value={filters.dateTo}
          onChange={(value) => setFilters((prev) => ({ ...prev, dateTo: value }))}
          ariaLabel="Date to"
        />
        <button type="button" onClick={() => setFilters(defaultFilters)}>
          Clear
        </button>
      </div>

      {grouped.length ? (
        <>
          <div className="date-chips" data-testid="date-chip-row">
            <button
              className="chip"
              onClick={() => setActiveDate(grouped[0][0])}
              data-testid="today-jump-btn"
              type="button"
            >
              Today
            </button>
            {grouped.map(([date]) => (
              <button
                type="button"
                key={date}
                className={`chip ${effectiveActive === date ? 'active' : ''}`}
                onClick={() => setActiveDate(date)}
                data-testid={`date-chip-${date}`}
              >
                {date}
              </button>
            ))}
          </div>

          {grouped.map(([date, dayMatches]) => (
            <section
              key={date}
              className={`date-group ${effectiveActive === date ? 'expanded' : 'collapsed'}`}
              data-testid={`date-group-${date}`}
            >
              <h3>{date}</h3>
              {effectiveActive === date
                ? dayMatches.map((match) => <MatchCard key={match.id} match={match} players={players} />)
                : null}
            </section>
          ))}
        </>
      ) : (
        <div className="empty-state">
          <div className="illustration" />
          <h3>No matches found</h3>
          <p>Add a match or clear filters.</p>
          <Link to="/matches/new" className="button-link primary">
            Create your first match
          </Link>
        </div>
      )}

      <NewPlayerModal
        open={showNewPlayerModal}
        onClose={() => setShowNewPlayerModal(false)}
        onCreate={async (payload) => {
          await createPlayer(payload);
        }}
      />
    </section>
  );
};
