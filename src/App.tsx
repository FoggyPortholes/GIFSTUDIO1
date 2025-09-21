import { useCallback, useEffect, useMemo, useState } from 'react';
import { GIFEncoder, applyPalette, quantize } from 'gifenc';

import './styles.css';

type LogEntry = {
  id: number;
  message: string;
  timestamp: Date;
};

type ValidatorResult = {
  header: string;
  hasValidHeader: boolean;
  hasValidTrailer: boolean;
  globalPaletteSize: number | null;
  byteLength: number;
};

type GifArtifact = {
  blob: Blob;
  url: string;
  bytes: Uint8Array;
};

const WIDTH = 96;
const HEIGHT = 64;
const DELAY_MS = 220;

function encodeTestFrames(): Uint8Array {
  const encoder = GIFEncoder();
  const frames = [createGradientFrame('#ff1b2d', '#ffb347'), createGradientFrame('#2b6cff', '#0dd0ff')];

  frames.forEach((rgba, index) => {
    const palette = quantize(rgba, 256);
    const paletteIndex = applyPalette(rgba, palette);
    encoder.writeFrame(paletteIndex, WIDTH, HEIGHT, {
      delay: DELAY_MS,
      palette,
      ...(index === 0 ? { repeat: 0 } : {}),
    });
  });

  encoder.finish();
  const bytes = encoder.bytesView();
  return new Uint8Array(bytes);
}

function createGradientFrame(startHex: string, endHex: string): Uint8ClampedArray {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const t = (x + y) / (WIDTH + HEIGHT - 2);
      const r = Math.round(lerp(start.r, end.r, t));
      const g = Math.round(lerp(start.g, end.g, t));
      const b = Math.round(lerp(start.b, end.b, t));
      const offset = (y * WIDTH + x) * 4;
      data[offset + 0] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = 255;
    }
  }
  return data;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

function analyzeGif(bytes: Uint8Array): ValidatorResult {
  const headerBytes = bytes.slice(0, 6);
  const header = String.fromCharCode(...headerBytes);
  const trailerByte = bytes.at(-1) ?? 0;
  const hasValidHeader = header === 'GIF87a' || header === 'GIF89a';
  const hasValidTrailer = trailerByte === 0x3b;

  let globalPaletteSize: number | null = null;
  if (bytes.length >= 13) {
    const packedField = bytes[10];
    const hasGlobalPalette = (packedField & 0x80) !== 0;
    if (hasGlobalPalette) {
      const sizeBits = (packedField & 0x07) + 1;
      globalPaletteSize = 2 ** sizeBits;
    }
  }

  return {
    header,
    hasValidHeader,
    hasValidTrailer,
    globalPaletteSize,
    byteLength: bytes.length,
  };
}

function formatTimestamp(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'debug'>('studio');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastGif, setLastGif] = useState<GifArtifact | null>(null);
  const [validatorResult, setValidatorResult] = useState<ValidatorResult | null>(null);
  const [isEncoding, setIsEncoding] = useState(false);

  const pushLog = useCallback((message: string) => {
    setLogs((entries) => [
      ...entries,
      {
        id: entries.length + 1,
        message,
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    pushLog('Gif Studio ready. Generate a test GIF to begin.');
  }, [pushLog]);

  const generateGif = useCallback(() => {
    setIsEncoding(true);
    pushLog('Starting red → blue gradient encode…');
    try {
      const bytes = encodeTestFrames();
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([buffer], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);

      setLastGif((current) => {
        if (current) {
          URL.revokeObjectURL(current.url);
        }
        return { blob, url, bytes };
      });

      const analysis = analyzeGif(bytes);
      setValidatorResult(analysis);

      pushLog(`GIF completed (${analysis.byteLength.toLocaleString()} bytes).`);
      pushLog(`Header: ${analysis.header}, Trailer OK: ${analysis.hasValidTrailer ? 'yes' : 'no'}.`);
      if (analysis.globalPaletteSize) {
        pushLog(`Global palette detected with ${analysis.globalPaletteSize} colors.`);
      } else {
        pushLog('Warning: no global palette detected in first frame.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushLog(`Encoding failed: ${message}`);
    } finally {
      setIsEncoding(false);
    }
  }, [pushLog]);

  const validateFromFile = useCallback(
    async (file: File) => {
      pushLog(`Validating uploaded GIF: ${file.name}`);
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const analysis = analyzeGif(bytes);
      setValidatorResult(analysis);
      pushLog(`Header: ${analysis.header}, Trailer OK: ${analysis.hasValidTrailer ? 'yes' : 'no'}.`);
      if (analysis.globalPaletteSize) {
        pushLog(`Global palette detected with ${analysis.globalPaletteSize} colors.`);
      } else {
        pushLog('Warning: no global palette detected in first frame.');
      }
    },
    [pushLog],
  );

  const logText = useMemo(
    () => logs.map((entry) => `[${formatTimestamp(entry.timestamp)}] ${entry.message}`).join('\n'),
    [logs],
  );

  const handleDownloadLogs = useCallback(() => {
    const blob = new Blob([logText || 'No logs recorded.'], { type: 'text/plain' });
    downloadBlob(blob, 'gif-studio-logs.txt');
  }, [logText]);

  const handleDownloadGif = useCallback(() => {
    if (!lastGif) {
      pushLog('No GIF available to download.');
      return;
    }
    downloadBlob(lastGif.blob, 'last-animation.gif');
    pushLog('Last GIF downloaded.');
  }, [lastGif, pushLog]);

  useEffect(() => {
    return () => {
      if (lastGif) {
        URL.revokeObjectURL(lastGif.url);
      }
    };
  }, [lastGif]);

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Gif Studio — Spicy Pickle</h1>
          <p className="app__subtitle">Generate and validate pixel-perfect GIF animations with built-in debugging tools.</p>
        </div>
        <span className="app__version" aria-label="App version">
          Lite Debug v1.3.1
        </span>
      </header>

      <nav className="tabs" aria-label="Primary">
        <button
          type="button"
          className={activeTab === 'studio' ? 'active' : ''}
          onClick={() => setActiveTab('studio')}
          aria-pressed={activeTab === 'studio'}
        >
          Studio
        </button>
        <button
          type="button"
          className={activeTab === 'debug' ? 'active' : ''}
          onClick={() => setActiveTab('debug')}
          aria-pressed={activeTab === 'debug'}
        >
          Debug
        </button>
      </nav>

      <main className="app__body">
        {activeTab === 'studio' ? (
          <div className="panel-grid">
            <section className="card" aria-labelledby="encoder-heading">
              <header className="card__header">
                <div>
                  <h2 id="encoder-heading">Test GIF Generator</h2>
                  <p>Create a two-frame animation that blends from red to blue, then preview and validate the output.</p>
                </div>
                <button type="button" className="primary" onClick={generateGif} disabled={isEncoding}>
                  {isEncoding ? 'Encoding…' : 'Test GIF'}
                </button>
              </header>
              {lastGif ? (
                <div className="card__content">
                  <div className="preview">
                    <img src={lastGif.url} alt="Generated GIF preview" />
                  </div>
                  <button type="button" onClick={handleDownloadGif} className="secondary">
                    Download Last GIF
                  </button>
                </div>
              ) : (
                <p className="card__placeholder">No GIF generated yet.</p>
              )}
            </section>

            <section className="card" aria-labelledby="validator-heading">
              <header className="card__header">
                <div>
                  <h2 id="validator-heading">GIF Validator</h2>
                  <p>Drop any GIF to verify headers, trailer bytes, and palette data.</p>
                </div>
              </header>
              <div className="card__content">
                <label className="file-input">
                  <span>Upload GIF</span>
                  <input
                    type="file"
                    accept="image/gif"
                    onChange={(event: Event & { target: HTMLInputElement }) => {
                      const file = event.target.files?.[0] ?? null;
                      if (file) {
                        void validateFromFile(file);
                        event.target.value = '';
                      }
                    }}
                  />
                </label>

                {validatorResult ? (
                  <dl className="validator-results">
                    <div>
                      <dt>Header</dt>
                      <dd>{validatorResult.header}</dd>
                    </div>
                    <div>
                      <dt>Header Valid</dt>
                      <dd>{validatorResult.hasValidHeader ? 'Yes' : 'No'}</dd>
                    </div>
                    <div>
                      <dt>Trailer Present</dt>
                      <dd>{validatorResult.hasValidTrailer ? 'Yes (0x3B)' : 'No'}</dd>
                    </div>
                    <div>
                      <dt>Global Palette</dt>
                      <dd>
                        {validatorResult.globalPaletteSize
                          ? `${validatorResult.globalPaletteSize} colors`
                          : 'Not detected'}
                      </dd>
                    </div>
                    <div>
                      <dt>Total Bytes</dt>
                      <dd>{validatorResult.byteLength.toLocaleString()}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="card__placeholder">No GIF inspected yet.</p>
                )}
              </div>
            </section>
          </div>
        ) : (
          <section className="card card--debug" aria-label="Debug panel">
            <header className="card__header">
              <div>
                <h2>Live Logs</h2>
                <p>Monitor encoder activity, then export raw data and GIF artifacts.</p>
              </div>
              <div className="debug-actions">
                <button type="button" className="secondary" onClick={handleDownloadLogs}>
                  Download Logs
                </button>
                <button type="button" className="secondary" onClick={handleDownloadGif}>
                  Download Last GIF
                </button>
              </div>
            </header>
            <div className="log-view" role="log" aria-live="polite">
              {logs.length ? (
                <ul>
                  {logs.map((entry) => (
                    <li key={entry.id}>
                      <span className="log-time">[{formatTimestamp(entry.timestamp)}]</span>{' '}
                      <span>{entry.message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="card__placeholder">No log entries yet.</p>
              )}
            </div>
            <footer className="card__footer">
              <p>Logs auto-refresh in real-time. Use the buttons above to export artifacts.</p>
            </footer>
          </section>
        )}
      </main>
    </div>
  );
}
