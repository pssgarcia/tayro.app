import ProgramsList from './ProgramsList';
import { useT } from '../../i18n';

export default function BrowseProgramsPage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
      <ProgramsList title={t.app.creator.abertos.titulo} />
    </div>
  );
}
