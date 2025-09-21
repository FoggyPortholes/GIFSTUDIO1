import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStudioStore, useActiveCharacter, useActiveFrame } from '../../store/studioStore';
import { composeFrame, pixelIndex } from '../../utils/frame';

function PaletteEditor() {
  const { state, dispatch } = useStudioStore();
  const character = useActiveCharacter();
  const [newColor, setNewColor] = useState('#ff8c69');

  return (
    <div className="panel">
      <div className="panel-header">Palette</div>
      <div className="palette-grid">
        {character.palette.map((color, idx) => (
          <button
            key={color + idx}
            className={`swatch ${state.brushColor === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            title={`Select ${color}`}
            onClick={() => dispatch({ type: 'SET_BRUSH_COLOR', color })}
            onContextMenu={(event) => {
              event.preventDefault();
              dispatch({ type: 'REMOVE_PALETTE_COLOR', index: idx });
            }}
          />
        ))}
      </div>
      <div className="palette-tools">
        <input type="color" value={newColor} onChange={(event) => setNewColor(event.target.value)} />
        <button
          onClick={() => {
            dispatch({ type: 'ADD_PALETTE_COLOR', color: newColor });
          }}
        >
          Add Color
        </button>
      </div>
    </div>
  );
}

function LayerList() {
  const { state, dispatch } = useStudioStore();
  const frame = useActiveFrame();

  return (
    <div className="panel">
      <div className="panel-header">Layers</div>
      <ul className="layer-list">
        {frame.layers.map((layer) => (
          <li key={layer.id} className={state.activeLayerId === layer.id ? 'active' : ''}>
            <button
              className="layer-name"
              onClick={() => dispatch({ type: 'SET_ACTIVE_LAYER', id: layer.id })}
              onDoubleClick={() => {
                const next = window.prompt('Layer name', layer.name);
                if (next) dispatch({ type: 'RENAME_LAYER', id: layer.id, name: next });
              }}
            >
              {layer.name}
            </button>
            <div className="layer-actions">
              <label>
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', id: layer.id })}
                />
                Visible
              </label>
              {!layer.locked && (
                <button onClick={() => dispatch({ type: 'DELETE_LAYER', id: layer.id })}>Delete</button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <button onClick={() => dispatch({ type: 'ADD_LAYER', name: 'Detail Layer' })}>Add Layer</button>
    </div>
  );
}

function BrushSettings() {
  const { state, dispatch } = useStudioStore();

  return (
    <div className="panel">
      <div className="panel-header">Brush</div>
      <div className="brush-controls">
        <label>
          <input
            type="radio"
            name="brush-mode"
            checked={state.brushMode === 'paint'}
            onChange={() => dispatch({ type: 'SET_BRUSH_MODE', mode: 'paint' })}
          />
          Paint
        </label>
        <label>
          <input
            type="radio"
            name="brush-mode"
            checked={state.brushMode === 'erase'}
            onChange={() => dispatch({ type: 'SET_BRUSH_MODE', mode: 'erase' })}
          />
          Erase
        </label>
        <label>
          <input
            type="radio"
            name="brush-mode"
            checked={state.brushMode === 'eyedrop'}
            onChange={() => dispatch({ type: 'SET_BRUSH_MODE', mode: 'eyedrop' })}
          />
          Eyedrop
        </label>
      </div>
      <label className="scale-control">
        Pixel size
        <input
          type="range"
          min={4}
          max={48}
          value={state.pixelScale}
          onChange={(event) => dispatch({ type: 'SET_PIXEL_SCALE', scale: Number(event.target.value) })}
        />
      </label>
    </div>
  );
}

function CharacterMeta() {
  const { state, dispatch } = useStudioStore();
  const character = useActiveCharacter();

  return (
    <div className="panel">
      <div className="panel-header">Character</div>
      <label className="field">
        Name
        <input
          type="text"
          value={character.name}
          onChange={(event) =>
            dispatch({ type: 'RENAME_CHARACTER', id: character.id, name: event.target.value })
          }
        />
      </label>
      <div className="dimensions">{character.width} × {character.height} pixels</div>
      {character.metadata?.description && (
        <p className="description">{character.metadata.description}</p>
      )}
    </div>
  );
}

export function CharacterDesigner() {
  const { state, dispatch } = useStudioStore();
  const character = useActiveCharacter();
  const frame = useActiveFrame();
  const composed = useMemo(
    () => composeFrame(frame, character.width, character.height),
    [frame, character.width, character.height]
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scale = state.pixelScale;
    canvas.width = character.width * scale;
    canvas.height = character.height * scale;
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < character.height; y += 1) {
      for (let x = 0; x < character.width; x += 1) {
        const color = composed[pixelIndex(x, y, character.width)];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        } else {
          ctx.fillStyle = y % 2 === 0 ? '#1f2937' : '#111827';
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= character.width; gx += 1) {
      ctx.beginPath();
      ctx.moveTo(gx * scale + 0.5, 0);
      ctx.lineTo(gx * scale + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let gy = 0; gy <= character.height; gy += 1) {
      ctx.beginPath();
      ctx.moveTo(0, gy * scale + 0.5);
      ctx.lineTo(canvas.width, gy * scale + 0.5);
      ctx.stroke();
    }
  }, [composed, state.pixelScale, character.width, character.height]);

  const applyBrush = useCallback(
    (x: number, y: number) => {
      if (state.brushMode === 'eyedrop') {
        const sampled = composed[pixelIndex(x, y, character.width)];
        if (sampled) {
          dispatch({ type: 'SET_BRUSH_COLOR', color: sampled });
        }
        dispatch({ type: 'SET_BRUSH_MODE', mode: 'paint' });
        return;
      }
      const color = state.brushMode === 'paint' ? state.brushColor : null;
      dispatch({ type: 'PAINT_PIXEL', x, y, color });
    },
    [state.brushMode, state.brushColor, composed, dispatch, character.width]
  );

  const handlePointerEvent = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = state.pixelScale;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((event.clientX - rect.left) / scale);
      const y = Math.floor((event.clientY - rect.top) / scale);
      if (x < 0 || y < 0 || x >= character.width || y >= character.height) return;
      applyBrush(x, y);
    },
    [state.pixelScale, character.width, character.height, applyBrush]
  );

  return (
    <div className="designer">
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="pixel-canvas"
          onPointerDown={(event) => {
            setIsDrawing(true);
            (event.target as HTMLCanvasElement).setPointerCapture(event.pointerId);
            handlePointerEvent(event);
          }}
          onPointerMove={(event) => {
            if (!isDrawing) return;
            handlePointerEvent(event);
          }}
          onPointerUp={(event) => {
            setIsDrawing(false);
            (event.target as HTMLCanvasElement).releasePointerCapture(event.pointerId);
          }}
        />
      </div>
      <div className="sidebars">
        <CharacterMeta />
        <BrushSettings />
        <PaletteEditor />
        <LayerList />
      </div>
    </div>
  );
}
