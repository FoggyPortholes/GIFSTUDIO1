export interface CharacterOption {
  value: string;
  label: string;
  hint?: string;
}

export interface Character {
  archetype: string;
  age: string;
  gender: string;
  hair: string;
  eyes: string;
  outfit: string;
  vibe: string;
  negativePrompt: string;
}

type CharacterSchema = Record<keyof Omit<Character, 'negativePrompt'>, CharacterOption[]>;

export const characterSchema: CharacterSchema = {
  archetype: [
    { value: 'hero', label: 'Heroic Protagonist' },
    { value: 'villain', label: 'Charismatic Villain' },
    { value: 'mystic', label: 'Arcane Mystic' },
    { value: 'inventor', label: 'Brilliant Inventor' },
    { value: 'explorer', label: 'Cosmic Explorer' },
  ],
  age: [
    { value: 'child', label: 'Child' },
    { value: 'teen', label: 'Teen' },
    { value: 'adult', label: 'Adult' },
    { value: 'elder', label: 'Elder' },
    { value: 'ageless', label: 'Ageless Being' },
  ],
  gender: [
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
    { value: 'nonbinary', label: 'Non-binary' },
    { value: 'andro', label: 'Androgynous' },
    { value: 'android', label: 'Android' },
  ],
  hair: [
    { value: 'short', label: 'Short Hair' },
    { value: 'long', label: 'Long Hair' },
    { value: 'curly', label: 'Curly Hair' },
    { value: 'braided', label: 'Braided Hair' },
    { value: 'shaved', label: 'Shaved or Bald' },
  ],
  eyes: [
    { value: 'amber', label: 'Amber Eyes' },
    { value: 'blue', label: 'Blue Eyes' },
    { value: 'green', label: 'Green Eyes' },
    { value: 'violet', label: 'Violet Eyes' },
    { value: 'cybernetic', label: 'Cybernetic Eyes' },
  ],
  outfit: [
    { value: 'armor', label: 'Ceremonial Armor' },
    { value: 'streetwear', label: 'Future Streetwear' },
    { value: 'formal', label: 'Formal Attire' },
    { value: 'adventurer', label: 'Adventurer Gear' },
    { value: 'spacesuit', label: 'Spacesuit' },
  ],
  vibe: [
    { value: 'optimistic', label: 'Optimistic' },
    { value: 'brooding', label: 'Brooding' },
    { value: 'chaotic', label: 'Chaotic' },
    { value: 'stoic', label: 'Stoic' },
    { value: 'playful', label: 'Playful' },
  ],
};

export type CharacterField = keyof Character;

export const defaultCharacter: Character = {
  archetype: characterSchema.archetype[0].value,
  age: characterSchema.age[2].value,
  gender: characterSchema.gender[2].value,
  hair: characterSchema.hair[1].value,
  eyes: characterSchema.eyes[0].value,
  outfit: characterSchema.outfit[0].value,
  vibe: characterSchema.vibe[0].value,
  negativePrompt: 'low quality, blurry, duplicate, extra limbs, disfigured',
};

function isOptionValue(field: keyof CharacterSchema, value: string): boolean {
  return characterSchema[field].some((option) => option.value === value);
}

export function normalizeCharacter(input: Partial<Character> | Character): Character {
  const next: Character = { ...defaultCharacter };

  (Object.keys(characterSchema) as (keyof CharacterSchema)[]).forEach((field) => {
    const incoming = input[field];
    if (typeof incoming === 'string' && isOptionValue(field, incoming)) {
      next[field] = incoming;
    }
  });

  if (typeof input.negativePrompt === 'string') {
    next.negativePrompt = input.negativePrompt.trim();
  }

  return next;
}

export interface PromptResult {
  positive: string;
  negative: string;
  summary: string;
}

function lower(text: string) {
  return text.toLowerCase();
}

export function characterToPrompt(character: Character): PromptResult {
  const normalized = normalizeCharacter(character);
  const positiveParts = [
    `A ${lower(normalized.vibe)} ${lower(normalized.age)} ${lower(normalized.gender)} ${lower(normalized.archetype)}`,
    `with ${lower(normalized.hair)} and ${lower(normalized.eyes)}`,
    `wearing ${lower(normalized.outfit)}`,
    'highly detailed, dramatic lighting, 4k concept art, clean background',
  ];

  const positive = positiveParts.join(', ');
  const negative = normalized.negativePrompt || '';
  const summary = `${normalized.vibe} ${normalized.archetype}`;

  return { positive, negative, summary };
}
