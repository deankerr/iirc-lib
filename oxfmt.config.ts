import { defineConfig } from 'oxfmt'
import ultracite from 'ultracite/oxfmt'

export default defineConfig({
  ignorePatterns: [
    // ── Ultracite defaults (build output, generated, lock files) ──────
    ...(ultracite.ignorePatterns ?? []),

    // ── Generated ────────────────────────────────────────────────
    '**/.alchemy/**',
    '**/.conductor/**',
    '**/.context/**',
    '**/__root.tsx',
    '**/routeTree.gen.ts',

    // ── Vendored ────────────────────────────────────────────────────
    '.agents/**',
    '.claude/**',
    '**/components/ui/**',
  ],

  semi: false,
  singleQuote: true,
  sortImports: {},
  sortPackageJson: { sortScripts: true },
})
