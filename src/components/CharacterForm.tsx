import type { ChangeEvent } from 'react';
import { characterSchema, defaultCharacter, type Character, type CharacterField } from '../domain/character';
import { useAppStore } from '../state/store';

const FIELD_LABELS: Record<CharacterField, string> = {
  archetype: 'Archetype',
  age: 'Age',
  gender: 'Gender',
  hair: 'Hair',
  eyes: 'Eyes',
  outfit: 'Outfit',
  vibe: 'Vibe',
  negativePrompt: 'Negative Prompt',
};

const ORDER: Array<Exclude<CharacterField, 'negativePrompt'>> = [
  'archetype',
  'age',
  'gender',
  'hair',
  'eyes',
  'outfit',
  'vibe',
];

export function CharacterForm() {
  const character = useAppStore((state) => state.character);
  const setCharacter = useAppStore((state) => state.setCharacter);

  const handleSelectChange = (field: Exclude<CharacterField, 'negativePrompt'>) =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      setCharacter({ [field]: event.target.value } as Partial<Character>);
    };

  const handleNegativePromptChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setCharacter({ negativePrompt: event.target.value });
  };

  const handleReset = () => {
    setCharacter(defaultCharacter);
  };

  return (
    <section className="panel" aria-labelledby="character-form-heading">
      <div className="panel__header">
        <div>
          <h2 id="character-form-heading">Character Blueprint</h2>
          <p>Describe the hero, then refine the prompt. Changes preview instantly.</p>
        </div>
        <button type="button" className="button button--secondary" onClick={handleReset}>
          Reset fields
        </button>
      </div>

      <div className="form-grid">
        {ORDER.map((field) => (
          <label key={field} className="form-field">
            <span>{FIELD_LABELS[field]}</span>
            <select value={character[field]} onChange={handleSelectChange(field)}>
              {characterSchema[field].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <label className="form-field form-field--textarea">
        <span>{FIELD_LABELS.negativePrompt}</span>
        <textarea
          value={character.negativePrompt}
          onChange={handleNegativePromptChange}
          rows={3}
          placeholder="low quality, blurry, duplicate, extra limbs, disfigured"
        />
      </label>
    </section>
  );
}