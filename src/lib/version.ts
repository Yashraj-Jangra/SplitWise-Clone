/**
 * Centralized Application Versioning & Metadata
 * Single source of truth for app version, build identifiers, and release information.
 */

export const APP_VERSION = '0.3.2';
export const APP_NAME = 'SplitIt';
export const BUILD_NUMBER = '2026.09.05';
export const BUILD_CHANNEL: 'alpha' | 'beta' | 'rc' | 'stable' = 'beta';
export const BUILD_DATE = '2026-09-05';
export const APP_EDITION = 'Community Edition';

export interface VersionInfo {
  version: string;
  name: string;
  buildNumber: string;
  channel: 'alpha' | 'beta' | 'rc' | 'stable';
  buildDate: string;
  edition: string;
}

/**
 * Returns formatted version string for UI display (e.g., "v0.2.0-beta" or "v0.2.0")
 */
export function getAppVersionDisplay(includeChannel = false): string {
  if (includeChannel && BUILD_CHANNEL !== 'stable') {
    return `v${APP_VERSION}-${BUILD_CHANNEL}`;
  }
  return `v${APP_VERSION}`;
}

/**
 * Returns full build info string for diagnostic views or footers
 */
export function getBuildInfoDisplay(): string {
  return `${getAppVersionDisplay(true)} • Build ${BUILD_NUMBER}`;
}

/**
 * Returns complete version information object
 */
export function getFullVersionInfo(): VersionInfo {
  return {
    version: APP_VERSION,
    name: APP_NAME,
    buildNumber: BUILD_NUMBER,
    channel: BUILD_CHANNEL,
    buildDate: BUILD_DATE,
    edition: APP_EDITION,
  };
}
