/**
 * Kanban Column Component
 * A single column in the kanban board with drag and drop support
 */

'use client';

import { DragEvent } from 'react';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  title: string;
  subtitle: string;
  count: number;
  color: 'gray' | 'purple' | 'green' | 'slate';
  columnId: 'todo' | 'vibing' | 'done' | 'archived';
  isWarning?: boolean;
  isDragOver?: boolean;
  onAddClick?: () => void;
  onDragOver?: () => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
  children: React.ReactNode;
}

const colorClasses = {
  gray: {
    dot: 'bg-gray-500',
    border: 'border-gray-500/20',
    dragOver: 'ring-2 ring-gray-500/50 bg-gray-500/5',
  },
  purple: {
    dot: 'bg-purple-500',
    border: 'border-purple-500/20',
    dragOver: 'ring-2 ring-purple-500/50 bg-purple-500/5',
  },
  green: {
    dot: 'bg-emerald-500',
    border: 'border-emerald-500/20',
    dragOver: 'ring-2 ring-emerald-500/50 bg-emerald-500/5',
  },
  slate: {
    dot: 'bg-slate-400',
    border: 'border-slate-400/20',
    dragOver: 'ring-2 ring-slate-400/50 bg-slate-400/5',
  },
};

export function KanbanColumn({
  title,
  subtitle,
  count,
  color,
  columnId,
  isWarning,
  isDragOver,
  onAddClick,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}: KanbanColumnProps) {
  const colors = colorClasses[color];

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver?.();
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Only trigger if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      onDragLeave?.();
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDrop?.();
  };

  return (
    <div
      className={`flex-1 min-w-[320px] max-w-[420px] bg-card rounded-xl border border-border flex flex-col transition-all duration-200 ${
        isDragOver ? colors.dragOver : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-column={columnId}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
          <span className="text-sm font-semibold uppercase tracking-wide">
            {title}
          </span>
          <span className={`ml-auto text-sm ${isWarning ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>
            {count}{isWarning && ' !'}
          </span>
          {onAddClick && (
            <button
              onClick={onAddClick}
              className="p-1 rounded hover:bg-accent transition-colors"
              title="Add task"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      {/* Cards */}
      <div className={`flex-1 p-3 space-y-3 overflow-y-auto min-h-[100px] ${isDragOver ? 'opacity-70' : ''}`}>
        {children}
      </div>
    </div>
  );
}
