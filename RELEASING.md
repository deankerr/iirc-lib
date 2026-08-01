# Releasing

A pushed `v*` tag is the only thing that publishes. Everything else is preparation.

## Steps

1. **Open a release PR** from a branch. It changes two files:
   - `package.json` — the new `version`.
   - `CHANGELOG.md` — a `## [x.y.z]` section, plus the compare link at the bottom.

2. **Merge it** once CI is green. Merges are squash-only, so the merge creates a
   new commit.

3. **Tag main:**

   ```sh
   git switch main && git pull
   bun run release
   ```

   `bun run release` reads the version from `package.json`, derives the tag, and
   refuses to continue unless every condition below holds. Do not tag by hand —
   see [Why the script exists](#why-the-script-exists).

## What `bun run release` checks

| Check                          | Why                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------ |
| On `main`                      | A tag on a release branch does not survive the squash merge.                   |
| Working tree clean             | Otherwise the tagged commit is not what you are looking at.                    |
| `main` equals `origin/main`    | Ahead means CI never saw this commit; behind means you are tagging stale code. |
| Tag does not exist on origin   | Tags are immutable, and the tag ruleset blocks moving one.                     |
| Version not already on npm     | Publishing is not repeatable.                                                  |
| `CHANGELOG.md` has the section | The workflow builds the release notes from it.                                 |
| CI passed on this commit       | Reuses the result from the merge, rather than trusting a local run.            |

It reports every failed check at once, so one run tells you everything to fix.
When all pass it shows the commit and asks you to type the tag to confirm.

Every check is read-only, so `bun run release --dry-run` runs the whole preflight
and stops before creating the tag. Use it to confirm a release is ready without
committing to it.

## What the tag triggers

`.github/workflows/release.yml` runs against **the tagged commit**, not `main`.
It:

1. Fails if the tag and `package.json` version disagree.
2. Re-runs `check`, `test`, `build`, and `lint:package` on the tagged commit.
3. Publishes with npm trusted publishing (OIDC). No token is stored, and
   provenance is attached automatically.
4. Creates the GitHub release from the matching `CHANGELOG.md` section.

Steps 3 and 4 are idempotent: an already-published version is skipped, and an
existing release is updated rather than duplicated. A re-run is safe.

## Why the script exists

`v0.2.0` was tagged by hand on the release branch instead of on merged `main`.
The published package was correct — the trees were identical — but the tag
pointed at a commit outside the repository history, so `git describe` could not
find it and later compare links would have replayed the whole diff.

Nothing at publish time can catch this: by then the tag already exists, and the
workflow only sees the commit it was handed. The check has to happen before the
tag is created, which is what the script is for.

## First-time setup

Already done, recorded here so it can be rebuilt:

- **npmjs.com** → package settings → trusted publisher: GitHub Actions, owner
  `deankerr`, repo `iirc-lib`, workflow `release.yml`, no environment. Adding or
  changing this needs an interactive 2FA challenge.
- **Repository rulesets** — `main` requires a PR and a passing `ci` check;
  `refs/tags/v*` blocks deletion and force-update. Both allow admin bypass.

npm restricts 2FA-bypass tokens from managing packages as of 2026-07-31, and
removes their publish capability around January 2027. Trusted publishing is not
affected by either date, because it stores no token.
