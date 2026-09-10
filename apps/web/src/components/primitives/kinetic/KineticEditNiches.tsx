import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import KineticPlate from './KineticPlate';
import KineticActions from './KineticActions';
import NicheSelector from './NicheSelector';
import { useT } from '../../../i18n';

// Mesmo padrão do KineticEditField (row + modal placa-formulário), mas pro
// caso de nichos — o valor não é texto, é um NicheSelector(variant="plate").

interface Props {
  label: string;
  value: string[];
  onSave: (value: string[]) => void;
  extraOptions?: string[];
}

export default function KineticEditNiches({ label, value, onSave, extraOptions }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);

  function openModal() {
    setDraft(value);
    setOpen(true);
  }

  function handleSave() {
    onSave(draft);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="flex w-full items-center gap-4 border-b border-kinetic-gray py-4 text-left transition-colors hover:bg-kinetic-dark"
      >
        <span className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
            {label}
          </p>
          <p
            className={
              value.length
                ? 'mt-2 truncate text-[15px] text-foreground'
                : 'mt-2 text-[15px] text-[#55554f]'
            }
          >
            {value.length
              ? value.map((n) => n[0].toUpperCase() + n.slice(1)).join(', ')
              : 'adicionar'}
          </p>
        </span>
        <ChevronRight size={14} className="shrink-0 text-kinetic-border" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div className="w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
            <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
              <div className="px-6 pb-7 pt-11">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-[#6a6a64]">
                  {label}
                </p>
                <NicheSelector
                  value={draft}
                  onChange={setDraft}
                  variant="plate"
                  extraOptions={extraOptions}
                />
              </div>
              <KineticActions
                actions={[
                  { label: t.app.acoes.cancelar, onClick: () => setOpen(false), width: 130 },
                  { label: t.app.acoes.salvar, onClick: handleSave, primary: true },
                ]}
              />
            </KineticPlate>
          </div>
        </div>
      )}
    </>
  );
}
