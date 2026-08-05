import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import Plate from './Plate';
import PlateField from './PlateField';
import PlateTextarea from './PlateTextarea';
import PlateActionBar from './PlateActionBar';
import { cn } from '../../lib/utils';

// Row (label + valor + chevron) que abre um modal placa-formulário de campo
// único pra editar — padrão da Ficha/Perfil (mock 3f/4h): "os 4 Card viram
// uma lista", cada linha edita seu campo em separado, não inline na tela.

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

export default function PlateEditField({
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
  const fieldId = `plate-edit-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

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
      <button type="button" onClick={openModal} className="flex w-full items-center gap-3.5 text-left">
        <span className="min-w-0 flex-1">
          <p className="text-xs text-[#75756E]">{label}</p>
          <p className={cn('mt-[5px] truncate text-sm', value ? 'text-foreground' : 'text-[#55554F]')}>
            {value || emptyLabel}
          </p>
          {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
        </span>
        <ChevronRight size={14} className="shrink-0 text-[#4A4A46]" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div className="w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
            <Plate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
              <div className="px-6 pb-[26px] pt-[30px]">
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
              <PlateActionBar
                secondary={{ label: 'Cancelar', onClick: () => setOpen(false), width: 100 }}
                primary={{ label: 'Salvar', onClick: handleSave }}
              />
            </Plate>
          </div>
        </div>
      )}
    </>
  );
}
