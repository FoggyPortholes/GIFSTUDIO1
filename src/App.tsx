import React, { useState } from 'react';
import { Generate } from './components/Generate';
import { Sprites } from './components/Sprites';
import { Edit } from './components/Edit';
import { Settings } from './components/Settings';
import { DebugPanel } from './components/DebugPanel';

export default function App() {
  const [tab, setTab] = useState('generate');

  return (
    <div>
      <div className="bar">
        <h1 style={{margin:0}}>Gif Studio — Spicy Pickle (Debug) v1.3.0</h1>
      </div>
      <nav style={{marginTop:12}}>
        <button onClick={() => setTab('generate')}>Generate</button>
        <button onClick={() => setTab('sprites')}>Sprites</button>
        <button onClick={() => setTab('edit')}>Edit</button>
        <button onClick={() => setTab('settings')}>Settings</button>
        <button onClick={() => setTab('debug')}>Debug</button>
      </nav>
      <hr />
      <div>
        {tab === 'generate' && <Generate />}
        {tab === 'sprites' && <Sprites />}
        {tab === 'edit' && <Edit />}
        {tab === 'settings' && <Settings />}
        {tab === 'debug' && <DebugPanel />}
      </div>
    </div>
  );
}
