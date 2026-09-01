import { defineConfig } from 'oxlint'
import core from 'ultracite/oxlint/core'

export default defineConfig({
  extends: [core],
  ignorePatterns: [
    // ── Ultracite defaults (build output, generated, lock files) ──────
    ...(core.ignorePatterns ?? []),

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
  options: {
    typeAware: true,
    typeCheck: true,
  },
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
    'no-void': 'off',
    'no-warning-comments': 'off',
    'unicorn/consistent-function-scoping': 'off',
    'unicorn/prefer-event-target': 'off',
  },
})
