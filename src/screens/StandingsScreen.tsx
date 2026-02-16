import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Last5Dots } from '../components/Last5Dots';
import { useAppData } from '../state/AppDataContext';
import { computeStandings } from '../utils/stats';

export const StandingsScreen = () => {
  const { players, matches, createPlayer } = useAppData();
  const [searchPlayers, setSearchPlayers] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');

  const standings = useMemo(
    () =>
      computeStandings(players, matches, false).filter((row) =>
        row.playerName.toLowerCase().includes(searchPlayers.toLowerCase())
      ),
    [players, matches, searchPlayers]
  );

  return (
    <section className="screen stack" data-testid="standings-screen">
      <section className="panel manage-players-panel">
        <h3>Manage players</h3>
        <div className="manage-row">
          <input
            placeholder="Search players"
            value={searchPlayers}
            onChange={(e) => setSearchPlayers(e.target.value)}
            data-testid="standings-player-search"
          />
        </div>
        <div className="manage-row">
          <input
            placeholder="New player name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
          />
          <button
            type="button"
            onClick={async () => {
              const name = newPlayerName.trim();
              if (!name) return;
              await createPlayer(name);
              setNewPlayerName('');
            }}
          >
            Add player
          </button>
        </div>
      </section>

      <div className="table-wrap">
        <table className="standings-table" data-testid="standings-table">
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '12%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th title="Matches Played">MP</th>
              <th title="Wins">W</th>
              <th title="Losses">L</th>
              <th title="Sets Won">SW</th>
              <th title="Sets Lost">SL</th>
              <th title="Set Difference (Sets Won minus Sets Lost)">SD</th>
              <th title="Most recent five match results">Last 5</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, idx) => (
              <tr key={row.playerId}>
                <td>{idx + 1}</td>
                <td>
                  <Link to={`/players/${row.playerId}`} data-testid={`player-link-${row.playerId}`}>
                    {row.playerName}
                  </Link>
                </td>
                <td>{row.mp}</td>
                <td>{row.wins}</td>
                <td>{row.losses}</td>
                <td>{row.setsWon}</td>
                <td>{row.setsLost}</td>
                <td>{row.setDiff}</td>
                <td>
                  <Last5Dots form={row.form} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!standings.length ? <p className="muted">No standings rows for current filters.</p> : null}
      </div>
    </section>
  );
};
