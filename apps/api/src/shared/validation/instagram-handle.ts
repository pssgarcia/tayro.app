/**
 * Alfabeto aceito pro handle do Instagram: letras, números, ponto e
 * underscore, sem @, até 30 caracteres.
 *
 * Fonte única do formato — até 2026-08-27 essa regex vivia copiada em
 * `PublicApplyDto`, `IgHandleController` e (no frontend) `PublicApplyPage` e
 * `RegisterInfluencerPage`. Mudar o alfabeto aceito exigia lembrar de todos
 * os lugares; agora exige mudar aqui (backend) e no equivalente do frontend
 * (`apps/web/src/utils/format.ts` → `INSTAGRAM_HANDLE_FORMAT`).
 */
export const INSTAGRAM_HANDLE_FORMAT = /^[a-zA-Z0-9_.]{1,30}$/;
