import React, { useMemo } from 'react';
import type { VersionManifest } from '../../hooks/useVersionInfo';

interface VersionBadgeProps {
  version: VersionManifest;
}

function formatBuildTime(buildTime?: string) {
  if (!buildTime) {
    return undefined;
  }

  try {
    const parsed = new Date(buildTime);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch (error) {
    return undefined;
  }
}

function formatLabel(version: VersionManifest) {
  const hash = version.gitHash ? ` (${version.gitHash})` : '';
  return `v${version.version}${hash}`;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({ version }) => {
  const buildTimestamp = useMemo(() => formatBuildTime(version.buildTime), [version.buildTime]);
  const title = useMemo(() => {
    const buildLabel = buildTimestamp ? `Build time: ${buildTimestamp}` : undefined;
    const hashLabel = version.gitHash ? `Commit: ${version.gitHash}` : undefined;
    return [buildLabel, hashLabel].filter(Boolean).join('\n');
  }, [buildTimestamp, version.gitHash]);

  return (
    <div className="version-badge" title={title || undefined} aria-label={`Application version ${formatLabel(version)}`}>
      <span className="version-badge__label">Build</span>
      <span className="version-badge__value">{formatLabel(version)}</span>
      {buildTimestamp && <span className="version-badge__time">{buildTimestamp}</span>}
    </div>
  );
};
