import React, { useState } from 'react';
import { generateGif, testGif } from '../services/imageService';
import { log, clearLogs } from '../services/logger';

export function Generate() {
  const [files, setFiles] = useState<File[]>([]);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [delay, setDelay] = useState<number>(200);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleGenerate = async () => {
    setError(null);
    clearLogs();
    try {
      if (files.length === 0) {
        alert('Please upload images first.');
        return;
      }
      const url = await generateGif(files, delay);
      setGifUrl(url);
    } catch (e: any) {
      setGifUrl(null);
      setError(e?.message || 'Unknown error during GIF generation');
      log('ERROR', 'Generate failed', { message: e?.message, stack: e?.stack });
    }
  };

  const handleTest = async () => {
    setError(null);
    clearLogs();
    try {
      const url = await testGif();
      setGifUrl(url);
    } catch (e: any) {
      setGifUrl(null);
      setError(e?.message || 'Unknown error in test GIF');
      log('ERROR', 'Test failed', { message: e?.message, stack: e?.stack });
    }
  };

  return (
    <div>
      <div style={{marginBottom:8}}>
        <input type="file" accept="image/*" multiple onChange={handleFiles} />
        <label style={{marginLeft:12}}>Delay (ms):</label>
        <input type="number" value={delay} onChange={e=>setDelay(parseInt(e.target.value||'200',10))} style={{width:80, marginLeft:4}} />
      </div>
      <button onClick={handleGenerate}>Generate GIF</button>
      <button onClick={handleTest} style={{marginLeft:8}}>Test GIF</button>
      {error && <p style={{color:'red'}}>Error: {error}</p>}
      {gifUrl && (
        <div style={{marginTop:12}}>
          <img src={gifUrl} alt="Generated GIF" />
          <div><a href={gifUrl} download="animation.gif">Download GIF</a></div>
        </div>
      )}
    </div>
  );
}
