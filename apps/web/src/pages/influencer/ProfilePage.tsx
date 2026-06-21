import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserRound, FileText, Globe, Lock, Check } from 'lucide-react';
import axios from 'axios';
import {
  useInfluencerProfile,
  useUpdateInfluencerProfile,
} from '../../hooks/useInfluencerProfile';
import type { InfluencerProfile, UpdateInfluencerPayload } from '../../types/api';
import Avatar from '../../components/primitives/Avatar';
import NicheSelector from '../../components/primitives/NicheSelector';
import { cn } from '../../lib/utils';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100, 'Máximo 100 caracteres'),
  avatarUrl: z
    .string()
    .url('URL inválida (inclua https://)')
    .max(2048)
    .optional()
    .or(z.literal('')),
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

// ─── UI helpers ───────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">{children}</section>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="text-lime">{icon}</span>
      <div>
        <h2 className="font-display text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-medium text-foreground"
    >
      {children}
    </label>
  );
}

const inputCls = (hasError: boolean) =>
  cn(
    'w-full rounded-lg border bg-secondary px-3 py-2 text-sm text-foreground',
    'placeholder:text-muted-foreground focus:outline-none focus:ring-1',
    hasError
      ? 'border-destructive focus:border-destructive focus:ring-destructive/30'
      : 'border-border focus:border-lime/50 focus:ring-lime/30',
  );

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

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
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-lime/40',
        checked ? 'bg-lime' : 'bg-secondary border border-border',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-background transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function ProfileForm({ profile }: { profile: InfluencerProfile }) {
  const update = useUpdateInfluencerProfile();

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
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.status === 429
          ? 'Muitas tentativas. Aguarde alguns minutos.'
          : 'Não foi possível salvar. Tente novamente.';
      setError('root', { message: msg });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {errors.root && (
        <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{errors.root.message}</p>
        </div>
      )}

      {/* Card 1 — Identidade */}
      <Card>
        <SectionHeader
          icon={<UserRound size={16} />}
          title="Identidade"
          subtitle="É como você aparece para as marcas."
        />

        <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-4">
          <Avatar src={watchedAvatar || undefined} name={watchedName} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-foreground">
              {watchedName || '—'}
            </p>
            {profile.instagramHandle && (
              <p className="truncate text-xs text-muted-foreground">
                @{profile.instagramHandle}
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="avatarUrl">Foto (URL)</Label>
          <input
            id="avatarUrl"
            type="url"
            placeholder="https://cdn.exemplo.com/voce.png"
            className={inputCls(!!errors.avatarUrl)}
            {...register('avatarUrl')}
          />
          <FieldError message={errors.avatarUrl?.message} />
        </div>

        <div className="mt-4">
          <Label htmlFor="name">Nome</Label>
          <input
            id="name"
            type="text"
            className={inputCls(!!errors.name)}
            {...register('name')}
          />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="mt-4">
          <Label htmlFor="city">Cidade</Label>
          <input
            id="city"
            type="text"
            placeholder="Belo Horizonte"
            className={inputCls(!!errors.city)}
            {...register('city')}
          />
          <FieldError message={errors.city?.message} />
        </div>
      </Card>

      {/* Card 2 — Sobre */}
      <Card>
        <SectionHeader
          icon={<FileText size={16} />}
          title="Sobre"
          subtitle="Conte sua história e em que nichos você cria."
        />

        <div>
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            rows={3}
            placeholder="Fale um pouco sobre você para as marcas."
            className={cn(inputCls(!!errors.bio), 'resize-none')}
            {...register('bio')}
          />
          <FieldError message={errors.bio?.message} />
        </div>

        <div className="mt-4">
          <Label htmlFor="niches">Nichos</Label>
          <Controller
            name="niches"
            control={control}
            render={({ field }) => (
              <NicheSelector
                value={field.value}
                onChange={field.onChange}
                extraOptions={profile.niches}
              />
            )}
          />
        </div>

        <div className="mt-4">
          <Label htmlFor="tiktokHandle">TikTok</Label>
          <input
            id="tiktokHandle"
            type="text"
            placeholder="@seuhandle"
            className={inputCls(!!errors.tiktokHandle)}
            {...register('tiktokHandle')}
          />
          <FieldError message={errors.tiktokHandle?.message} />
        </div>
      </Card>

      {/* Card 3 — Perfil público (LGPD) */}
      <Card>
        <SectionHeader
          icon={<Globe size={16} />}
          title="Perfil público"
          subtitle="Você controla se as marcas podem ver seu perfil."
        />
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-secondary/40 p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Tornar meu perfil público
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Quando ativo, marcas podem ver seu perfil em tayro.app/c/
              {profile.instagramHandle ?? 'seuhandle'} — com seus nichos,
              métricas e parcerias. Desligado, ele fica invisível.
            </p>
          </div>
          <Controller
            name="publicProfileEnabled"
            control={control}
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onChange={field.onChange}
                label="Tornar meu perfil público"
              />
            )}
          />
        </div>
      </Card>

      {/* Card 4 — Conta */}
      <Card>
        <SectionHeader icon={<Lock size={16} />} title="Conta" />
        <div>
          <Label htmlFor="email">Email</Label>
          <input
            id="email"
            type="email"
            value={profile.email}
            disabled
            className="w-full cursor-not-allowed rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            O email não pode ser alterado.
          </p>
        </div>
      </Card>

      {/* Ações */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className={cn(
            'rounded-lg bg-lime px-5 py-2.5 text-sm font-semibold text-background',
            'transition-opacity hover:opacity-90',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {isSubmitting ? 'Salvando…' : 'Salvar alterações'}
        </button>
        {update.isSuccess && !isDirty && (
          <span className="flex items-center gap-1.5 text-sm text-lime">
            <Check size={15} />
            Salvo
          </span>
        )}
      </div>
    </form>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: profile, isLoading, isError } = useInfluencerProfile();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold sm:text-2xl">Meu perfil</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Como você aparece para as marcas
        </p>
      </div>

      {isLoading && (
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 w-full animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Erro ao carregar o perfil. Tente novamente.
        </p>
      )}

      {!isLoading && !isError && profile && <ProfileForm profile={profile} />}
    </div>
  );
}
