/**
 * TaskCard Component
 * Displays a single task with inline expansion
 */

'use client';

import { useState } from 'react';
import { Check, Trash2, Calendar, Flag, Paperclip, ChevronDown, ChevronRight, Archive, RotateCcw, ImageIcon, Bot, User, Play, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { RichTextEditor } from './RichTextEditor';
import { ImageDropZone } from './ImageDropZone';
import { ImageGallery } from './ImageThumbnail';
import { SentryBadge } from './SentryBadge';
import { useTaskMutations, useTasks } from '@/lib/hooks/useTasks';
import { isImageAttachment } from '@/lib/services/attachment-service';
import { useTaskStore } from '@/lib/stores/task-store';
import { useResolvedTheme } from '@/lib/stores/theme-store';
import { adjustColorForTheme, getTagBackgroundOpacity } from '@/lib/utils/color';
import { CARD_STYLES, COLORS } from '@/lib/styles/constants';
import type { Task } from '@/lib/types';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  shortId?: number; // 1-99 for easy reference
}

export function TaskCard({ task, shortId }: TaskCardProps) {
  const { updateTask, deleteTask, toggleTaskCompletion, archiveTask, unarchiveTask } = useTaskMutations();
  const expandedTaskIds = useTaskStore((state) => state.expandedTaskIds);
  const toggleTaskExpanded = useTaskStore((state) => state.toggleTaskExpanded);
  const isExpanded = expandedTaskIds.has(task.id);
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

  const [localNotes, setLocalNotes] = useState(task.notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggleComplete = () => {
    toggleTaskCompletion.mutate({
      taskId: task.id,
      completed: !task.completed,
    });
  };

  const handleDelete = () => {
    deleteTask.mutate(task.id);
  };

  const handleArchive = () => {
    archiveTask.mutate(task.id);
  };

  const handleUnarchive = () => {
    unarchiveTask.mutate(task.id);
  };

  const handleSaveNotes = () => {
    if (localNotes !== task.notes) {
      updateTask.mutate({
        id: task.id,
        updates: { notes: localNotes },
      });
    }
    setIsEditingNotes(false);
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900/50',
    low: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50',
    none: '',
  };

  const priorityLabels = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    none: '',
  };

  const { refetch } = useTasks('all');
  // Legacy subtasks (task rows with parent_task_id)
  const legacySubtasks = task.subtasks || [];
  // Inline subtasks (JSON array in 'subtasks' column from CLI)
  const inlineSubtasks = task.subtasks_json || [];
  const totalSubtasks = legacySubtasks.length + inlineSubtasks.length;
  const completedSubtasks = 
    legacySubtasks.filter((st) => st.completed).length + 
    inlineSubtasks.filter((st) => st.done).length;
  const hasSubtasks = totalSubtasks > 0;
  const hasAttachments = task.attachments && task.attachments.length > 0;
  const imageAttachments = task.attachments?.filter(isImageAttachment) || [];
  const hasImages = imageAttachments.length > 0;
  const hasNotes = !!task.notes;
  const hasAiContext = !!(task as any).context_notes;
  const hasDueDate = !!task.due_date;
  const isArchived = task.status === 'archived';
  const isCompleted = task.completed || task.status === 'done';
  const isVibing = task.status === 'vibing';
  const hasSentryInfo = !!(task as any).sentry_issue_id;

  const handleImageUpload = () => {
    refetch();
  };

  return (
    <Card className={`p-4 ${CARD_STYLES.interactive} ${isArchived ? CARD_STYLES.muted : ''} ${isVibing ? CARD_STYLES.accent.purple : ''} relative`}>
      {/* Short ID Badge - Top Right */}
      {shortId && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-muted rounded text-xs font-mono text-muted-foreground">
          #{shortId}
        </div>
      )}

      {/* Collapsed View */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={task.completed}
          onCheckedChange={handleToggleComplete}
          className="mt-1"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title + Indicators */}
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => toggleTaskExpanded(task.id)}
              className="flex items-center gap-2 flex-1 text-left group"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span
                className={`text-sm font-medium ${
                  isCompleted || isArchived ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {task.title}
              </span>
            </button>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {/* Vibing Status Indicator */}
            {isVibing && (
              <span className={`flex items-center gap-1 ${COLORS.status.vibing.text} font-medium`}>
                <Play className="h-3 w-3 fill-current" /> Vibing
              </span>
            )}
            {/* Indicators */}
            {hasNotes && <span className="flex items-center gap-1"><User className="h-3 w-3" /> Notes</span>}
            {hasAiContext && <span className={`flex items-center gap-1 ${COLORS.status.vibing.text}`}><Bot className="h-3 w-3" /> AI</span>}
            {hasSentryInfo && (
              <SentryBadge
                sentryIssueId={(task as any).sentry_issue_id}
                sentryLevel={(task as any).sentry_level}
                sentryErrorCount={(task as any).sentry_error_count}
                sentryUrl={(task as any).sentry_url}
                compact
              />
            )}
            {hasImages && (
              <span className={`flex items-center gap-1 ${COLORS.status.vibing.text}`}>
                <ImageIcon className="h-3 w-3" /> {imageAttachments.length}
              </span>
            )}
            {hasAttachments && !hasImages && (
              <span className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> {task.attachments?.length}
              </span>
            )}
            {hasSubtasks && (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3" />{' '}
                {completedSubtasks}/{totalSubtasks}
              </span>
            )}

            {/* Due Date */}
            {hasDueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date!), 'MMM d')}
              </span>
            )}

            {/* Priority */}
            {task.priority !== 'none' && (
              <Badge variant="outline" className={priorityColors[task.priority]}>
                {priorityLabels[task.priority]}
              </Badge>
            )}

            {/* Tags */}
            {task.tags?.map((tag) => {
              const adjustedColor = adjustColorForTheme(tag.color, isDark);
              const bgOpacity = getTagBackgroundOpacity(isDark);
              return (
                <Badge
                  key={tag.id}
                  variant="outline"
                  style={{
                    borderColor: adjustedColor,
                    color: adjustedColor,
                    backgroundColor: `${adjustedColor}${Math.round(bgOpacity * 255).toString(16).padStart(2, '0')}`
                  }}
                >
                  {tag.name}
                </Badge>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          {/* Two-column layout for notes */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Your Notes (User editable) */}
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <label className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Your Notes
              </label>
              {isEditingNotes ? (
                <div className="space-y-2">
                  <RichTextEditor
                    content={localNotes}
                    onChange={setLocalNotes}
                    placeholder="Add your instructions, requirements..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setLocalNotes(task.notes || '');
                        setIsEditingNotes(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm cursor-pointer p-2 rounded hover:bg-blue-500/10 prose prose-sm max-w-none dark:prose-invert min-h-[60px]"
                  onClick={() => setIsEditingNotes(true)}
                  dangerouslySetInnerHTML={{ __html: task.notes || '<p class="text-muted-foreground italic">Click to add your instructions...</p>' }}
                />
              )}
            </div>

            {/* AI Context (Read-only) */}
            <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
              <label className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5" />
                AI Context
                <span className="text-[10px] font-normal text-muted-foreground ml-1">(read-only)</span>
              </label>
              <div className="text-sm p-2 min-h-[60px]">
                {(task as any).context_notes ? (
                  <p className="text-purple-700 dark:text-purple-300 whitespace-pre-wrap">
                    {(task as any).context_notes}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">
                    AI will update this as it works...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sentry Info (when task is from Sentry) */}
          {hasSentryInfo && (
            <div className="p-3 rounded-lg bg-[#362D59]/10 border border-[#362D59]/30">
              <SentryBadge
                sentryIssueId={(task as any).sentry_issue_id}
                sentryLevel={(task as any).sentry_level}
                sentryErrorCount={(task as any).sentry_error_count}
                sentryUrl={(task as any).sentry_url}
                sentryProject={(task as any).sentry_project}
              />
              {(task as any).sentry_first_seen && (
                <p className="text-xs text-muted-foreground mt-2">
                  First seen: {new Date((task as any).sentry_first_seen).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Subtasks (both inline from CLI and legacy task rows) */}
          {hasSubtasks && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Subtasks ({completedSubtasks}/{totalSubtasks})
              </label>
              <div className="space-y-1">
                {/* Inline subtasks (from CLI - JSON array) */}
                {inlineSubtasks.map((subtask, index) => (
                  <div key={subtask.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={subtask.done} className="h-4 w-4" disabled />
                    <span className="text-xs text-muted-foreground font-mono w-4">{index + 1}.</span>
                    <span className={subtask.done ? 'line-through text-muted-foreground' : ''}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
                {/* Legacy subtasks (task rows with parent_task_id) */}
                {legacySubtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={subtask.completed} className="h-4 w-4" />
                    <span className={subtask.completed ? 'line-through text-muted-foreground' : ''}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Images {hasImages && `(${imageAttachments.length})`}
              </label>
              <ImageDropZone taskId={task.id} onUploadComplete={handleImageUpload} compact />
            </div>
            {hasImages ? (
              <ImageGallery attachments={task.attachments || []} onDelete={handleImageUpload} size="md" />
            ) : (
              <ImageDropZone taskId={task.id} onUploadComplete={handleImageUpload} />
            )}
          </div>

          {/* Other Attachments (non-images) */}
          {(task.attachments?.filter(a => !isImageAttachment(a)).length ?? 0) > 0 && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Files ({task.attachments?.filter(a => !isImageAttachment(a)).length})
              </label>
              <div className="space-y-1">
                {task.attachments?.filter(a => !isImageAttachment(a)).map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                    <span>{attachment.file_name}</span>
                    <span className="text-xs">
                      ({Math.round(attachment.file_size / 1024)}KB)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Archive Actions */}
          {(isCompleted || isArchived) && (
            <div className="flex gap-2 pt-2 border-t border-border">
              {isArchived ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={handleUnarchive}
                >
                  <RotateCcw className="h-3 w-3 mr-1.5" />
                  Restore to Done
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleArchive}
                >
                  <Archive className="h-3 w-3 mr-1.5" />
                  Archive
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Archive Actions (when collapsed) */}
      {!isExpanded && (isCompleted || isArchived) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          {isArchived ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleUnarchive}
            >
              <RotateCcw className="h-3 w-3 mr-1.5" />
              Restore
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={handleArchive}
            >
              <Archive className="h-3 w-3 mr-1.5" />
              Archive
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete task?"
        description={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </Card>
  );
}
