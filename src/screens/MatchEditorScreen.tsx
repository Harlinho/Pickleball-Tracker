import { useNavigate, useParams } from 'react-router-dom';
import { MatchForm } from '../components/MatchForm';
import { useAppData } from '../state/AppDataContext';

export const MatchEditorScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { matches, players, saveMatchRecord } = useAppData();

  const initial = id ? matches.find((m) => m.id === id) : undefined;

  return (
    <section className="screen stack">
      <h2>{id ? 'Edit Match' : 'New Match'}</h2>
      <MatchForm
        players={players}
        initial={initial}
        onSave={async (match) => {
          await saveMatchRecord(match);
          navigate(`/matches/${match.id}`);
        }}
      />
    </section>
  );
};
