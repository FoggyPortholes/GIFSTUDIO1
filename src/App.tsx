import React, { useMemo, useState } from 'react';
import { StudioProvider } from './store/studioStore';
import { CharacterDesigner } from './components/studio/CharacterDesigner';
import { AnimationStudio } from './components/studio/AnimationStudio';
import { AIGeneratorPanel } from './components/studio/AIGeneratorPanel';
import { AssetLibrary } from './components/studio/AssetLibrary';
import { SettingsPanel } from './components/studio/SettingsPanel';
import { VersionBadge } from './components/common/VersionBadge';
import { useUpdateWatcher } from './hooks/useVersionInfo';
import type { VersionManifest } from './hooks/useVersionInfo';

import './styles.css';

type ViewKey = 'designer' | 'animation' | 'ai' | 'library' | 'settings';

const NAVIGATION: { key: ViewKey; label: string; description: string }[] = [
  { key: 'designer', label: 'Character Builder', description: 'Paint and refine a normalized base avatar.' },
  { key: 'animation', label: 'Animation Studio', description: 'Build frame-by-frame motion and export GIFs.' },
  { key: 'ai', label: 'AI Forge', description: 'Generate concept art and procedural GIFs from prompts.' },
  { key: 'library', label: 'Asset Library', description: 'Manage character variants and normalized templates.' },
  { key: 'settings', label: 'Project Settings', description: 'Import/export studio data and tweak preferences.' },
];

function ViewRenderer({ active }: { active: ViewKey }) {
  switch (active) {
    case 'designer':
      return <CharacterDesigner />;
    case 'animation':
      return <AnimationStudio />;
    case 'ai':
      return <AIGeneratorPanel />;
    case 'library':
      return <AssetLibrary />;
    case 'settings':
      return <SettingsPanel />;
    default:
      return null;
  }
}

function formatManifestLabel(manifest?: VersionManifest | null) {
  if (!manifest) {
    return 'New build available';
  }
  return `v${manifest.version}${manifest.gitHash ? ` (${manifest.gitHash})` : ''}`;
}

function AppShell() {
  const [activeView, setActiveView] = useState<ViewKey>('designer');
  const activeNav = useMemo(() => NAVIGATION.find((item) => item.key === activeView), [activeView]);
  const { currentVersion, latestVersion, updateAvailable, relaunch } = useUpdateWatcher();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Pixel Persona Studio</h1>
          <p className="subtitle">Create normalized pixel characters, orchestrate animations and experiment with AI-driven variations.</p>
        </div>
        <VersionBadge version={currentVersion} />
      </header>
      {updateAvailable && (
        <div className="update-banner" role="status" aria-live="polite">
          <div className="update-banner__details">
            <span className="update-banner__title">Update available</span>
            <span className="update-banner__version">{formatManifestLabel(latestVersion)}</span>
            <span className="update-banner__current">Current: {formatManifestLabel(currentVersion)}</span>
          </div>
          <button type="button" className="update-banner__action" onClick={relaunch}>
            Relaunch now
          </button>
        </div>
      )}
      <div className="app-body">
        <nav className="side-nav" aria-label="Studio sections">
          <ul className="side-nav__list">
            {NAVIGATION.map((item) => {
              const isActive = item.key === activeView;
              const descriptionId = `nav-${item.key}-description`;
              return (
                <li key={item.key} className="side-nav__item">
                  <button
                    type="button"
                    className={isActive ? 'active' : ''}
                    aria-current={isActive ? 'page' : undefined}
                    aria-describedby={descriptionId}
                    onClick={() => setActiveView(item.key)}
                  >
                    <span className="nav-label">{item.label}</span>
                    <span id={descriptionId} className="nav-description">
                      {item.description}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="workspace">
          <ViewRenderer active={activeView} />
        </main>
      </div>
      {activeNav && <footer className="status-bar">{activeNav.description}</footer>}
    </div>
  );
}

export default function App() {
  return (
    <StudioProvider>
      <AppShell />
    </StudioProvider>
  );
}
