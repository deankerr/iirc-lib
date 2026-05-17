import { defineConfig } from 'oxlint'
import core from 'ultracite/oxlint/core'

export default defineConfig({
  extends: [core],
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
  overrides: [
    {
      files: ['src/events/**'],
      rules: {
        'sort-keys': 'off',
      },
    },
    {
      files: ['src/features/channel-tracker.ts', 'src/features/registration.ts'],
      rules: {
        complexity: 'off',
      },
    },
  ],
  rules: {
    complexity: ['error', { max: 25 }],
    'func-style': 'off',
    'no-inline-comments': 'off',
    'no-use-before-define': 'off',
    'no-warning-comments': 'off',
    'unicorn/consistent-function-scoping': 'off',
    'unicorn/prefer-event-target': 'off',
  },
})
