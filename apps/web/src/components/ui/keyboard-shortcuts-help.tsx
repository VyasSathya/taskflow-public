/**
 * Keyboard Shortcuts Help Modal
 * Shows all available keyboard shortcuts in a nice overlay
 */

'use client';

import { X } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['J', '↓'], description: 'Move down' },
      { keys: ['K', '↑'], description: 'Move up' },
      { keys: ['Enter'], description: 'Open selected task' },
      { keys: ['Escape'], description: 'Close panel / Deselect' },
    ],
  },
  {
    title: 'Task Actions',
    shortcuts: [
      { keys: ['C'], description: 'Create new task' },
      { keys: ['V'], description: 'Start vibing on task' },
      { keys: ['D'], description: 'Mark task as done' },
      { keys: ['E'], description: 'Edit task' },
      { keys: ['⌫'], description: 'Delete task' },
    ],
  },
  {
    title: 'Status Changes',
    shortcuts: [
      { keys: ['S', 'T'], description: 'Set status to Todo' },
      { keys: ['S', 'V'], description: 'Set status to Vibing' },
      { keys: ['S', 'D'], description: 'Set status to Done' },
    ],
  },
  {
    title: 'Search & Command',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['/'], description: 'Quick search' },
    ],
  },
  {
    title: 'Go To (G + key)',
    shortcuts: [
      { keys: ['G', 'A'], description: 'Go to All Tasks' },
      { keys: ['G', 'V'], description: 'Go to Focus (Vibing)' },
      { keys: ['G', 'S'], description: 'Go to Settings' },
    ],
  },
  {
    title: 'Other',
    shortcuts: [
      { keys: ['?'], description: 'Show this help' },
    ],
  },
];

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded border border-border bg-muted font-mono text-xs text-foreground shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shortcutGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center gap-1">
                            <Key>{key}</Key>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-xs text-muted-foreground">then</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            Press <Key>?</Key> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}
