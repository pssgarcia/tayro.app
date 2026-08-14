import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ExternalLink, Lock, Check } from 'lucide-react';
import axios from 'axios';
import { useInfluencerProfile, useUpdateInfluencerProfile } from '../../hooks/useInfluencerProfile';
import type { InfluencerProfile, UpdateInfluencerPayload } from '../../types/api';
import Plate from '../../components/primitives/Plate';
import CountUp from '../../components/primitives/CountUp';
import PlateEditField from '../../components/primitives/PlateEditField';
import PlateEditNiches from '../../components/primitives/PlateEditNiches';
import { formatEngagement, formatNumberParts } from '../../utils/format';
import { cn } from '../../lib/utils';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100, 'Máximo 100 caracteres'),
  avatarUrl: z.string().url('URL inválida (inclua https://)').max(2048).optional().or(z.literal('')),
  bio: z.string().max(500, 'Máximo 500 caracteres').optional(),
  city: z.string().max(100, 'Máximo 100 caracteres').optional(),
  tiktokHandle: z.string().max(30, 'Máximo 30 caracteres').optional(),
  niches: z.array(z.string()),
  publicProfileEnabled: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function cleanHandle(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/^@+/, '').toLowerCase().trim();
}

// ─── Link do perfil público ──────────────────────────────────────────────────
//
// Duas guardas, senão a promessa continua quebrada de outro jeito:
// 1) sem instagramHandle não existe URL nenhuma pra oferecer;
// 2) o link só vale com o perfil público JÁ SALVO. `GET /creators/:handle/public`
//    devolve 404 uniforme quando publicProfileEnabled=false (anti-enumeração),
//    então linkar com o perfil privado mandaria a creator pra um 404. Lê de
//    `profile` (servidor), NUNCA do watch() do form: com o toggle recém-ligado
//    e ainda não salvo, o backend continua devolvendo 404.

function PublicProfileLink({
  handle,
  enabled,
}: {
  handle: string | null;
  enabled: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!handle) {
    return (
      <p className="mt-1.5 text-xs leading-[1.5] text-[#75756E]">
        Adicione seu @ do Instagram para ganhar um endereço em tayro.app/c/.
      </p>
    );
  }

  const path = `/c/${handle}`;
  const shareUrl = `https://tayro.app${path}`;

  if (!enabled) {
    return (
      <p className="mt-1.5 text-xs leading-[1.5] text-[#75756E]">
        Ative para as marcas encontrarem você em tayro.app{path}.
      </p>
    );
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {/* Rota pública, fora dos guards — abre em aba nova pra creator não
          perder o formulário se estiver no meio de uma edição. */}
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-lime underline-offset-2 hover:underline"
      >
        tayro.app{path}
        <ExternalLink size={11} className="shrink-0" />
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="text-xs text-[#75756E] underline-offset-2 transition-colors hover:text-foreground hover:underline"
      >
        {copied ? 'Copiado!' : 'Copiar link'}
      </button>
    </div>
  );
}

// ─── Toggle — usa a placa, não o lime (o lime dessa tela é do "Salvar") ──────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative flex h-6 w-11 shrink-0 items-center rounded-full px-[3px] transition-colors',
        checked ? 'justify-end bg-plate' : 'justify-start border border-[#232323] bg-[#1C1C1C]',
      )}
    >
      <span
        className={cn('h-[18px] w-[18px] rounded-full', checked ? 'bg-background' : 'bg-[#55554F]')}
      />
    </button>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────
// "Editar" = rows label+valor+chevron, cada uma abre um modal placa-formulário
// de campo único (PlateEditField/PlateEditNiches) — igual ao mock.

function ProfileForm({ profile }: { profile: InfluencerProfile }) {
  const update = useUpdateInfluencerProfile();
  const [justSaved, setJustSaved] = useState(false);

  const {
    control,
    watch,
    setValue,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile.name,
      avatarUrl: profile.avatarUrl ?? '',
      bio: profile.bio ?? '',
      city: profile.city ?? '',
      tiktokHandle: profile.tiktokHandle ?? '',
      niches: profile.niches,
      publicProfileEnabled: profile.publicProfileEnabled,
    },
  });

  const watchedName = watch('name');
  const watchedAvatar = watch('avatarUrl');
  const watchedBio = watch('bio');
  const watchedNiches = watch('niches');

  const onSubmit = async (values: FormValues) => {
    const payload: UpdateInfluencerPayload = {
      name: values.name,
      avatarUrl: values.avatarUrl ?? '',
      bio: values.bio ?? '',
      city: values.city ?? '',
      tiktokHandle: cleanHandle(values.tiktokHandle),
      niches: values.niches,
      publicProfileEnabled: values.publicProfileEnabled,
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
      {/* Placa — preview ao vivo do que a marca vê na Fila (tela 2) */}
      <Plate marks="all" className="max-w-[520px]">
        <div className="flex items-center gap-3.5">
          <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[4px] bg-plate-fill">
            {watchedAvatar && (
              <img src={watchedAvatar} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-[21px] font-bold tracking-[-.045em] text-plate-ink">
              {watchedName || '—'}
            </p>
            {profile.instagramHandle && (
              <p className="mt-[5px] flex items-center gap-[5px] text-[13px] text-plate-muted">
                @{profile.instagramHandle}
                <ExternalLink size={11} className="shrink-0" />
              </p>
            )}
          </div>
        </div>

        {(profile.followersCount != null || profile.igEngagementRate != null) && (
          <div className="mt-7 flex gap-7">
            {profile.followersCount != null && (
              <div>
                <CountUp>
                  <span className="font-display text-d-xl text-plate-ink tabular-nums">
                    {/* sufixo (k/M) vem do formatador — hardcodar "k" fazia
                        800 seguidores virarem "800k" e 13,6M virar "13,6Mk" */}
                    {formatNumberParts(profile.followersCount).value}
                    <span className="text-[23px] tracking-[-.04em]">
                      {formatNumberParts(profile.followersCount).suffix}
                    </span>
                  </span>
                </CountUp>
                <p className="mt-3 text-xs text-plate-soft">seguidores</p>
              </div>
            )}
            {profile.igEngagementRate != null && (
              <div>
                <CountUp delay={140}>
                  <span className="font-display text-d-xl text-plate-ink tabular-nums">
                    {formatEngagement(profile.igEngagementRate).replace('%', '')}
                    <span className="text-[23px] tracking-[-.04em]">%</span>
                  </span>
                </CountUp>
                <p className="mt-3 text-xs text-plate-soft">engajamento</p>
              </div>
            )}
          </div>
        )}

        {watchedBio && <p className="mt-7 text-[15px] leading-[1.5] text-plate-body">{watchedBio}</p>}

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
      </Plate>

      {errors.root && <p className="mt-6 text-sm text-destructive">{errors.root.message}</p>}

      {/* Editar — rows que abrem um modal de campo único (padrão do mock) */}
      <h2 className="mb-5 mt-[34px] font-display text-d-xs text-foreground">Editar</h2>
      <div className="flex flex-col gap-[22px]">
        <PlateEditField
          label="Nome"
          value={watchedName}
          error={errors.name?.message}
          onSave={(v) => setValue('name', v, { shouldDirty: true, shouldValidate: true })}
        />
        <PlateEditField
          label="Cidade"
          value={watch('city') ?? ''}
          onSave={(v) => setValue('city', v, { shouldDirty: true })}
        />
        <PlateEditField
          label="Foto (URL)"
          value={watchedAvatar ?? ''}
          placeholder="https://cdn.exemplo.com/voce.png"
          error={errors.avatarUrl?.message}
          onSave={(v) => setValue('avatarUrl', v, { shouldDirty: true, shouldValidate: true })}
        />
        <PlateEditField
          label="TikTok"
          value={watch('tiktokHandle') ?? ''}
          error={errors.tiktokHandle?.message}
          onSave={(v) => setValue('tiktokHandle', v, { shouldDirty: true, shouldValidate: true })}
        />
        <PlateEditField
          label="Bio"
          value={watchedBio ?? ''}
          multiline
          placeholder="Fale um pouco sobre você para as marcas."
          error={errors.bio?.message}
          onSave={(v) => setValue('bio', v, { shouldDirty: true, shouldValidate: true })}
        />
        <PlateEditNiches
          label="Nichos"
          value={watchedNiches}
          extraOptions={profile.niches}
          onSave={(v) => setValue('niches', v, { shouldDirty: true })}
        />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-foreground">Perfil público</p>
            <PublicProfileLink
              handle={profile.instagramHandle}
              enabled={profile.publicProfileEnabled}
            />
          </div>
          <Controller
            name="publicProfileEnabled"
            control={control}
            render={({ field }) => (
              <Toggle checked={field.value} onChange={field.onChange} label="Tornar meu perfil público" />
            )}
          />
        </div>
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
      <div className="h-[220px] rounded-lg bg-secondary" />
      <div className="space-y-[22px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded bg-secondary" />
        ))}
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 8 do redesign 2a.

export default function ProfilePage() {
  const { data: profile, isLoading, isError } = useInfluencerProfile();

  return (
    <div className="mx-auto max-w-5xl px-6 pt-[14px]">
      <h1 className="font-display text-d-md text-foreground">Perfil</h1>
      <p className="mb-[22px] mt-2 text-[13px] text-[#75756E]">É exatamente isso que a marca vê.</p>

      {isLoading && <Skeleton />}

      {isError && <p className="text-sm text-destructive">Erro ao carregar o perfil. Tente novamente.</p>}

      {!isLoading && !isError && profile && <ProfileForm profile={profile} />}
    </div>
  );
}
