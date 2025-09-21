import { create } from 'zustand';
import type { Character } from '../domain/character';
import { defaultCharacter, normalizeCharacter } from '../domain/character';
import type { GeneratedImage } from '../services/ai';

export interface AppState {
  character: Character;
  generatedImages: GeneratedImage[];
  selectedImageIds: string[];
  loopGif: boolean;
  setCharacter: (updates: Partial<Character>) => void;
  setGeneratedImages: (images: GeneratedImage[]) => void;
  addGeneratedImages: (images: GeneratedImage[]) => void;
  toggleSelectedImage: (id: string) => void;
  clearSelectedImages: () => void;
  setLoopGif: (loop: boolean) => void;
  removeImage: (id: string) => void;
  resetAll: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  character: defaultCharacter,
  generatedImages: [],
  selectedImageIds: [],
  loopGif: true,
  setCharacter: (updates) => {
    const merged: Character = { ...get().character, ...updates } as Character;
    set({ character: normalizeCharacter(merged) });
  },
  setGeneratedImages: (images) => {
    set({ generatedImages: images, selectedImageIds: [] });
  },
  addGeneratedImages: (images) => {
    set((state) => ({ generatedImages: [...state.generatedImages, ...images] }));
  },
  toggleSelectedImage: (id) => {
    set((state) => {
      const isSelected = state.selectedImageIds.includes(id);
      const selected = isSelected
        ? state.selectedImageIds.filter((existing) => existing !== id)
        : [...state.selectedImageIds, id];
      return { selectedImageIds: selected };
    });
  },
  clearSelectedImages: () => set({ selectedImageIds: [] }),
  setLoopGif: (loop) => set({ loopGif: loop }),
  removeImage: (id) => {
    set((state) => ({
      generatedImages: state.generatedImages.filter((image) => image.id !== id),
      selectedImageIds: state.selectedImageIds.filter((selectedId) => selectedId !== id),
    }));
  },
  resetAll: () => {
    set({
      character: defaultCharacter,
      generatedImages: [],
      selectedImageIds: [],
      loopGif: true,
    });
  },
}));

