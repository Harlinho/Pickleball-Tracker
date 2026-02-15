import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { matches, players, createPlayer } = useAppData();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<MatchFilters>(defaultFilters);
  const [showNewPlayerModal, setShowNewPlayerModal] = useState(false);
  const [viewMode, setViewMode] = useState<'recent' | 'date' | 'all'>('recent');
  const [quickRange, setQuickRange] = useState<'none' | 'this-week' | 'last-week' | 'this-month'>('none');
  const [showMobileFilters, setShowMobileFilters] = useState(true);
  const [visibleGroupCount, setVisibleGroupCount] = useState(6);

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

  const recentDates = useMemo(() => grouped.slice(0, 5).map(([date]) => date), [grouped]);
  const recentMatches = useMemo(() => filtered.slice(0, 5), [filtered]);
  const [activeDate, setActiveDate] = useState<string | undefined>(undefined);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const apply = () => setShowMobileFilters(!media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  const applyQuickRange = (range: 'this-week' | 'last-week' | 'this-month') => {
    const now = new Date();
    const toISO = (date: Date) => date.toISOString().slice(0, 10);
    let from = '';
    let to = '';

    if (range === 'this-week' || range === 'last-week') {
      const weekStart = new Date(now);
      const day = weekStart.getDay() || 7;
      weekStart.setDate(weekStart.getDate() - day + 1);
      if (range === 'last-week') {
        weekStart.setDate(weekStart.getDate() - 7);
      }
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      from = toISO(weekStart);
      to = toISO(weekEnd);
    } else {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      from = toISO(monthStart);
      to = toISO(monthEnd);
    }

    setFilters((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
    setQuickRange(range);
    setViewMode('all');
  };

  useEffect(() => {
    if (!grouped.length) {
      setActiveDate(undefined);
      setViewMode('recent');
      return;
    }
    if (!activeDate || !grouped.some(([date]) => date === activeDate)) {
      setActiveDate(grouped[0][0]);
      if (viewMode === 'date') {
        setViewMode('recent');
      }
    }
  }, [activeDate, grouped, viewMode]);

  useEffect(() => {
    if (viewMode !== 'all') return;
    setVisibleGroupCount(6);
  }, [viewMode, filters.dateFrom, filters.dateTo, search, filters.playerId, filters.status]);

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
          className="primary desktop-only-action"
          onClick={() => setShowNewPlayerModal(true)}
        >
          + New Player
        </button>
        <Link to="/matches/new" className="primary button-link desktop-only-action" data-testid="new-match-btn">
          + New Match
        </Link>
      </div>

      <div className="quick-range-row">
        <button
          type="button"
          className={`chip ${quickRange === 'this-week' ? 'active' : ''}`}
          onClick={() => applyQuickRange('this-week')}
        >
          This week
        </button>
        <button
          type="button"
          className={`chip ${quickRange === 'last-week' ? 'active' : ''}`}
          onClick={() => applyQuickRange('last-week')}
        >
          Last week
        </button>
        <button
          type="button"
          className={`chip ${quickRange === 'this-month' ? 'active' : ''}`}
          onClick={() => applyQuickRange('this-month')}
        >
          This month
        </button>
      </div>

      <div className={`filters-row ${showMobileFilters ? '' : 'filters-collapsed'}`}>
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
          onChange={(value) => {
            setQuickRange('none');
            setFilters((prev) => ({ ...prev, dateFrom: value }));
          }}
          ariaLabel="Date from"
        />
        <DatePickerField
          value={filters.dateTo}
          onChange={(value) => {
            setQuickRange('none');
            setFilters((prev) => ({ ...prev, dateTo: value }));
          }}
          ariaLabel="Date to"
        />
        <button
          type="button"
          onClick={() => {
            setQuickRange('none');
            setFilters(defaultFilters);
          }}
        >
          Clear
        </button>
      </div>

      {grouped.length ? (
        <>
          <div className="date-chips" data-testid="date-chip-row">
            <button
              className={`chip ${viewMode === 'recent' ? 'active' : ''}`}
              onClick={() => setViewMode('recent')}
              data-testid="today-jump-btn"
              type="button"
            >
              Recent
            </button>
            {recentDates.map((date) => (
              <button
                type="button"
                key={date}
                className={`chip ${viewMode === 'date' && activeDate === date ? 'active' : ''}`}
                onClick={() => {
                  setActiveDate(date);
                  setViewMode('date');
                }}
                data-testid={`date-chip-${date}`}
              >
                {date}
              </button>
            ))}
            <button
              type="button"
              className={`chip ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('all');
                setVisibleGroupCount(6);
              }}
              data-testid="all-history-btn"
            >
              All history
            </button>
          </div>

          {viewMode === 'recent' ? (
            <section className="date-group expanded" data-testid="recent-matches-group">
              <h3>Recent matches</h3>
              {recentMatches.map((match) => (
                <MatchCard key={match.id} match={match} players={players} />
              ))}
            </section>
          ) : null}

          {viewMode === 'date' && activeDate ? (
            <section className="date-group expanded" data-testid={`date-group-${activeDate}`}>
              <h3>{activeDate}</h3>
              {(grouped.find(([date]) => date === activeDate)?.[1] ?? []).map((match) => (
                <MatchCard key={match.id} match={match} players={players} />
              ))}
            </section>
          ) : null}

          {viewMode === 'all'
            ? grouped.slice(0, visibleGroupCount).map(([date, dayMatches]) => (
                <section key={date} className="date-group expanded" data-testid={`date-group-${date}`}>
                  <h3>{date}</h3>
                  {dayMatches.map((match) => (
                    <MatchCard key={match.id} match={match} players={players} />
                  ))}
                </section>
              ))
            : null}
          {viewMode === 'all' && grouped.length > visibleGroupCount ? (
            <button type="button" onClick={() => setVisibleGroupCount((prev) => prev + 6)}>
              Show older dates
            </button>
          ) : null}
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
      <div className="mobile-action-bar">
        <button type="button" className="primary" onClick={() => setShowNewPlayerModal(true)}>
          + Player
        </button>
        <button type="button" className="primary" onClick={() => navigate('/matches/new')}>
          + Match
        </button>
        <button type="button" onClick={() => setShowMobileFilters((prev) => !prev)}>
          {showMobileFilters ? 'Hide filters' : 'Filters'}
        </button>
      </div>
    </section>
  );
};
