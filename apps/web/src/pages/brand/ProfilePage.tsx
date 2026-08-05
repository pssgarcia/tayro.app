import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ExternalLink, Lock, Check } from 'lucide-react';
import axios from 'axios';
import { useBrandProfile, useUpdateBrandProfile } from '../../hooks/useBrandProfile';
import type { BrandProfile, UpdateBrandPayload } from '../../types/api';
import Plate from '../../components/primitives/Plate';
import PlateEditField from '../../components/primitives/PlateEditField';
import PlateEditNiches from '../../components/primitives/PlateEditNiches';
import { cn } from '../../lib/utils';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100, 'Máximo 100 caracteres'),
  website: z.string().url('URL inválida (inclua https://)').max(2048).optional().or(z.literal('')),
  logoUrl: z.string().url('URL inválida (inclua https://)').max(2048).optional().or(z.literal('')),
  bio: z.string().max(500, 'Máximo 500 caracteres').optional(),
  niches: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

// ─── Form ─────────────────────────────────────────────────────────────────────
// Tela 16 do redesign 2a — espelho exato do Perfil da creator (tela 8): marca
// e creator usam a mesma placa. "Editar" são rows label+valor+chevron que
// abrem um modal placa-formulário de campo único (PlateEditField/
// PlateEditNiches) — padrão literal do mock, a pedido do usuário.

function ProfileForm({ profile }: { profile: BrandProfile }) {
  const update = useUpdateBrandProfile();
  const [justSaved, setJustSaved] = useState(false);

  const {
    watch,
    setValue,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile.name,
      website: profile.website ?? '',
      logoUrl: profile.logoUrl ?? '',
      bio: profile.bio ?? '',
      niches: profile.niches,
    },
  });

  const watchedName = watch('name');
  const watchedLogo = watch('logoUrl');
  const watchedBio = watch('bio');
  const watchedWebsite = watch('website');
  const watchedNiches = watch('niches');

  const onSubmit = async (values: FormValues) => {
    const payload: UpdateBrandPayload = {
      name: values.name,
      niches: values.niches,
      website: values.website ?? '',
      logoUrl: values.logoUrl ?? '',
      bio: values.bio ?? '',
    };

    try {
      await update.mutateAsync(payload);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.status === 429
          ? 'Muitas tentativas. Aguarde alguns minutos.'
          : 'Não foi possível salvar. Tente novamente.';
      setError('root', { message: msg });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Placa — preview ao vivo do cabeçalho do link público (/apply/:id) */}
      <Plate marks="all" className="max-w-[520px]">
        <div className="flex items-center gap-3.5">
          <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[4px] bg-plate-fill">
            {watchedLogo && <img src={watchedLogo} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-plate-muted">Programa de</p>
            <p className="mt-[4px] truncate font-display text-[21px] font-bold tracking-[-.045em] text-plate-ink">
              {watchedName || '—'}
            </p>
          </div>
        </div>

        {watchedBio && (
          <p className="mt-[26px] text-[15px] leading-[1.5] text-plate-body">{watchedBio}</p>
        )}

        {watchedNiches.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-[7px]">
            {watchedNiches.map((n) => (
              <span
                key={n}
                className="rounded-[3px] border border-[rgba(14,14,14,.16)] px-[9px] py-[5px] text-[11px] capitalize text-[#6A6A64]"
              >
                {n}
              </span>
            ))}
          </div>
        )}

        {watchedWebsite && (
          <p className="mt-5 flex items-center gap-[5px] text-[13px] text-plate-muted">
            {watchedWebsite.replace(/^https?:\/\//, '')}
            <ExternalLink size={11} className="shrink-0" />
          </p>
        )}
      </Plate>

      {errors.root && <p className="mt-6 text-sm text-destructive">{errors.root.message}</p>}

      {/* Editar — rows que abrem um modal de campo único (padrão do mock) */}
      <h2 className="mb-5 mt-[34px] font-display text-d-xs text-foreground">Editar</h2>
      <div className="flex flex-col gap-[22px]">
        <PlateEditField
          label="Nome da marca"
          value={watchedName}
          error={errors.name?.message}
          onSave={(v) => setValue('name', v, { shouldDirty: true, shouldValidate: true })}
        />
        <PlateEditField
          label="Logo (URL)"
          value={watchedLogo ?? ''}
          placeholder="https://cdn.suamarca.com/logo.png"
          error={errors.logoUrl?.message}
          onSave={(v) => setValue('logoUrl', v, { shouldDirty: true, shouldValidate: true })}
        />
        <PlateEditField
          label="Bio"
          value={watchedBio ?? ''}
          multiline
          placeholder="Conte sobre sua marca para as creators."
          error={errors.bio?.message}
          onSave={(v) => setValue('bio', v, { shouldDirty: true, shouldValidate: true })}
        />
        <PlateEditNiches
          label="Nichos"
          value={watchedNiches}
          extraOptions={profile.niches}
          onSave={(v) => setValue('niches', v, { shouldDirty: true })}
        />
        <PlateEditField
          label="Website"
          value={watchedWebsite ?? ''}
          placeholder="https://suamarca.com"
          error={errors.website?.message}
          onSave={(v) => setValue('website', v, { shouldDirty: true, shouldValidate: true })}
        />
      </div>

      <div className="my-[26px] h-px bg-muted" />

      <div className="flex items-center gap-2.5 text-[#6E6E68]">
        <Lock size={13} className="shrink-0" />
        <p className="flex-1 text-sm">{profile.email}</p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || (!isDirty && !justSaved)}
        className={cn(
          'mb-5 mt-[26px] flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-lime font-display text-[15px] font-semibold tracking-[-.02em] text-background transition-opacity hover:opacity-90',
          'disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        {isSubmitting ? 'Salvando…' : justSaved && !isDirty ? (
          <>
            Salvo <Check size={16} />
          </>
        ) : (
          'Salvar'
        )}
      </button>
    </form>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-[180px] rounded-lg bg-secondary" />
      <div className="space-y-[22px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded bg-secondary" />
        ))}
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: profile, isLoading, isError } = useBrandProfile();

  return (
    <div className="mx-auto max-w-5xl px-6 pt-[14px]">
      <h1 className="font-display text-d-md text-foreground">Marca</h1>
      <p className="mb-[22px] mt-2 text-[13px] text-[#75756E]">
        É o que a creator vê primeiro no seu link.
      </p>

      {isLoading && <Skeleton />}

      {isError && <p className="text-sm text-destructive">Erro ao carregar o perfil. Tente novamente.</p>}

      {!isLoading && !isError && profile && <ProfileForm profile={profile} />}
    </div>
  );
}
