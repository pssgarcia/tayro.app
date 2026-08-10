import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Ícone-fonte placeholder on-brand (dark #0A0A0A + lime #C6FF33) — não existe
// monograma oficial do TAYRO ainda, só o wordmark texto usado nos layouts.
// Trocar este SVG quando houver um mark definitivo; os PNGs são regenerados
// rodando `npx pwa-assets-generator` de novo.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // Padding do maskable (safe zone) é branco por padrão no sharp — destoa
    // do fundo dark da marca em launchers que revelam a área fora do círculo.
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { fit: 'contain', background: '#0A0A0A' },
    },
  },
  images: ['src/assets/pwa-icon.svg'],
});
