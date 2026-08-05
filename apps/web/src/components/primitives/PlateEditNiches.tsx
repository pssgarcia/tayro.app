import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import Plate from './Plate';
import PlateActionBar from './PlateActionBar';
import NicheSelector from './NicheSelector';

// Mesmo padrão do PlateEditField (row + modal placa-formulário), mas pro
// caso de nichos — o valor não é texto, é um NicheSelector(variant="plate").

interface Props {
  label: string;
  value: string[];
  onSave: (value: string[]) => void;
  extraOptions?: string[];
}

export default function PlateEditNiches({ label, value, onSave, extraOptions }: Props) {
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
      <button type="button" onClick={openModal} className="flex w-full items-center gap-3.5 text-left">
        <span className="min-w-0 flex-1">
          <p className="text-xs text-[#75756E]">{label}</p>
          <p className={value.length ? 'mt-[5px] truncate text-sm text-foreground' : 'mt-[5px] text-sm text-[#55554F]'}>
            {value.length ? value.map((n) => n[0].toUpperCase() + n.slice(1)).join(', ') : 'adicionar'}
          </p>
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
                <p className="mb-3 text-[11px] text-plate-muted">{label}</p>
                <NicheSelector value={draft} onChange={setDraft} variant="plate" extraOptions={extraOptions} />
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
