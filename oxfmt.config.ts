import { defineConfig } from 'oxfmt'

export default defineConfig({
  ignorePatterns: [
    // ── Generated ────────────────────────────────────────────────
    '**/.alchemy/**',
    '**/.conductor/**',
    '**/.context/**',
    '**/.next/**',
    '**/.output/**',
    '**/.turbo/**',
    '**/.vercel/**',
    '**/.vite/**',
    '**/build/**',
    '**/dist/**',
    '**/out/**',
    '**/__root.tsx',
    '**/routeTree.gen.ts',
    '**/next-env.d.ts',
    '**/worker-configuration.d.ts',

    // ── Lock files ────────────────────────────────────────────────────
    '**/bun.lock',
    '**/bun.lockb',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/pnpm-lock.yaml',

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
