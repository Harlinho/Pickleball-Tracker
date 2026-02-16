import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { MatchDetailScreen } from './screens/MatchDetailScreen';
import { MatchEditorScreen } from './screens/MatchEditorScreen';
import { MatchesScreen } from './screens/MatchesScreen';
import { PlayerProfileScreen } from './screens/PlayerProfileScreen';
import { StandingsScreen } from './screens/StandingsScreen';
import { FuturisticPickleballLogo } from './components/FuturisticPickleballLogo';
import { useAppData } from './state/AppDataContext';

const ShellHeader = () => {
  return (
    <header className="app-header">
      <div>
        <FuturisticPickleballLogo />
      </div>
      <nav className="tabs" aria-label="Main tabs">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          Matches
        </NavLink>
        <NavLink to="/standings" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          Standings
        </NavLink>
      </nav>
    </header>
  );
};

export const App = () => {
  const { loading } = useAppData();

  useEffect(() => {
    document.body.removeAttribute('data-theme');
  }, []);

  if (loading) {
    return <main className="app-shell">Loading journal...</main>;
  }

  return (
    <main className="app-shell">
      <ShellHeader />
      <Routes>
        <Route path="/" element={<MatchesScreen />} />
        <Route path="/standings" element={<StandingsScreen />} />
        <Route path="/matches/new" element={<MatchEditorScreen />} />
        <Route path="/matches/:id" element={<MatchDetailScreen />} />
        <Route path="/matches/:id/edit" element={<MatchEditorScreen />} />
        <Route path="/players/:id" element={<PlayerProfileScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
};
