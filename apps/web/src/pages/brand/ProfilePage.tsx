import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check } from 'lucide-react';
import axios from 'axios';
import {
  useBrandProfile,
  useUpdateBrandProfile,
} from '../../hooks/useBrandProfile';
import type { BrandProfile, UpdateBrandPayload } from '../../types/api';
import { cn } from '../../lib/utils';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z
    .string()
    .min(1, 'Nome obrigatório')
    .max(100, 'Máximo 100 caracteres'),
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
  niches: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

function parseNiches(raw?: string): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(',')
        .map((n) => n.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 20);
}

const inputCls = (hasError: boolean) =>
  cn(
    'w-full rounded-lg border bg-secondary px-4 py-2.5 text-sm text-foreground',
    'placeholder:text-muted-foreground focus:outline-none focus:ring-1',
    hasError
      ? 'border-destructive focus:border-destructive focus:ring-destructive/30'
      : 'border-input focus:border-lime/50 focus:ring-lime/20',
  );

// ─── Form ─────────────────────────────────────────────────────────────────────

function ProfileForm({ profile }: { profile: BrandProfile }) {
  const update = useUpdateBrandProfile();

  const {
    register,
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
      niches: profile.niches.join(', '),
    },
  });

  const onSubmit = async (values: FormValues) => {
    const payload: UpdateBrandPayload = {
      name: values.name,
      niches: parseNiches(values.niches),
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

      {/* Email (read-only) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Email</label>
        <input
          type="email"
          value={profile.email}
          disabled
          className="w-full cursor-not-allowed rounded-lg border border-input bg-secondary/50 px-4 py-2.5 text-sm text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
      </div>

      {/* Nome */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Nome da marca
        </label>
        <input
          id="name"
          type="text"
          className={inputCls(!!errors.name)}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <label htmlFor="bio" className="text-sm font-medium text-foreground">
          Bio <span className="text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="bio"
          rows={3}
          placeholder="Conte sobre sua marca para as creators."
          className={cn(inputCls(!!errors.bio), 'resize-none')}
          {...register('bio')}
        />
        {errors.bio && (
          <p className="text-xs text-destructive">{errors.bio.message}</p>
        )}
      </div>

      {/* Nichos */}
      <div className="space-y-1.5">
        <label htmlFor="niches" className="text-sm font-medium text-foreground">
          Nichos <span className="text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="niches"
          type="text"
          placeholder="fitness, wellness, nutrição"
          className={inputCls(!!errors.niches)}
          {...register('niches')}
        />
        <p className="text-xs text-muted-foreground">Separe por vírgula.</p>
      </div>

      {/* Website */}
      <div className="space-y-1.5">
        <label htmlFor="website" className="text-sm font-medium text-foreground">
          Website <span className="text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="website"
          type="url"
          placeholder="https://suamarca.com"
          className={inputCls(!!errors.website)}
          {...register('website')}
        />
        {errors.website && (
          <p className="text-xs text-destructive">{errors.website.message}</p>
        )}
      </div>

      {/* Logo URL */}
      <div className="space-y-1.5">
        <label htmlFor="logoUrl" className="text-sm font-medium text-foreground">
          Logo (URL) <span className="text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="logoUrl"
          type="url"
          placeholder="https://cdn.suamarca.com/logo.png"
          className={inputCls(!!errors.logoUrl)}
          {...register('logoUrl')}
        />
        {errors.logoUrl && (
          <p className="text-xs text-destructive">{errors.logoUrl.message}</p>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-3 pt-2">
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
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Perfil da marca</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Como sua marca aparece para as creators
        </p>
      </div>

      {isLoading && (
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-24 animate-pulse rounded bg-secondary" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-secondary" />
            </div>
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
