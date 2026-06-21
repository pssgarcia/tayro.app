import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, FileText, Lock, Check } from 'lucide-react';
import axios from 'axios';
import {
  useBrandProfile,
  useUpdateBrandProfile,
} from '../../hooks/useBrandProfile';
import type { BrandProfile, UpdateBrandPayload } from '../../types/api';
import Avatar from '../../components/primitives/Avatar';
import NicheSelector from '../../components/primitives/NicheSelector';
import { cn } from '../../lib/utils';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100, 'Máximo 100 caracteres'),
  website: z
    .string()
    .url('URL inválida (inclua https://)')
    .max(2048)
    .optional()
    .or(z.literal('')),
  logoUrl: z
    .string()
    .url('URL inválida (inclua https://)')
    .max(2048)
    .optional()
    .or(z.literal('')),
  bio: z.string().max(500, 'Máximo 500 caracteres').optional(),
  niches: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

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

// ─── Form ─────────────────────────────────────────────────────────────────────

function ProfileForm({ profile }: { profile: BrandProfile }) {
  const update = useUpdateBrandProfile();

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

  // Preview ao vivo — atualiza sem precisar salvar
  const watchedName = watch('name');
  const watchedLogo = watch('logoUrl');

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
          icon={<Building2 size={16} />}
          title="Identidade"
          subtitle="É o que a creator vê primeiro ao abrir seu programa."
        />

        {/* Preview ao vivo (espelha o header de /apply/:id) */}
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-4">
          <Avatar src={watchedLogo || undefined} name={watchedName} size="lg" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Programa de</p>
            <p className="truncate font-display text-base font-semibold text-foreground">
              {watchedName || '—'}
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="logoUrl">Logo (URL)</Label>
          <input
            id="logoUrl"
            type="url"
            placeholder="https://cdn.suamarca.com/logo.png"
            className={inputCls(!!errors.logoUrl)}
            {...register('logoUrl')}
          />
          <FieldError message={errors.logoUrl?.message} />
        </div>

        <div className="mt-4">
          <Label htmlFor="name">Nome da marca</Label>
          <input
            id="name"
            type="text"
            className={inputCls(!!errors.name)}
            {...register('name')}
          />
          <FieldError message={errors.name?.message} />
        </div>
      </Card>

      {/* Card 2 — Sobre */}
      <Card>
        <SectionHeader
          icon={<FileText size={16} />}
          title="Sobre"
          subtitle="Conte sua história e em que nichos sua marca atua."
        />

        <div>
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            rows={3}
            placeholder="Conte sobre sua marca para as creators."
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
          <Label htmlFor="website">Website</Label>
          <input
            id="website"
            type="url"
            placeholder="https://suamarca.com"
            className={inputCls(!!errors.website)}
            {...register('website')}
          />
          <FieldError message={errors.website?.message} />
        </div>
      </Card>

      {/* Card 3 — Conta */}
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
  const { data: profile, isLoading, isError } = useBrandProfile();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold sm:text-2xl">Perfil da marca</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Como sua marca aparece para as creators
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
