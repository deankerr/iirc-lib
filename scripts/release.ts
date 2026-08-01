// Cuts a release tag. The tag is the only thing that starts a publish, so every
// check that protects a release lives here or in the workflow the tag triggers.
//
// This exists because a tag is easy to put in the wrong place. Tagging a release
// branch instead of merged main produces a tag outside the repository history:
// the published artifact is still correct, but `git describe` and every later
// compare link are wrong, and nothing at publish time notices. The preflight
// below refuses that case rather than warning about it.

import { parseArgs } from 'node:util'

const TAG_PREFIX = 'v'

// Command failures are reported to a human, and npm in particular writes a long
// multi-line error. One line is enough to say which check could not run.
function firstLine(text: string): string {
  return text.split('\n')[0] ?? 'no detail'
}

// Every failure here is a reason not to tag. Collect them all before reporting,
// so one run tells you everything to fix rather than one problem per attempt.
interface Preflight {
  readonly commit: string
  readonly problems: string[]
  readonly version: string
}

interface CommandResult {
  readonly error: string
  readonly ok: boolean
  readonly output: string
}

// Thin wrapper over Bun.spawn that never throws. A failed command is a fact to
// check, not an exception to handle — and every caller below must read that
// fact. A check that cannot run has to block the release, not silently pass it.
async function run(command: string[]): Promise<CommandResult> {
  const proc = Bun.spawn(command, { stderr: 'pipe', stdout: 'pipe' })
  const [output, error] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  const code = await proc.exited
  return { error: error.trim(), ok: code === 0, output: output.trim() }
}

// The version being released is whatever package.json says. The tag is derived
// from it, never supplied by hand — that removes the chance of them disagreeing.
// Only two fields are needed, so narrow to them here rather than carrying an
// unchecked shape through the preflight.
async function readManifest(): Promise<{ name: string; version: string }> {
  const parsed: unknown = await Bun.file('package.json').json()
  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    !('name' in parsed) ||
    !('version' in parsed)
  ) {
    throw new Error('package.json has no name or version field.')
  }
  const { name, version } = parsed
  if (typeof name !== 'string' || typeof version !== 'string') {
    throw new TypeError('package.json name and version must be strings.')
  }
  return { name, version }
}

// Checks that the tag will land on the exact commit that CI proved good, and
// that nothing about this version has been released already.
async function preflight(): Promise<Preflight> {
  const problems: string[] = []
  const { name, version } = await readManifest()
  const tag = `${TAG_PREFIX}${version}`

  // Refresh remote refs first: every comparison below is against the remote.
  // A failed fetch leaves those comparisons reading stale cached refs, which
  // would pass while describing state that no longer exists.
  const fetched = await run(['git', 'fetch', '--tags', '--prune'])
  if (!fetched.ok) {
    problems.push('Could not fetch from origin, so remote state cannot be trusted.')
  }

  // The tag must go on main. This is the check that would have caught tagging a
  // release branch before its squash merge rewrote the commit.
  const branch = await run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
  if (branch.output !== 'main') {
    problems.push(`On branch "${branch.output}", not main. Release tags belong on merged main.`)
  }

  // Uncommitted work means the tagged commit is not what you are looking at.
  const dirty = await run(['git', 'status', '--porcelain'])
  if (dirty.ok) {
    if (dirty.output !== '') {
      problems.push('Working tree is not clean. Commit or stash first.')
    }
  } else {
    problems.push('Could not read the working tree state.')
  }

  // Local main must equal origin/main. Ahead means CI never saw this commit;
  // behind means you are tagging something older than what is released from.
  const local = await run(['git', 'rev-parse', 'HEAD'])
  const remote = await run(['git', 'rev-parse', 'origin/main'])
  if (local.ok && remote.ok) {
    if (local.output !== remote.output) {
      problems.push('Local main and origin/main differ. Push or pull so they match.')
    }
  } else {
    problems.push('Could not resolve HEAD or origin/main.')
  }

  // A tag is meant to be immutable, and the tag ruleset blocks moving one.
  const existing = await run(['git', 'ls-remote', '--tags', 'origin', `refs/tags/${tag}`])
  if (existing.ok) {
    if (existing.output !== '') {
      problems.push(`Tag ${tag} already exists on origin. Bump the version instead of reusing it.`)
    }
  } else {
    problems.push(`Could not ask origin whether ${tag} exists.`)
  }

  // The registry is the real source of truth for what has shipped. npm exits
  // non-zero both for "no such version" and for a registry or network failure.
  // Only the first means publishing is safe, so tell the two apart.
  const published = await run(['npm', 'view', `${name}@${version}`, 'version'])
  if (published.ok) {
    problems.push(`${name}@${version} is already on npm. Bump the version in package.json.`)
  } else if (!published.error.includes('E404')) {
    problems.push(`Could not ask npm about ${name}@${version}: ${firstLine(published.error)}`)
  }

  // The workflow builds release notes from this section. An absent section
  // produces an empty GitHub release, which is only noticed after publishing.
  const changelogFile = Bun.file('CHANGELOG.md')
  const changelog = (await changelogFile.exists()) ? await changelogFile.text() : ''
  if (!changelog.includes(`## [${version}]`)) {
    problems.push(`CHANGELOG.md has no "## [${version}]" section.`)
  }

  // CI already ran on this commit when its PR merged. Reuse that result rather
  // than trusting a local test run against possibly different dependencies.
  const conclusion = await run([
    'gh',
    'run',
    'list',
    '--commit',
    local.output,
    '--workflow',
    'CI',
    '--limit',
    '1',
    '--json',
    'conclusion',
    '--jq',
    '.[0].conclusion',
  ])
  if (conclusion.ok) {
    if (conclusion.output !== 'success') {
      problems.push(`CI on this commit is "${conclusion.output || 'missing'}", not success.`)
    }
  } else {
    problems.push('Could not read the CI result for this commit from GitHub.')
  }

  return { commit: local.output, problems, version }
}

// Reports the plan, then tags and pushes. The push is what starts the release.
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean' },
      yes: { short: 'y', type: 'boolean' },
    },
    strict: true,
  })

  const { commit, problems, version } = await preflight()
  const tag = `${TAG_PREFIX}${version}`

  if (problems.length > 0) {
    console.error(`Cannot release ${tag}:\n`)
    for (const problem of problems) {
      console.error(`  - ${problem}`)
    }
    process.exit(1)
  }

  const subject = await run(['git', 'log', '-1', '--format=%s', commit])
  console.log(`Release ${tag}`)
  console.log(`  commit  ${commit.slice(0, 9)}  ${subject.output}`)
  console.log('\nPushing the tag publishes to npm. This cannot be undone.')

  // Everything above is read-only, so a dry run has already done the useful
  // work: it proves the preflight passes before you commit to publishing.
  if (values['dry-run'] === true) {
    console.log('\nDry run: no tag created.')
    return
  }

  if (values.yes !== true) {
    process.stdout.write(`\nType "${tag}" to confirm: `)
    const typed = await new Response(Bun.stdin.stream()).text()
    if (typed.trim() !== tag) {
      console.error('Cancelled.')
      process.exit(1)
    }
  }

  // Annotated, so the tag carries its own author and date.
  const created = await run(['git', 'tag', '-a', tag, '-m', tag])
  if (!created.ok) {
    console.error(`Failed to create tag ${tag}.`)
    process.exit(1)
  }

  const pushed = await run(['git', 'push', 'origin', tag])
  if (!pushed.ok) {
    // Leave no local tag behind for a push that did not happen.
    await run(['git', 'tag', '-d', tag])
    console.error(`Failed to push tag ${tag}.`)
    process.exit(1)
  }

  console.log(`\nPushed ${tag}. Watch the release: gh run watch`)
}

await main()
