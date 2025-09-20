import React, { useState, useEffect } from 'react';
import { getLogs, downloadLogs, hasLastGif, downloadLastGif } from '../services/logger';

export function DebugPanel() {
  const [text, setText] = useState('');

  useEffect(() => {
    setText(getLogs());
  }, []);

  return (
    <div>
      <p>This panel shows the most recent log buffer.</p>
      <button onClick={() => setText(getLogs())}>Refresh</button>
      <button onClick={downloadLogs} style={{marginLeft:8}}>Download Logs</button>
      <button onClick={downloadLastGif} style={{marginLeft:8}} disabled={!hasLastGif()}>
        Download Last GIF
      </button>
      <textarea value={text} readOnly />
    </div>
  );
}
