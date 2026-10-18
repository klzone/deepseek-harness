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

/** Fetches the newest release of the community fork via the GitHub API. */
export class GitHubReleaseUpdateChecker implements LinuxUpdateChecker {
  constructor(
    private readonly repo: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs: number = 30_000,
  ) {}

  async check(currentVersion: string): Promise<LinuxReleaseInfo | undefined> {
    // The /releases/latest endpoint only returns non-prerelease releases; community rc
    // releases are marked prerelease, so fall back to the full list and pick the newest
    // release whose version we can parse.
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
    let release: GitHubReleasePayload | undefined
    for (const candidate of releases) {
      // Our convention: dsh-desktop-linux-<semver>; strip the prefix when present.
      const parsed = valid(candidate.tag_name.replace(/^dsh-desktop-linux-/, ''))
      if (parsed !== null && gt(parsed, currentVersion) === true) {
        release = candidate
        break
      }
      release ??= candidate
    }
    if (release === undefined) return undefined
    const findAsset = (suffix: string) =>
      release.assets.find((asset) => asset.name.endsWith(suffix))?.browser_download_url
    return {
      version: valid(release.tag_name.replace(/^dsh-desktop-linux-/, '')) ?? release.tag_name,
      tag: release.tag_name,
      htmlUrl: release.html_url,
      prerelease: release.prerelease,
      debUrl: findAsset('.deb'),
      appImageUrl: findAsset('.AppImage'),
    }
  }
}
