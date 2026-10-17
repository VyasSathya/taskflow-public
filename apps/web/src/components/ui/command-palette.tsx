/**
 * Command Palette Component
 * Linear-inspired Cmd+K command palette for quick actions
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Zap,
  CheckCircle,
  Settings,
  FolderOpen,
  Archive,
  ListTodo,
  Command,
  ArrowRight,
} from 'lucide-react';

export interface CommandAction {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
  action: () => void;
  category?: 'navigation' | 'task' | 'status' | 'quick';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions?: CommandAction[];
  onCreateTask?: (title: string) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  actions = [],
  onCreateTask,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Default actions
  const defaultActions: CommandAction[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-all',
      title: 'All Tasks',
      description: 'View all tasks in kanban',
      icon: <ListTodo className="h-4 w-4" />,
      shortcut: 'G A',
      keywords: ['all', 'tasks', 'kanban', 'board'],
      action: () => {
        router.push('/dashboard');
        onClose();
      },
      category: 'navigation',
    },
    {
      id: 'nav-vibing',
      title: 'Focus (Vibing)',
      description: 'Tasks currently in progress',
      icon: <Zap className="h-4 w-4 text-purple-500" />,
      shortcut: 'G V',
      keywords: ['focus', 'vibing', 'in progress', 'wip'],
      action: () => {
        router.push('/dashboard?filter=vibing');
        onClose();
      },
      category: 'navigation',
    },
    {
      id: 'nav-archive',
      title: 'Archive',
      description: 'Completed tasks',
      icon: <Archive className="h-4 w-4" />,
      keywords: ['archive', 'done', 'completed'],
      action: () => {
        router.push('/dashboard?filter=done');
        onClose();
      },
      category: 'navigation',
    },
    {
      id: 'nav-settings',
      title: 'Settings',
      description: 'App settings and preferences',
      icon: <Settings className="h-4 w-4" />,
      shortcut: 'G S',
      keywords: ['settings', 'preferences', 'config'],
      action: () => {
        router.push('/settings');
        onClose();
      },
      category: 'navigation',
    },

    // Task actions
    {
      id: 'task-create',
      title: 'Create Task',
      description: 'Add a new task',
      icon: <Plus className="h-4 w-4" />,
      shortcut: 'C',
      keywords: ['new', 'add', 'create', 'task'],
      action: () => {
        // This will be handled specially for quick create
        onClose();
      },
      category: 'task',
    },
  ], [router, onClose]);

  const allActions = useMemo(() => [...defaultActions, ...actions], [defaultActions, actions]);

  // Fuzzy search filter
  const filteredActions = useMemo(() => {
    if (!query) return allActions;

    const lowerQuery = query.toLowerCase();
    return allActions.filter((action) => {
      const searchText = [
        action.title,
        action.description,
        ...(action.keywords || []),
      ].join(' ').toLowerCase();

      return searchText.includes(lowerQuery);
    }).sort((a, b) => {
      // Prioritize title matches
      const aTitle = a.title.toLowerCase().includes(lowerQuery);
      const bTitle = b.title.toLowerCase().includes(lowerQuery);
      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;
      return 0;
    });
  }, [allActions, query]);

  // Check if query looks like a new task
  const isQuickCreate = query.length > 0 && !filteredActions.length;

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredActions]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const maxIndex = isQuickCreate ? 0 : filteredActions.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, maxIndex));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (isQuickCreate && onCreateTask) {
          onCreateTask(query);
          onClose();
        } else if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredActions, selectedIndex, isQuickCreate, query, onCreateTask, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Close on outside click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  // Group actions by category
  const groupedActions = filteredActions.reduce((acc, action) => {
    const category = action.category || 'quick';
    if (!acc[category]) acc[category] = [];
    acc[category].push(action);
    return acc;
  }, {} as Record<string, CommandAction[]>);

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    task: 'Tasks',
    status: 'Status',
    quick: 'Quick Actions',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
          {/* Quick Create */}
          {isQuickCreate && onCreateTask && (
            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                selectedIndex === 0 ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
              onClick={() => {
                onCreateTask(query);
                onClose();
              }}
            >
              <Plus className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Create "{query}"</p>
                <p className="text-xs text-muted-foreground">Add as new task</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {/* Grouped Actions */}
          {!isQuickCreate && Object.entries(groupedActions).map(([category, categoryActions]) => (
            <div key={category} className="mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1">
                {categoryLabels[category] || category}
              </p>
              {categoryActions.map((action, index) => {
                const globalIndex = filteredActions.indexOf(action);
                return (
                  <button
                    key={action.id}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedIndex === globalIndex ? 'bg-accent' : 'hover:bg-accent/50'
                    }`}
                    onClick={action.action}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                  >
                    {action.icon || <ArrowRight className="h-4 w-4" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{action.title}</p>
                      {action.description && (
                        <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                      )}
                    </div>
                    {action.shortcut && (
                      <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {action.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* No results */}
          {!isQuickCreate && filteredActions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No commands found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/50 text-xs text-muted-foreground">
          <span>
            <kbd className="font-mono">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> select
          </span>
          <span>
            <kbd className="font-mono">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
