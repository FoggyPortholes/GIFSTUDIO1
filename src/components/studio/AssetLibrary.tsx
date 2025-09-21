import React from 'react';
import { useStudioStore } from '../../store/studioStore';
import { createNormalizedCharacter, createId } from '../../utils/characterTemplate';
import { CharacterModel } from '../../types';

function cloneCharacter(character: CharacterModel): CharacterModel {
  const cloned: CharacterModel = {
    ...character,
    id: createId('character'),
    name: `${character.name} Copy`,
    palette: [...character.palette],
    metadata: character.metadata ? { ...character.metadata } : undefined,
    frames: character.frames.map((frame) => ({
      ...frame,
      id: createId('frame'),
      layers: frame.layers.map((layer) => ({
        ...layer,
        id: createId('layer'),
        pixels: layer.pixels.slice(),
      })),
    })),
  };
  return cloned;
}

export function AssetLibrary() {
  const { state, dispatch } = useStudioStore();

  return (
    <div className="asset-library">
      <div className="panel-header">Characters</div>
      <div className="asset-grid">
        {state.characters.map((character) => (
          <div
            key={character.id}
            className={`asset-card ${state.activeCharacterId === character.id ? 'active' : ''}`}
          >
            <header>
              <strong>{character.name}</strong>
              <span>{character.width}×{character.height}</span>
            </header>
            <p>{character.metadata?.description ?? 'Custom character'}</p>
            <div className="asset-actions">
              <button onClick={() => dispatch({ type: 'SET_ACTIVE_CHARACTER', id: character.id })}>Activate</button>
              <button onClick={() => dispatch({ type: 'ADD_CHARACTER', character: cloneCharacter(character) })}>
                Duplicate
              </button>
              {state.characters.length > 1 && (
                <button onClick={() => dispatch({ type: 'DELETE_CHARACTER', id: character.id })}>Delete</button>
              )}
            </div>
          </div>
        ))}
        <button className="asset-card ghost" onClick={() => dispatch({ type: 'ADD_CHARACTER', character: createNormalizedCharacter() })}>
          Create new normalized base
        </button>
      </div>
    </div>
  );
}
