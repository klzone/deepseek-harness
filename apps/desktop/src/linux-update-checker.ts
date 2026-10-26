/** Community Linux update checker: queries the fork's GitHub Releases for a newer .deb/.AppImage. */

import { gt, valid } from 'semver'

export interface LinuxReleaseInfo {
  readonly version: string
  readonly tag: string
  readonly htmlUrl: string
  readonly prerelease: boolean
  readonly debUrl: string | undefined
  readonly appImageUrl: string | undefined
}

export interface LinuxUpdateChecker {
  /**
   * @param currentVersion - Installed application version.
   * @returns The newer release, or undefined when current is the latest.
   */
  check(currentVersion: string): Promise<LinuxReleaseInfo | undefined>
}

interface GitHubReleasePayload {
  readonly tag_name: string
  readonly html_url: string
  readonly prerelease: boolean
  readonly assets: { readonly name: string; readonly browser_download_url: string }[]
}

/** Our tag convention: `dsh-desktop-linux-<semver>`; the prefix is optional. */
function releaseVersion(tag: string): string | null {
  return valid(tag.replace(/^dsh-desktop-linux-/, ''))
}

/**
 * Restore the semver hyphen that Debian package metadata rewrites to a tilde (`0.2.1~rc.2`),
 * so an installed version read from packaging metadata still compares against release tags.
 * @param version - Version string reported by the installed application.
 * @returns A string parseable by semver when the original is a semver with a rewritten hyphen.
 */
function normalizeInstalledVersion(version: string): string {
  return version.trim().replace('~', '-')
}

/** Fetches the newest release of the community fork via the GitHub API. */
export class GitHubReleaseUpdateChecker implements LinuxUpdateChecker {
  constructor(
    private readonly repo: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs: number = 30_000,
  ) {}

  async check(currentVersion: string): Promise<LinuxReleaseInfo | undefined> {
    // The /releases/latest endpoint only returns non-prerelease releases; community rc
    // releases may still be marked prerelease, so read the full list instead.
    const api = `https://api.github.com/repos/${this.repo}/releases?per_page=30`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    let response: Response
    try {
      response = await this.fetchImpl(api, { signal: controller.signal, headers: { accept: 'application/vnd.github+json' } })
    } finally {
      clearTimeout(timer)
    }
    if (!response.ok) {
      throw new Error(`GitHub release lookup failed with HTTP ${response.status}`)
    }
    const releases = (await response.json()) as GitHubReleasePayload[]

    // Select the highest parseable version. A release whose tag carries no version is skipped
    // rather than promoted, because falling back to it would report the installed version as
    // newly discovered and leave the indicator visible after an upgrade.
    let newest: { readonly release: GitHubReleasePayload; readonly version: string } | undefined
    for (const candidate of releases) {
      const version = releaseVersion(candidate.tag_name)
      if (version === null) continue
      if (newest === undefined || gt(version, newest.version)) newest = { release: candidate, version }
    }
    if (newest === undefined) return undefined

    // Self-check: an installed version at or past the newest release is already up to date, so
    // nothing is announced and the indicator stays hidden.
    const installed = valid(normalizeInstalledVersion(currentVersion))
    if (installed !== null) {
      if (!gt(newest.version, installed)) return undefined
    } else if (normalizeInstalledVersion(currentVersion) === newest.version) {
      return undefined
    }

    const { release, version } = newest
    const findAsset = (suffix: string) =>
      release.assets.find(asset => asset.name.endsWith(suffix))?.browser_download_url
    return {
      version,
      tag: release.tag_name,
      htmlUrl: release.html_url,
      prerelease: release.prerelease,
      debUrl: findAsset('.deb'),
      appImageUrl: findAsset('.AppImage'),
    }
  }
}
