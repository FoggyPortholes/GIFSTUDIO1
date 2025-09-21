import React, { useMemo, useState } from 'react';
import { StudioProvider } from './store/studioStore';
import { CharacterDesigner } from './components/studio/CharacterDesigner';
import { AnimationStudio } from './components/studio/AnimationStudio';
import { AIGeneratorPanel } from './components/studio/AIGeneratorPanel';
import { AssetLibrary } from './components/studio/AssetLibrary';
import { SettingsPanel } from './components/studio/SettingsPanel';

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

function AppShell() {
  const [activeView, setActiveView] = useState<ViewKey>('designer');
  const activeNav = useMemo(() => NAVIGATION.find((item) => item.key === activeView), [activeView]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Pixel Persona Studio</h1>
          <p className="subtitle">Create normalized pixel characters, orchestrate animations and experiment with AI-driven variations.</p>
        </div>
        <div className="version">Studio Core v2.0</div>
      </header>
      <div className="app-body">
        <nav className="side-nav">
          {NAVIGATION.map((item) => (
            <button
              key={item.key}
              className={item.key === activeView ? 'active' : ''}
              onClick={() => setActiveView(item.key)}
            >
              <span className="nav-label">{item.label}</span>
              <span className="nav-description">{item.description}</span>
            </button>
          ))}
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
