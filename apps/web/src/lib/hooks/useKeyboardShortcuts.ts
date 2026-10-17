/**
 * Linear-inspired Keyboard Shortcuts System
 *
 * Design principles (from Linear):
 * - Single-key shortcuts for common actions (when not in text input)
 * - Vim-inspired navigation (J/K for up/down)
 * - Sequence shortcuts for navigation (G then I, G then P)
 * - Command palette (Cmd+K) as fallback
 * - Context-aware shortcuts
 */

import { useEffect, useCallback, useRef } from 'react';

export interface ShortcutConfig {
  key: string;
  modifiers?: ('ctrl' | 'meta' | 'shift' | 'alt')[];
  action: () => void;
  description: string;
  context?: 'global' | 'list' | 'detail' | 'editor';
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: ShortcutConfig[];
  enabled?: boolean;
}

// Check if user is typing in an input
function isTyping(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tagName = activeElement.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea') return true;
  if ((activeElement as HTMLElement).contentEditable === 'true') return true;
  if (activeElement.getAttribute('role') === 'textbox') return true;

  return false;
}

// Check if modifiers match
function modifiersMatch(
  event: KeyboardEvent,
  modifiers?: ('ctrl' | 'meta' | 'shift' | 'alt')[]
): boolean {
  const required = modifiers || [];

  const ctrlRequired = required.includes('ctrl');
  const metaRequired = required.includes('meta');
  const shiftRequired = required.includes('shift');
  const altRequired = required.includes('alt');

  // On Mac, Cmd is metaKey. On Windows/Linux, Ctrl is ctrlKey
  const cmdOrCtrl = event.metaKey || event.ctrlKey;

  if (ctrlRequired && !event.ctrlKey) return false;
  if (metaRequired && !event.metaKey) return false;
  if (shiftRequired && !event.shiftKey) return false;
  if (altRequired && !event.altKey) return false;

  // If no modifiers required, make sure none are pressed (except for Cmd+K type shortcuts)
  if (required.length === 0) {
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    // Allow shift for capitalized single keys
  }

  return true;
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const sequenceRef = useRef<string>('');
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing
      if (isTyping()) {
        // Exception: Escape always works
        if (event.key !== 'Escape') return;
      }

      // Build the key string
      const key = event.key.toLowerCase();

      // Check for sequence shortcuts (like G then I)
      if (sequenceRef.current) {
        const sequenceKey = `${sequenceRef.current} ${key}`;
        const sequenceShortcut = shortcuts.find(
          (s) => s.key.toLowerCase() === sequenceKey && (s.enabled ?? true)
        );

        if (sequenceShortcut) {
          event.preventDefault();
          sequenceShortcut.action();
          sequenceRef.current = '';
          if (sequenceTimeoutRef.current) {
            clearTimeout(sequenceTimeoutRef.current);
          }
          return;
        }

        // Clear sequence if no match
        sequenceRef.current = '';
      }

      // Check for single-key shortcuts
      for (const shortcut of shortcuts) {
        if (!(shortcut.enabled ?? true)) continue;

        const shortcutKey = shortcut.key.toLowerCase();

        // Check if this is a sequence starter (like 'g')
        if (shortcuts.some((s) => s.key.toLowerCase().startsWith(shortcutKey + ' '))) {
          if (key === shortcutKey && modifiersMatch(event, shortcut.modifiers)) {
            sequenceRef.current = key;
            // Clear after 1 second
            if (sequenceTimeoutRef.current) {
              clearTimeout(sequenceTimeoutRef.current);
            }
            sequenceTimeoutRef.current = setTimeout(() => {
              sequenceRef.current = '';
            }, 1000);
            return;
          }
        }

        // Check for exact match
        if (shortcutKey === key && modifiersMatch(event, shortcut.modifiers)) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, [handleKeyDown]);
}

// =============================================================================
// SHORTCUT PRESETS
// =============================================================================

export interface ShortcutPresets {
  // Navigation
  moveUp: () => void;
  moveDown: () => void;
  openSelected: () => void;
  closePanel: () => void;

  // Task Actions
  createTask: () => void;
  startVibing: () => void;
  completeTask: () => void;
  deleteTask: () => void;

  // Status Changes
  setTodo: () => void;
  setVibing: () => void;
  setDone: () => void;

  // Command Palette
  openCommandPalette: () => void;
  openSearch: () => void;

  // Go-to Navigation
  goToAll: () => void;
  goToVibing: () => void;
  goToSettings: () => void;

  // View
  showHelp: () => void;
}

export function createDefaultShortcuts(handlers: Partial<ShortcutPresets>): ShortcutConfig[] {
  const shortcuts: ShortcutConfig[] = [];

  // Navigation (Vim-style)
  if (handlers.moveDown) {
    shortcuts.push({
      key: 'j',
      action: handlers.moveDown,
      description: 'Move down',
      context: 'list',
    });
    shortcuts.push({
      key: 'ArrowDown',
      action: handlers.moveDown,
      description: 'Move down',
      context: 'list',
    });
  }

  if (handlers.moveUp) {
    shortcuts.push({
      key: 'k',
      action: handlers.moveUp,
      description: 'Move up',
      context: 'list',
    });
    shortcuts.push({
      key: 'ArrowUp',
      action: handlers.moveUp,
      description: 'Move up',
      context: 'list',
    });
  }

  if (handlers.openSelected) {
    shortcuts.push({
      key: 'Enter',
      action: handlers.openSelected,
      description: 'Open selected task',
      context: 'list',
    });
  }

  if (handlers.closePanel) {
    shortcuts.push({
      key: 'Escape',
      action: handlers.closePanel,
      description: 'Close panel / Deselect',
      context: 'global',
    });
  }

  // Task Actions
  if (handlers.createTask) {
    shortcuts.push({
      key: 'c',
      action: handlers.createTask,
      description: 'Create new task',
      context: 'global',
    });
  }

  if (handlers.startVibing) {
    shortcuts.push({
      key: 'v',
      action: handlers.startVibing,
      description: 'Start vibing on task',
      context: 'list',
    });
  }

  if (handlers.completeTask) {
    shortcuts.push({
      key: 'd',
      action: handlers.completeTask,
      description: 'Mark task as done',
      context: 'list',
    });
  }

  if (handlers.deleteTask) {
    shortcuts.push({
      key: 'Backspace',
      action: handlers.deleteTask,
      description: 'Delete task',
      context: 'list',
    });
  }

  // Status Changes (S + letter sequence)
  if (handlers.setTodo) {
    shortcuts.push({
      key: 's t',
      action: handlers.setTodo,
      description: 'Set status to Todo',
      context: 'list',
    });
  }

  if (handlers.setVibing) {
    shortcuts.push({
      key: 's v',
      action: handlers.setVibing,
      description: 'Set status to Vibing',
      context: 'list',
    });
  }

  if (handlers.setDone) {
    shortcuts.push({
      key: 's d',
      action: handlers.setDone,
      description: 'Set status to Done',
      context: 'list',
    });
  }

  // Command Palette
  if (handlers.openCommandPalette) {
    shortcuts.push({
      key: 'k',
      modifiers: ['meta'],
      action: handlers.openCommandPalette,
      description: 'Open command palette',
      context: 'global',
    });
  }

  if (handlers.openSearch) {
    shortcuts.push({
      key: '/',
      action: handlers.openSearch,
      description: 'Quick search',
      context: 'global',
    });
  }

  // Go-to Navigation (G + letter sequence)
  if (handlers.goToAll) {
    shortcuts.push({
      key: 'g a',
      action: handlers.goToAll,
      description: 'Go to All Tasks',
      context: 'global',
    });
  }

  if (handlers.goToVibing) {
    shortcuts.push({
      key: 'g v',
      action: handlers.goToVibing,
      description: 'Go to Vibing (Focus)',
      context: 'global',
    });
  }

  if (handlers.goToSettings) {
    shortcuts.push({
      key: 'g s',
      action: handlers.goToSettings,
      description: 'Go to Settings',
      context: 'global',
    });
  }

  // Help
  if (handlers.showHelp) {
    shortcuts.push({
      key: '?',
      modifiers: ['shift'],
      action: handlers.showHelp,
      description: 'Show keyboard shortcuts',
      context: 'global',
    });
  }

  return shortcuts;
}
