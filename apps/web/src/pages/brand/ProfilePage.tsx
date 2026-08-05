import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ExternalLink, Lock, Check } from 'lucide-react';
import axios from 'axios';
import { useBrandProfile, useUpdateBrandProfile } from '../../hooks/useBrandProfile';
import type { BrandProfile, UpdateBrandPayload } from '../../types/api';
import Plate from '../../components/primitives/Plate';
import PlateField from '../../components/primitives/PlateField';
import PlateTextarea from '../../components/primitives/PlateTextarea';
import NicheSelector from '../../components/primitives/NicheSelector';
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
// Tela 16 do redesign 2a — espelho exato da Ficha da creator (tela 8): marca
// e creator usam a mesma placa. O mock mostra "Editar" como rows
// label+valor+chevron (edição em separado por campo); mantido editável
// INLINE nessa mesma tela via PlateField/PlateTextarea (dark), mesmo desvio
// já registrado na Ficha — não está entre as 16 telas do handoff criar uma
// tela/modal de edição por campo.

function ProfileForm({ profile }: { profile: BrandProfile }) {
  const update = useUpdateBrandProfile();
  const [justSaved, setJustSaved] = useState(false);

  const {
    register,
    control,
    watch,
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

      {/* Editar — campos reais (a edição é sempre inline nessa tela) */}
      <h2 className="mb-5 mt-[34px] font-display text-d-xs text-foreground">Editar</h2>
      <div className="flex flex-col gap-6">
        <PlateField label="Nome da marca" error={errors.name?.message} {...register('name')} />
        <PlateField
          label="Logo (URL)"
          placeholder="https://cdn.suamarca.com/logo.png"
          error={errors.logoUrl?.message}
          {...register('logoUrl')}
        />
        <PlateTextarea
          label="Bio"
          placeholder="Conte sobre sua marca para as creators."
          error={errors.bio?.message}
          {...register('bio')}
        />
        <div>
          <p className="mb-2 text-[12px] text-[#75756E]">Nichos</p>
          <Controller
            name="niches"
            control={control}
            render={({ field }) => (
              <NicheSelector value={field.value} onChange={field.onChange} extraOptions={profile.niches} />
            )}
          />
        </div>
        <PlateField
          label="Website"
          placeholder="https://suamarca.com"
          error={errors.website?.message}
          {...register('website')}
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
