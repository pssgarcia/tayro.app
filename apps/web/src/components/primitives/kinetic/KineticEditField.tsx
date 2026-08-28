import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import KineticPlate from './KineticPlate';
import KineticActions from './KineticActions';
import PlateField from '../PlateField';
import PlateTextarea from '../PlateTextarea';
import { cn } from '../../../lib/utils';

// Row (rótulo + valor + chevron) que abre um modal placa-formulário de campo
// único pra editar — padrão do Perfil: "os 4 Card viram uma lista", cada linha
// edita seu campo em separado, não inline na tela.
//
// Vivia em `primitives/PlateEditField`; mudou de casa na migração pro Kinetic.
// Migrado NO LUGAR (sem criar um irmão Kinetic) porque só as duas telas de
// Perfil o usam — não havia raio de alcance pra proteger, ao contrário do
// `Plate`/`PlateActionBar`, que 21 e 13 telas consomem.

interface Props {
  label: string;
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'url' | 'email';
  multiline?: boolean;
  error?: string;
  /** Texto do valor vazio — default "adicionar" (README: Ficha/Perfil da marca). */
  emptyLabel?: string;
}

export default function KineticEditField({
  label,
  value,
  onSave,
  placeholder,
  type = 'text',
  multiline,
  error,
  emptyLabel = 'adicionar',
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const fieldId = `kinetic-edit-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

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
            className={cn(
              'mt-2 truncate text-[15px]',
              value ? 'text-foreground' : 'text-[#55554f]',
            )}
          >
            {value || emptyLabel}
          </p>
          {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
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
                {multiline ? (
                  <PlateTextarea
                    id={fieldId}
                    label={label}
                    variant="plate"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={placeholder}
                    autoFocus
                  />
                ) : (
                  <PlateField
                    id={fieldId}
                    label={label}
                    variant="plate"
                    type={type}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={placeholder}
                    autoFocus
                  />
                )}
              </div>
              <KineticActions
                actions={[
                  { label: 'Cancelar', onClick: () => setOpen(false), width: 130 },
                  { label: 'Salvar', onClick: handleSave, primary: true },
                ]}
              />
            </KineticPlate>
          </div>
        </div>
      )}
    </>
  );
}
