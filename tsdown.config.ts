import { defineConfig } from 'tsdown'

// Dependencies (zod) are externalized by default; only our source is bundled.
// dist/ is gitignored and built fresh at publish time via the `prepack` script.
// Source + declaration maps point back into src/, which is included in the published
// package so consumers get go-to-definition into the real source.
export default defineConfig({
  clean: true,
  dts: { sourcemap: true },
  entry: 'src/index.ts',
  format: 'esm',
  platform: 'node',
  sourcemap: true,
  target: 'es2022',
})
