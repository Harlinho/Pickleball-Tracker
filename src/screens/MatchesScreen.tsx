import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [filters, setFilters] = useState<MatchFilters>(defaultFilters);
  const [showNewPlayerModal, setShowNewPlayerModal] = useState(false);
  const [viewMode, setViewMode] = useState<'recent' | 'date' | 'all'>('recent');
  const [quickRange, setQuickRange] = useState<'none' | 'this-week' | 'last-week'>('none');
  const [showMobileFilters, setShowMobileFilters] = useState(true);
  const [visibleGroupCount, setVisibleGroupCount] = useState(6);

  const filtered = useMemo(() => {
    return matches
      .filter((match) => {
        if (filters.status !== 'All' && match.status !== filters.status) return false;
        if (filters.playerId && !match.sides.A.concat(match.sides.B).includes(filters.playerId)) return false;
        if (filters.dateFrom && match.date < filters.dateFrom) return false;
        if (filters.dateTo && match.date > filters.dateTo) return false;
        return true;
      })
      .sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`));
  }, [filters, matches]);

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
  const hasAnyMatches = matches.length > 0;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const apply = () => setShowMobileFilters(!media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  const applyQuickRange = (range: 'this-week' | 'last-week') => {
    const now = new Date();
    const toISO = (date: Date) => date.toISOString().slice(0, 10);
    let from = '';
    let to = '';

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
  }, [viewMode, filters.dateFrom, filters.dateTo, filters.playerId, filters.status]);

  return (
    <section className="screen stack" data-testid="matches-screen">
      <div className="toolbar">
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

      {hasAnyMatches ? (
        <div className="date-chips" data-testid="date-chip-row">
          <button
            type="button"
            className={`chip ${viewMode === 'all' && quickRange === 'none' ? 'active' : ''}`}
            onClick={() => {
              setQuickRange('none');
              setFilters((prev) => ({ ...prev, dateFrom: '', dateTo: '' }));
              setViewMode('all');
              setVisibleGroupCount(6);
            }}
            data-testid="all-history-btn"
          >
            All history
          </button>
          <button
            className={`chip ${viewMode === 'recent' ? 'active' : ''}`}
            onClick={() => {
              setQuickRange('none');
              setFilters((prev) => ({ ...prev, dateFrom: '', dateTo: '' }));
              setViewMode('recent');
            }}
            data-testid="today-jump-btn"
            type="button"
          >
            Recent
          </button>
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
        </div>
      ) : null}

      {grouped.length ? (
        <>
          

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
          <p>Try another view or clear filters.</p>
          <div className="empty-actions">
            <button
              type="button"
              onClick={() => {
                setQuickRange('none');
                setFilters(defaultFilters);
                setViewMode('all');
                setVisibleGroupCount(6);
              }}
            >
              Show all history
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickRange('none');
                setFilters(defaultFilters);
                setViewMode('recent');
              }}
            >
              Show recent
            </button>
          </div>
          <Link to="/matches/new" className="button-link primary">
            Create a match
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
