/**
 * Share Intent Store
 * Global state for managing share intent data across the app
 */

import { create } from 'zustand';
import type { ShareIntent } from 'expo-share-intent';

export interface ParsedShareContent {
  title: string;
  notes: string;
  type: 'text' | 'url' | 'image' | 'file' | 'error';
  project?: string;
  originalContent: string;
  files?: ShareIntent['files'];
}

interface ShareIntentState {
  // Share intent data
  hasShareIntent: boolean;
  parsedContent: ParsedShareContent | null;
  rawShareIntent: ShareIntent | null;
  
  // Actions
  setShareIntent: (content: ParsedShareContent, raw: ShareIntent) => void;
  clearShareIntent: () => void;
  updateParsedContent: (updates: Partial<ParsedShareContent>) => void;
}

export const useShareIntentStore = create<ShareIntentState>((set, get) => ({
  hasShareIntent: false,
  parsedContent: null,
  rawShareIntent: null,

  setShareIntent: (content: ParsedShareContent, raw: ShareIntent) => {
    set({
      hasShareIntent: true,
      parsedContent: content,
      rawShareIntent: raw,
    });
  },

  clearShareIntent: () => {
    set({
      hasShareIntent: false,
      parsedContent: null,
      rawShareIntent: null,
    });
  },

  updateParsedContent: (updates: Partial<ParsedShareContent>) => {
    const current = get().parsedContent;
    if (current) {
      set({
        parsedContent: { ...current, ...updates },
      });
    }
  },
}));

// Selectors
export const useHasShareIntentState = () => 
  useShareIntentStore((state) => state.hasShareIntent);

export const useParsedShareContent = () => 
  useShareIntentStore((state) => state.parsedContent);
