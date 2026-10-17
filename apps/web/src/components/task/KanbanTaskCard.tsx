/**
 * Kanban Task Card Component
 * Task card optimized for kanban board display with viber features
 * Supports drag and drop for reordering and image uploads
 */

'use client';

import { useState, useCallback, DragEvent } from 'react';
import {
  Check,
  Play,
  RotateCcw,
  Battery,
  BatteryLow,
  BatteryMedium,
  Folder,
  Bot,
  Clock,
  MessageSquare,
  Archive,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TaskDetailModal } from './TaskDetailModal';
import type { Task } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { History } from 'lucide-react';
import { uploadAttachment, isImageFile } from '@/lib/services/attachment-service';

interface KanbanTaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: 'todo' | 'vibing' | 'done' | 'archived') => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onImageUpload?: () => void;
  isDragging?: boolean;
  isVibing?: boolean;
  isDone?: boolean;
  isArchived?: boolean;
  shortId?: number;
}

export function KanbanTaskCard({
  task,
  onStatusChange,
  onDragStart,
  onDragEnd,
  onImageUpload,
  isDragging,
  isVibing,
  isDone,
  isArchived,
  shortId,
}: KanbanTaskCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /**
   * Check if the drag event contains files (not task cards)
   */
  const hasFiles = useCallback((e: DragEvent<HTMLDivElement>): boolean => {
    // Check if dataTransfer contains files
    if (e.dataTransfer.types.includes('Files')) {
      return true;
    }
    return false;
  }, []);

  /**
   * Handle file drag over - only show indicator for file drags, not task drags
   */
  const handleFileDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return; // Ignore task card drags

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsFileDragging(true);
  }, [hasFiles]);

  /**
   * Handle file drag enter
   */
  const handleFileDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return; // Ignore task card drags

    e.preventDefault();
    e.stopPropagation();
    setIsFileDragging(true);
  }, [hasFiles]);

  /**
   * Handle file drag leave
   */
  const handleFileDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Only reset if actually leaving the card (not entering a child element)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsFileDragging(false);
    }
  }, []);

  /**
   * Handle file drop - upload images to the task
   */
  const handleFileDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    // Check if this is a file drop
    if (!hasFiles(e)) return; // Let task card drops be handled elsewhere

    e.preventDefault();
    e.stopPropagation();
    setIsFileDragging(false);
    setUploadError(null);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(isImageFile);

    if (imageFiles.length === 0) {
      setUploadError('Only images are allowed (JPEG, PNG, GIF, WebP)');
      // Clear error after 3 seconds
      setTimeout(() => setUploadError(null), 3000);
      return;
    }

    setIsUploading(true);

    try {
      for (const file of imageFiles) {
        const result = await uploadAttachment(task.id, file);
        if (!result.success) {
          setUploadError(result.error || 'Upload failed');
          setTimeout(() => setUploadError(null), 3000);
          break;
        }
      }
      onImageUpload?.();
    } catch (err) {
      setUploadError('Upload failed');
      setTimeout(() => setUploadError(null), 3000);
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  }, [task.id, onImageUpload, hasFiles]);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    // Add a slight delay before calling onDragStart for better visual feedback
    setTimeout(() => onDragStart?.(), 0);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  const priorityColors = {
    high: 'bg-red-500/10 text-red-500 border-red-500/30',
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    none: '',
  };

  const priorityLabels = {
    high: '! High',
    medium: '~ Medium',
    low: '_ Low',
    none: '',
  };

  const energyIcons = {
    high: <Battery className="h-3 w-3" />,
    medium: <BatteryMedium className="h-3 w-3" />,
    low: <BatteryLow className="h-3 w-3" />,
  };

  const energyColors = {
    high: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    medium: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    low: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  };

  return (
    <>
      <Card
        className={`relative p-4 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:-translate-y-0.5 ${
          isVibing ? 'border-purple-500/50 shadow-purple-500/10' : ''
        } ${isDone && !isArchived ? 'opacity-60' : ''} ${isArchived ? 'opacity-50 bg-muted/30' : ''} ${isDragging ? 'opacity-50 rotate-2 scale-105 shadow-xl' : ''} ${
          isFileDragging ? 'border-2 border-dashed border-purple-500 bg-purple-500/10 shadow-lg' : ''
        } ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
        onClick={() => setShowModal(true)}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleFileDragOver}
        onDragEnter={handleFileDragEnter}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
      >
        {/* File Drop Overlay */}
        {isFileDragging && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-purple-500/20 rounded-lg border-2 border-dashed border-purple-500">
            <ImageIcon className="h-8 w-8 text-purple-500 mb-2" />
            <span className="text-xs font-medium text-purple-500">Drop image here</span>
          </div>
        )}

        {/* Upload Progress Overlay */}
        {isUploading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 rounded-lg">
            <Loader2 className="h-6 w-6 text-purple-500 animate-spin mb-2" />
            <span className="text-xs text-muted-foreground">Uploading...</span>
          </div>
        )}

        {/* Upload Error Toast */}
        {uploadError && (
          <div className="absolute top-2 left-2 right-2 z-20 px-2 py-1 bg-red-500/90 text-white text-xs rounded">
            {uploadError}
          </div>
        )}

        {/* Top Right: Short ID + Archive button for done tasks */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {/* Quick Archive Button for Done Tasks */}
          {isDone && !isArchived && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task.id, 'archived');
              }}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Move to history"
            >
              <History className="h-3.5 w-3.5" />
            </button>
          )}
          {/* Short ID Badge */}
          {shortId && (
            <div className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono text-muted-foreground">
              #{shortId}
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className={`text-sm font-medium mb-3 pr-8 ${isDone || isArchived ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </h3>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {/* Priority */}
          {task.priority !== 'none' && (
            <Badge variant="outline" className={`text-[10px] ${priorityColors[task.priority]}`}>
              {priorityLabels[task.priority]}
            </Badge>
          )}

          {/* Project Tag */}
          {task.project_tag && (
            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">
              <Folder className="h-2.5 w-2.5 mr-1" />
              {task.project_tag}
            </Badge>
          )}

          {/* Energy Level */}
          {task.energy_required && (
            <Badge variant="outline" className={`text-[10px] ${energyColors[task.energy_required]}`}>
              {energyIcons[task.energy_required]}
              <span className="ml-1 capitalize">{task.energy_required}</span>
            </Badge>
          )}

          {/* AI Created */}
          {task.created_by === 'ai' && (
            <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/30">
              <Bot className="h-2.5 w-2.5 mr-1" />
              AI
            </Badge>
          )}

          {/* Due Date */}
          {task.due_date && !isDone && (
            <Badge variant="outline" className="text-[10px]">
              <Clock className="h-2.5 w-2.5 mr-1" />
              {format(new Date(task.due_date), 'MMM d')}
            </Badge>
          )}

          {/* Subtasks Count */}
          {task.subtasks && task.subtasks.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              <Check className="h-2.5 w-2.5 mr-1" />
              {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
            </Badge>
          )}

          {/* Completed Time (for done tasks) */}
          {isDone && !isArchived && task.completed_at && (
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
              <Check className="h-2.5 w-2.5 mr-1" />
              {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}
            </Badge>
          )}
        </div>

        {/* Context Notes */}
        {task.context_notes && !isDone && (
          <div className="mb-3 p-2 bg-blue-500/5 border-l-2 border-blue-500/50 rounded-r text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3 inline mr-1.5 text-blue-500" />
            {task.context_notes}
          </div>
        )}

        {/* Action Buttons */}
        {!isDone && (
          <div className="flex gap-2 pt-2 border-t border-border">
            {task.status === 'todo' && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, 'vibing');
                }}
              >
                <Play className="h-3 w-3 mr-1" />
                Start
              </Button>
            )}

            {task.status === 'vibing' && (
              <Button
                variant="default"
                size="sm"
                className="flex-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, 'done');
                }}
              >
                <Check className="h-3 w-3 mr-1" />
                Done
              </Button>
            )}
          </div>
        )}

        {/* Done State - Undo or Archive */}
        {isDone && !isArchived && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task.id, 'todo');
              }}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Undo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs h-8 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task.id, 'archived');
              }}
            >
              <Archive className="h-3 w-3 mr-1" />
              Archive
            </Button>
          </div>
        )}

        {/* Archived State - Restore */}
        {isArchived && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task.id, 'done');
              }}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Restore to Done
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task.id, 'todo');
              }}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Restore to Todo
            </Button>
          </div>
        )}
      </Card>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={task}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
