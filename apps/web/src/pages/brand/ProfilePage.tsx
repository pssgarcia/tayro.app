import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ExternalLink, Check } from 'lucide-react';
import axios from 'axios';
import { useBrandProfile, useUpdateBrandProfile } from '../../hooks/useBrandProfile';
import type { BrandProfile, UpdateBrandPayload } from '../../types/api';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticEditField from '../../components/primitives/kinetic/KineticEditField';
import KineticEditNiches from '../../components/primitives/kinetic/KineticEditNiches';
import AccountSection from '../../components/account/AccountSection';
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
// abrem um modal placa-formulário de campo único (KineticEditField/
// KineticEditNiches) — padrão literal do mock, a pedido do usuário.

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

  const initials = (watchedName || profile.name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

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
      <KineticPlate marks="all" className="max-w-[520px]">
        <div className="flex items-center gap-3.5">
          {/* Sem logo, iniciais em vez de um retângulo cinza vazio: mesmo
              fallback que o resto do produto usa para creator sem foto. */}
          <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-[#cfcfc8]">
            {watchedLogo ? (
              <img src={watchedLogo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-[19px] font-semibold text-[#6a6a64]">
                {initials || '?'}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#6a6a64]">Campanha de</p>
            <p className="mt-[4px] truncate font-display text-[21px] font-bold tracking-[-.045em] text-black">
              {watchedName || '—'}
            </p>
          </div>
        </div>

        {watchedBio && (
          <p className="mt-[26px] text-[15px] leading-[1.5] text-[#3a3a34]">{watchedBio}</p>
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
          <p className="mt-5 flex items-center gap-[5px] text-[13px] text-[#6a6a64]">
            {watchedWebsite.replace(/^https?:\/\//, '')}
            <ExternalLink size={11} className="shrink-0" />
          </p>
        )}
      </KineticPlate>

      {errors.root && <p className="mt-6 text-sm text-destructive">{errors.root.message}</p>}

      {/* Editar — rows que abrem um modal de campo único (padrão do mock) */}
      <p className="mb-6 mt-11 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
        Editar
      </p>
      <div className="flex flex-col gap-[22px]">
        <KineticEditField
          label="Nome da marca"
          value={watchedName}
          error={errors.name?.message}
          onSave={(v) => setValue('name', v, { shouldDirty: true, shouldValidate: true })}
        />
        <KineticEditField
          label="Logo (URL)"
          value={watchedLogo ?? ''}
          placeholder="https://cdn.suamarca.com/logo.png"
          error={errors.logoUrl?.message}
          onSave={(v) => setValue('logoUrl', v, { shouldDirty: true, shouldValidate: true })}
        />
        <KineticEditField
          label="Bio"
          value={watchedBio ?? ''}
          multiline
          placeholder="Conte sobre sua marca para quem for se candidatar."
          error={errors.bio?.message}
          onSave={(v) => setValue('bio', v, { shouldDirty: true, shouldValidate: true })}
        />
        <KineticEditNiches
          label="Nichos"
          value={watchedNiches}
          extraOptions={profile.niches}
          onSave={(v) => setValue('niches', v, { shouldDirty: true })}
        />
        <KineticEditField
          label="Website"
          value={watchedWebsite ?? ''}
          placeholder="https://suamarca.com"
          error={errors.website?.message}
          onSave={(v) => setValue('website', v, { shouldDirty: true, shouldValidate: true })}
        />
      </div>

      <div className="my-[26px] h-px bg-muted" />

      <AccountSection email={profile.email} role="BRAND" />

      <button
        type="submit"
        disabled={isSubmitting || (!isDirty && !justSaved)}
        className={cn(
          'mb-6 mt-8 flex min-h-[56px] w-full items-center justify-center gap-2 bg-lime font-mono text-[12px] font-medium uppercase tracking-widest text-black transition-colors hover:bg-white',
          'disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        {isSubmitting ? (
          'Salvando…'
        ) : justSaved && !isDirty ? (
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
      <div className="h-[180px] rounded-lg bg-kinetic-dark" />
      <div className="space-y-[22px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded bg-kinetic-dark" />
        ))}
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: profile, isLoading, isError } = useBrandProfile();

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
      <h1 className="font-display text-[42px] font-bold leading-[.9] tracking-[-.055em] text-foreground sm:text-[56px] lg:text-[72px]">
        Marca
      </h1>
      <p className="mb-[22px] mt-2 text-[13px] text-kinetic-muted">
        É a primeira coisa que aparece no seu link.
      </p>

      {isLoading && <Skeleton />}

      {isError && (
        <p className="text-sm text-destructive">Erro ao carregar o perfil. Tente novamente.</p>
      )}

      {!isLoading && !isError && profile && <ProfileForm profile={profile} />}
    </div>
  );
}
