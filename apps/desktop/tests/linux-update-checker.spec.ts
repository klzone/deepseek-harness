import { describe, expect, it, vi } from 'vitest'
import { GitHubReleaseUpdateChecker } from '../src/linux-update-checker.ts'

/** One GitHub release payload shaped like the community fork's publication convention. */
function release(tag: string, prerelease = false) {
  return {
    tag_name: tag,
    html_url: `https://github.com/klzone/deepseek-harness/releases/tag/${tag}`,
    prerelease,
    assets: [
      { name: 'deepseek-harness-0.2.1-rc.2-linux-amd64-unsigned.deb', browser_download_url: `https://example.test/${tag}/pkg.deb` },
      { name: 'deepseek-harness-0.2.1-rc.2-linux-x86_64-unsigned.AppImage', browser_download_url: `https://example.test/${tag}/pkg.AppImage` },
    ],
  }
}

function checkerFor(releases: unknown[], repo = 'klzone/deepseek-harness') {
  const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => releases })) as unknown as typeof fetch
  return new GitHubReleaseUpdateChecker(repo, fetchImpl)
}

describe('community Linux update checker', () => {
  it('announces nothing once the installed version is the newest release', async () => {
    const checker = checkerFor([
      release('dsh-desktop-linux-0.2.1-rc.2'),
      release('dsh-desktop-linux-0.2.1-alpha.5', true),
      release('dsh-desktop-linux-0.2.0-rc.2', true),
    ])
    expect(await checker.check('0.2.1-rc.2')).toBeUndefined()
  })

  it('reports a newer release with its download assets', async () => {
    const checker = checkerFor([
      release('dsh-desktop-linux-0.2.2-rc.1', true),
      release('dsh-desktop-linux-0.2.1-rc.2'),
    ])
    const found = await checker.check('0.2.1-rc.2')
    expect(found?.version).toBe('0.2.2-rc.1')
    expect(found?.tag).toBe('dsh-desktop-linux-0.2.2-rc.1')
    expect(found?.debUrl).toBe('https://example.test/dsh-desktop-linux-0.2.2-rc.1/pkg.deb')
    expect(found?.appImageUrl).toBe('https://example.test/dsh-desktop-linux-0.2.2-rc.1/pkg.AppImage')
  })

  it('announces nothing when the installed build is ahead of every release', async () => {
    const checker = checkerFor([release('dsh-desktop-linux-0.2.1-rc.2')])
    expect(await checker.check('0.2.2-rc.1')).toBeUndefined()
  })

  it('never promotes a tag that carries no parseable version', async () => {
    const checker = checkerFor([release('dsh-desktop-linux-nightly'), release('some-other-mirror')])
    expect(await checker.check('0.2.1-rc.2')).toBeUndefined()
  })

  it('compares a Debian-rewritten installed version by semver', async () => {
    const checker = checkerFor([release('dsh-desktop-linux-0.2.1-rc.2')])
    expect(await checker.check('0.2.1~rc.2')).toBeUndefined()
  })

  it('selects the highest version regardless of release ordering', async () => {
    const checker = checkerFor([
      release('dsh-desktop-linux-0.2.1-alpha.5', true),
      release('dsh-desktop-linux-0.2.3-rc.1', true),
      release('dsh-desktop-linux-0.2.2-rc.2', true),
    ])
    expect((await checker.check('0.2.1-alpha.5'))?.version).toBe('0.2.3-rc.1')
  })

  it('accepts tags without the fork prefix', async () => {
    const checker = checkerFor([release('0.2.2-rc.1')])
    expect((await checker.check('0.2.1-rc.2'))?.version).toBe('0.2.2-rc.1')
  })
})
