import { useCallback, useEffect, useMemo, useState } from 'react';

type NullableString = string | null | undefined;

export interface VersionManifest {
  version: string;
  gitHash?: string;
  buildTime?: string;
}

const CURRENT_MANIFEST: VersionManifest = {
  version: __APP_VERSION__,
  gitHash: __APP_GIT_HASH__ || undefined,
  buildTime: __APP_BUILD_TIME__ || undefined
};

const VERSION_ENDPOINT = '/version.json';

function normalize(value: NullableString) {
  return (value ?? '').trim();
}

function manifestsMatch(next: VersionManifest | null | undefined) {
  if (!next) {
    return false;
  }

  return (
    normalize(next.version) === normalize(CURRENT_MANIFEST.version) &&
    normalize(next.gitHash) === normalize(CURRENT_MANIFEST.gitHash)
  );
}

async function requestLatestManifest(): Promise<VersionManifest | null> {
  try {
    const response = await fetch(`${VERSION_ENDPOINT}?ts=${Date.now()}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as VersionManifest;
    if (!data || typeof data.version !== 'string') {
      return null;
    }

    return {
      version: data.version,
      gitHash: normalize(data.gitHash) || undefined,
      buildTime: data.buildTime
    };
  } catch (error) {
    console.warn('[version] Failed to check for updates', error);
    return null;
  }
}

export function useVersionInfo() {
  return useMemo(() => CURRENT_MANIFEST, []);
}

export function useUpdateWatcher(intervalMs = 60_000) {
  const [latestVersion, setLatestVersion] = useState<VersionManifest | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdates = useCallback(async () => {
    if (isChecking) {
      return latestVersion;
    }

    setIsChecking(true);
    const manifest = await requestLatestManifest();
    setIsChecking(false);

    if (manifest && !manifestsMatch(manifest)) {
      setLatestVersion(manifest);
    }

    return manifest;
  }, [isChecking, latestVersion]);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const manifest = await checkForUpdates();
      if (!cancelled && manifest && manifestsMatch(manifest)) {
        setLatestVersion(null);
      }
    };

    if (typeof window !== 'undefined') {
      tick();
      const intervalId = window.setInterval(tick, intervalMs);
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          tick();
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      return () => {
        cancelled = true;
        window.clearInterval(intervalId);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [checkForUpdates, intervalMs]);

  const relaunch = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  const updateAvailable = useMemo(() => latestVersion !== null, [latestVersion]);

  return {
    currentVersion: CURRENT_MANIFEST,
    latestVersion,
    updateAvailable,
    isChecking,
    checkForUpdates,
    relaunch
  };
}
