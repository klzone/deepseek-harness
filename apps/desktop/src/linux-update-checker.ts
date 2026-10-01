/** Community Linux update checker: queries the fork's GitHub Releases for a newer .deb/.AppImage. */

import { gt, valid } from 'semver'

export interface LinuxReleaseInfo {
  readonly version: string
  readonly tag: string
  readonly htmlUrl: string
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

/** Fetches the latest release of the community fork via the GitHub API. */
export class GitHubReleaseUpdateChecker implements LinuxUpdateChecker {
  constructor(
    private readonly repo: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs: number = 30_000,
  ) {}

  async check(currentVersion: string): Promise<LinuxReleaseInfo | undefined> {
    const api = `https://api.github.com/repos/${this.repo}/releases/latest`
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
    const body = (await response.json()) as {
      tag_name: string
      html_url: string
      assets: { name: string; browser_download_url: string }[]
    }
    const tag = body.tag_name
    // Our convention: dsh-desktop-linux-<semver>; strip the prefix when present.
    const rawVersion = tag.replace(/^dsh-desktop-linux-/, '')
    const version = valid(rawVersion) === null ? undefined : rawVersion
    if (version === undefined) return undefined
    if (gt(version, currentVersion) !== true) return undefined
    const findAsset = (suffix: string) =>
      body.assets.find((asset) => asset.name.endsWith(suffix))?.browser_download_url
    return {
      version,
      tag,
      htmlUrl: body.html_url,
      debUrl: findAsset('.deb'),
      appImageUrl: findAsset('.AppImage'),
    }
  }
}
