
/**
 * Linux-only runtime adjustments applied after `prepare:dsh` materializes
 * the production runtime tree (the tree that becomes resources/app.asar/dsh):
 *
 * 1. The registry `sharp` embeds a glib that symbol-collides with the glib
 *    linked into Electron's Linux binary (electron/electron#46323), which no
 *    runtime flag fixes. `@janhapke/sharp-electron` is sharp rebuilt with the
 *    colliding symbols renamed at link time.
 * 2. LibreOfficeKit decides whether an optional native engine package is
 *    installed by probing `lstatSync(path, { throwIfNoEntry: false })`.
 *    Electron's ASAR filesystem returns `null` rather than `undefined` for a
 *    missing entry, so the probe reports every name as installed and Linux
 *    can never fall back to the bundled WASM engine: conversion fails with
 *    "installed package is incomplete" instead.
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Desktop build target names this module reasons about. */
type DesktopTargetName = 'mac-arm64' | 'mac-x64' | 'win-x64' | 'linux-x64'

/** Package that carries the sharp rebuild matching the workspace's sharp version. */
const SHARP_PACKAGE = '@janhapke/sharp-electron'
const SHARP_VERSION = '0.35.3-electron.1'

/**
 * SHA-256 of the published sharp tarball.
 * A mismatch stops packaging instead of shipping binaries nobody verified.
 */
const SHARP_SHA256 = 'f8f43f278e78702ac767c9ef441129495d046ec8fbb8bf67cd9770fdb15966f2'

/** The package the sharp rebuild replaces, and the registry binaries it makes dead weight. */
const SHARP_DESTINATION = 'sharp'
const REPLACED_SHARP_PACKAGES = ['@img/sharp-linux-x64', '@img/sharp-libvips-linux-x64']

/** The engine that resolves the optional native LibreOfficeKit package. */
const OFFICE_ENGINE_PACKAGE = '@deepseek-ai/libreoffice-kit'
const OFFICE_ENGINE_ENTRY = 'lib/index.js'

/** ASAR-insensitive existence check that replaces the published probe. */
const OFFICE_ENGINE_EXISTENCE_CHECK = 'lstatSync(join(directory, name), { throwIfNoEntry: false }) !== void 0'
const OFFICE_ENGINE_EXISTENCE_FIX = 'Boolean(lstatSync(join(directory, name), { throwIfNoEntry: false }))'

function sharpTarballUrls(): string[] {
  const encoded = `${SHARP_PACKAGE.replace('/', '%2F')}/-/${SHARP_PACKAGE.split('/')[1]}-${SHARP_VERSION}.tgz`
  return [
    `https://registry.npmmirror.com/${encoded}`,
    `https://registry.npmjs.org/${encoded}`,
  ]
}

async function downloadSharpTarball(): Promise<Buffer> {
  let lastError: unknown
  for (const url of sharpTarballUrls()) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`electron-safe sharp download: ${String(response.status)} ${url}`)
      return Buffer.from(await response.arrayBuffer())
    }
    catch (error) {
      lastError = error
    }
  }
  throw new Error(`electron-safe sharp download failed: ${String(lastError)}`)
}

/**
 * Return the verified sharp tarball, downloading it only when the shared cache lacks it.
 * @param cache - Directory shared with the other pinned packaging downloads.
 * @returns Path of the checksum-addressed archive.
 */
async function sharpArchive(cache: string): Promise<string> {
  mkdirSync(cache, { recursive: true })
  const destination = join(cache, SHARP_SHA256)
  let bytes: Buffer
  try {
    bytes = readFileSync(destination)
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    bytes = await downloadSharpTarball()
  }
  if (createHash('sha256').update(bytes).digest('hex') !== SHARP_SHA256) {
    rmSync(destination, { force: true })
    throw new Error(`electron-safe sharp download: checksum mismatch for ${SHARP_SHA256}`)
  }
  if (!existsSync(destination)) writeFileSync(destination, bytes)
  return destination
}

/**
 * Swap the runtime's sharp package for the Electron-safe rebuild.
 * @param root - Prepared dsh tree that becomes `resources/app.asar/dsh`.
 * @param cache - Directory shared with the other pinned packaging downloads.
 * @param target - Release target; only linux-x64 has a rebuild published.
 * @throws When the rebuild has no build for the target, or the installed tree is unexpected.
 */
export async function installElectronSafeSharp(
  root: string,
  cache: string,
  target: DesktopTargetName,
): Promise<void> {
  const modules = join(root, 'node_modules')
  const destination = join(modules, SHARP_DESTINATION)
  if (!existsSync(destination) || !statSync(destination).isDirectory()) {
    throw new Error(`electron-safe sharp: ${destination} is not an installed package directory`)
  }
  if (target !== 'linux-x64') {
    throw new Error(`electron-safe sharp: no rebuilt sharp is published for ${target}`)
  }
  const archive = await sharpArchive(cache)
  const staging = join(cache, `extract-${SHARP_SHA256}`)
  rmSync(staging, { recursive: true, force: true })
  mkdirSync(staging, { recursive: true })
  execFileSync('tar', ['-xzf', archive, '-C', staging])
  const source = join(staging, 'package', 'linux-x64', SHARP_DESTINATION)
  if (!existsSync(join(source, 'src', 'build', 'Release'))) {
    throw new Error(`electron-safe sharp: ${archive} does not contain a linux-x64 build`)
  }
  rmSync(destination, { recursive: true, force: true })
  cpSync(source, destination, { recursive: true, dereference: true })
  // The replaced native libraries are dead weight once the rebuild is in place, and shipping
  // them would leave the crashing artifacts in the application.
  for (const name of REPLACED_SHARP_PACKAGES) {
    rmSync(join(modules, ...name.split('/')), { recursive: true, force: true })
  }
  rmSync(staging, { recursive: true, force: true })
}

/**
 * Make the LibreOfficeKit engine probe work inside an ASAR archive.
 * @param root - Prepared dsh tree that becomes `resources/app.asar/dsh`.
 * @throws When the installed engine no longer contains the probe this fixes.
 */
export function fixLibreOfficeEngineFallback(root: string): void {
  const path = join(root, 'node_modules', ...OFFICE_ENGINE_PACKAGE.split('/'), OFFICE_ENGINE_ENTRY)
  const source = readFileSync(path, 'utf8')
  const occurrences = source.split(OFFICE_ENGINE_EXISTENCE_CHECK).length - 1
  if (occurrences !== 1) {
    throw new Error(`desktop runtime: ${OFFICE_ENGINE_PACKAGE} no longer contains the installed-package probe this build patches`)
  }
  writeFileSync(path, source.replace(OFFICE_ENGINE_EXISTENCE_CHECK, OFFICE_ENGINE_EXISTENCE_FIX))
}
