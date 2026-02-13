import { Link } from 'react-router-dom';
import type { Player } from '../types';

export const PlayerBadge = ({ player }: { player?: Player }) => {
  if (!player) return <span className="missing">Unknown</span>;
  return (
    <Link className="player-link" to={`/players/${player.id}`}>
      <span className="avatar" style={{ background: player.avatarColor ?? '#0ea5e9' }} aria-hidden />
      {player.name}
    </Link>
  );
};
