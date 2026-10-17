/**
 * TaskDetailModal Component
 * Simplified task editing modal for vibers
 * Keeps: title, status, notes, subtasks, context notes, project tag, energy
 * Removed: reminders, recurrence, duration, time tracking (bloat)
 */

'use client';

import { useState, useEffect } from 'react';
import { Task, InlineSubtask } from '@/lib/types';
import { useTaskMutations, useTags, useSubtaskMutations, useTasks } from '@/lib/hooks/useTasks';
import { useResolvedTheme } from '@/lib/stores/theme-store';
import { adjustColorForTheme } from '@/lib/utils/color';
import { isImageAttachment } from '@/lib/services/attachment-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { RichTextEditor } from './RichTextEditor';
import { ImageDropZone } from './ImageDropZone';
import { ImageGallery } from './ImageThumbnail';
import {
  X,
  Tag as TagIcon,
  FileText,
  CheckSquare,
  Plus,
  Check,
  Play,
  Zap,
  Folder,
  Bot,
  User,
  ImageIcon,
  AlertCircle,
  MessageSquare,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { QuickErrorCapture } from './QuickErrorCapture';
import { QuickFeedbackCapture } from './QuickFeedbackCapture';

// Inline types to avoid import issues
interface ErrorContext {
  raw_text: string;
  error_type?: string;
  message?: string;
  category?: string;
  file_path?: string;
  line_number?: number;
  column?: number;
  stack_trace?: string;
  suggestion?: string;
  captured_at: string;
  capture_source?: string;
}

interface FeedbackContext {
  raw_text: string;
  feedback_type?: string;
  sender?: string;
  source?: string;
  source_url?: string;
  received_at: string;
}

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailModal({ task, isOpen, onClose }: TaskDetailModalProps) {
  const { updateTask, deleteTask, toggleTaskCompletion } = useTaskMutations();
  const { data: tags } = useTags();
  const { createSubtask, updateInlineSubtasks } = useSubtaskMutations(task?.id || '');
  const { refetch } = useTasks('all');
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'subtasks' | 'images' | 'context'>('notes');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  // Error/Feedback capture modals
  const [showErrorCapture, setShowErrorCapture] = useState(false);
  const [showFeedbackCapture, setShowFeedbackCapture] = useState(false);
  // Viber fields
  const [status, setStatus] = useState<Task['status']>('todo');
  const [projectTag, setProjectTag] = useState<string>('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes || '');
      setSelectedTags(task.tags?.map(t => t.id) || []);
      // Viber fields
      setStatus(task.status || 'todo');
      setProjectTag(task.project_tag || '');
      // Default to subtasks tab if task has any subtasks (inline or legacy)
      const hasSubtasks = 
        (task.subtasks && task.subtasks.length > 0) || 
        (task.subtasks_json && task.subtasks_json.length > 0);
      if (hasSubtasks) {
        setActiveTab('subtasks');
      } else {
        setActiveTab('notes');
      }
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSave = async () => {
    try {
      // Only include tags if they were actually modified
      const originalTagIds = task.tags?.map(t => t.id).sort().join(',') || '';
      const currentTagIds = selectedTags.sort().join(',');
      const tagsChanged = originalTagIds !== currentTagIds;

      const updates: Partial<Task> = {
        title,
        notes,
        status,
        completed: status === 'done',
        project_tag: projectTag || undefined,
      };

      // Only update tags if changed (avoids unnecessary unlink/relink)
      if (tagsChanged && tags) {
        updates.tags = tags.filter(t => selectedTags.includes(t.id));
      }

      await updateTask.mutateAsync({
        id: task.id,
        updates,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync(task.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };
  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    try {
      await createSubtask.mutateAsync({
        title: newSubtaskTitle,
        position: task.subtasks?.length || 0,
      });
      setNewSubtaskTitle('');
    } catch (error) {
      console.error('Failed to create subtask:', error);
    }
  };

  /**
   * Toggle legacy subtask (separate task row)
   */
  const handleToggleLegacySubtask = async (subtaskId: string, completed: boolean) => {
    try {
      await toggleTaskCompletion.mutateAsync({ taskId: subtaskId, completed: !completed });
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
    }
  };

  /**
   * Toggle inline subtask (JSON array in 'subtasks' column)
   * Created by CLI: vibetasks add --subtasks "Step 1" "Step 2"
   */
  const handleToggleInlineSubtask = async (subtaskId: string) => {
    if (!task.subtasks_json) return;
    
    try {
      const updatedSubtasks = task.subtasks_json.map((s) =>
        s.id === subtaskId ? { ...s, done: !s.done } : s
      );
      await updateInlineSubtasks.mutateAsync(updatedSubtasks);
    } catch (error) {
      console.error('Failed to toggle inline subtask:', error);
    }
  };

  // Legacy subtasks (separate task rows with parent_task_id)
  const legacySubtasks = task.subtasks || [];
  // Inline subtasks (JSON array in 'subtasks' column, from CLI)
  const inlineSubtasks = task.subtasks_json || [];
  
  // Combined counts for display
  const totalSubtasks = legacySubtasks.length + inlineSubtasks.length;
  const completedCount = 
    legacySubtasks.filter((s) => s.completed).length + 
    inlineSubtasks.filter((s) => s.done).length;

  // Image attachments
  const imageAttachments = task.attachments?.filter(isImageAttachment) || [];
  const hasImages = imageAttachments.length > 0;

  // Error & Feedback context
  const errorContext = (task as any).error_context as ErrorContext | undefined;
  const feedbackContext = (task as any).feedback_context as FeedbackContext | undefined;
  const hasContext = errorContext || feedbackContext;

  const handleImageUpload = () => {
    refetch();
  };

  const handleRemoveErrorContext = async () => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        updates: { error_context: null } as any,
      });
    } catch (error) {
      console.error('Failed to remove error context:', error);
    }
  };

  const handleRemoveFeedbackContext = async () => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        updates: { feedback_context: null } as any,
      });
    } catch (error) {
      console.error('Failed to remove feedback context:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Edit Task</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="mt-2"
            />
          </div>

          {/* Status Selector */}
          <div>
            <label className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Status
            </label>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant={status === 'todo' ? 'default' : 'outline'}
                onClick={() => setStatus('todo')}
                size="sm"
                className={status === 'todo' ? '' : 'hover:bg-slate-500/10'}
              >
                <CheckSquare className="h-4 w-4 mr-1.5" />
                Todo
              </Button>
              <Button
                type="button"
                variant={status === 'vibing' ? 'default' : 'outline'}
                onClick={() => setStatus('vibing')}
                size="sm"
                className={status === 'vibing' ? 'bg-purple-600 hover:bg-purple-700' : 'text-purple-400 border-purple-500/30 hover:bg-purple-500/10'}
              >
                <Play className="h-4 w-4 mr-1.5" />
                Vibing
              </Button>
              <Button
                type="button"
                variant={status === 'done' ? 'default' : 'outline'}
                onClick={() => setStatus('done')}
                size="sm"
                className={status === 'done' ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'}
              >
                <Check className="h-4 w-4 mr-1.5" />
                Done
              </Button>
            </div>
          </div>

          {/* Project Selector (Bubbles) */}
          <div>
            <label className="text-sm font-medium flex items-center gap-2">
              <Folder className="h-4 w-4" />
              Project
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {['vibetasks', 'fyt', 'idolsing', 'projecthub'].map((project) => (
                <button
                  key={project}
                  type="button"
                  onClick={() => setProjectTag(projectTag === project ? '' : project)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    projectTag === project
                      ? 'bg-purple-500 text-white border-purple-500'
                      : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'
                  }`}
                >
                  {project}
                </button>
              ))}
              {/* Custom project input */}
              <Input
                value={!['vibetasks', 'fyt', 'idolsing', 'projecthub'].includes(projectTag) ? projectTag : ''}
                onChange={(e) => setProjectTag(e.target.value)}
                placeholder="Custom..."
                className="w-24 h-8 text-xs"
              />
            </div>
          </div>

          {/* Created By (read-only badge) */}
          {task.created_by && (
            <div className="flex items-center gap-2">
              {task.created_by === 'ai' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 rounded-lg text-sm text-violet-400">
                  <Bot className="h-4 w-4" />
                  AI Created
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-400">
                  <User className="h-4 w-4" />
                  Created by you
                </div>
              )}
            </div>
          )}

          {/* AI Context Notes (shown for AI tasks or when context exists) */}
          {(task.created_by === 'ai' || (task as any).context_notes) && (
            <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
              <label className="text-sm font-medium flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400">
                <Bot className="h-4 w-4" />
                AI Context
                <span className="text-xs font-normal text-muted-foreground">(read-only)</span>
              </label>
              {(task as any).context_notes ? (
                <p className="text-sm text-purple-700 dark:text-purple-300 whitespace-pre-wrap">
                  {(task as any).context_notes}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  AI will update this field as it works on this task...
                </p>
              )}
            </div>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <TagIcon className="h-4 w-4" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => {
                  const adjustedColor = adjustColorForTheme(tag.color, isDark);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setSelectedTags((prev) =>
                          prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-sm border ${
                        selectedTags.includes(tag.id)
                          ? 'text-white'
                          : 'border-border hover:border-primary'
                      }`}
                      style={selectedTags.includes(tag.id) ? { backgroundColor: adjustedColor, borderColor: adjustedColor } : {}}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes / Subtasks / Images Toggle */}
          <div>
            <div className="flex items-center gap-1 border-b">
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'notes'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="h-4 w-4" />
                Notes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('subtasks')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'subtasks'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <CheckSquare className="h-4 w-4" />
                Subtasks
                {totalSubtasks > 0 && (
                  <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                    {completedCount}/{totalSubtasks}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('images')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'images'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <ImageIcon className="h-4 w-4" />
                Images
                {hasImages && (
                  <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                    {imageAttachments.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('context')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'context'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <AlertCircle className="h-4 w-4" />
                Context
                {hasContext && (
                  <span className="ml-1 text-xs bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full">
                    {(errorContext ? 1 : 0) + (feedbackContext ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {activeTab === 'notes' && (
                <RichTextEditor content={notes} onChange={setNotes} placeholder="Add detailed notes..." />
              )}

              {activeTab === 'subtasks' && (
                <div className="space-y-3">
                  {/* Add Subtask */}
                  <div className="flex gap-2">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Add a subtask..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSubtask();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleAddSubtask}
                      size="sm"
                      disabled={!newSubtaskTitle.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Subtasks List */}
                  {totalSubtasks > 0 ? (
                    <div className="space-y-2">
                      {/* Inline Subtasks (from CLI - JSON array) */}
                      {inlineSubtasks.map((subtask, index) => (
                        <div
                          key={subtask.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleInlineSubtask(subtask.id)}
                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              subtask.done
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground hover:border-primary'
                            }`}
                          >
                            {subtask.done && <Check className="h-3 w-3 text-primary-foreground" />}
                          </button>
                          <span className="text-xs text-muted-foreground font-mono w-5">
                            {index + 1}.
                          </span>
                          <span
                            className={`flex-1 text-sm ${
                              subtask.done ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {subtask.title}
                          </span>
                        </div>
                      ))}
                      
                      {/* Legacy Subtasks (separate task rows) */}
                      {legacySubtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleLegacySubtask(subtask.id, subtask.completed)}
                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              subtask.completed
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground hover:border-primary'
                            }`}
                          >
                            {subtask.completed && <Check className="h-3 w-3 text-primary-foreground" />}
                          </button>
                          <span
                            className={`flex-1 text-sm ${
                              subtask.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {subtask.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No subtasks yet. Add one above to break down this task.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'images' && (
                <div className="space-y-4">
                  {/* Image Upload Zone */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Upload Images
                      </label>
                      {hasImages && (
                        <ImageDropZone taskId={task.id} onUploadComplete={handleImageUpload} compact />
                      )}
                    </div>
                    {!hasImages && (
                      <ImageDropZone taskId={task.id} onUploadComplete={handleImageUpload} />
                    )}
                  </div>

                  {/* Image Gallery */}
                  {hasImages && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                        Attached Images ({imageAttachments.length})
                      </label>
                      <ImageGallery
                        attachments={task.attachments || []}
                        onDelete={handleImageUpload}
                        size="lg"
                      />
                    </div>
                  )}

                  {!hasImages && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No images attached. Drag and drop images above or click to upload.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'context' && (
                <div className="space-y-4">
                  {/* Quick Attach Buttons */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowErrorCapture(true)}
                      className="flex-1 text-red-500 border-red-500/30 hover:bg-red-500/10"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      {errorContext ? 'Update Error' : 'Attach Error'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFeedbackCapture(true)}
                      className="flex-1 text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {feedbackContext ? 'Update Feedback' : 'Attach Feedback'}
                    </Button>
                  </div>

                  {/* Error Context */}
                  {errorContext && (
                    <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium flex items-center gap-2 text-red-500">
                          <AlertCircle className="h-4 w-4" />
                          Error Attached
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveErrorContext}
                          className="h-6 text-xs text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                      {errorContext.error_type && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-500 rounded">
                            {errorContext.error_type}
                          </span>
                          {errorContext.category && (
                            <span className="text-xs text-muted-foreground">
                              {errorContext.category}
                            </span>
                          )}
                        </div>
                      )}
                      {errorContext.message && (
                        <p className="text-sm text-foreground mb-2">{errorContext.message}</p>
                      )}
                      {errorContext.file_path && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {errorContext.file_path}
                          {errorContext.line_number && `:${errorContext.line_number}`}
                        </p>
                      )}
                      {errorContext.suggestion && (
                        <p className="text-xs text-blue-500 mt-2">{errorContext.suggestion}</p>
                      )}
                      {errorContext.stack_trace && (
                        <details className="mt-3">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Stack Trace
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                            {errorContext.stack_trace}
                          </pre>
                        </details>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Captured: {new Date(errorContext.captured_at).toLocaleString()}
                        {errorContext.capture_source && ` via ${errorContext.capture_source}`}
                      </p>
                    </div>
                  )}

                  {/* Feedback Context */}
                  {feedbackContext && (
                    <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium flex items-center gap-2 text-blue-500">
                          <MessageSquare className="h-4 w-4" />
                          Feedback Attached
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveFeedbackContext}
                          className="h-6 text-xs text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                      {feedbackContext.feedback_type && (
                        <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-500 rounded">
                          {feedbackContext.feedback_type.replace('_', ' ')}
                        </span>
                      )}
                      {feedbackContext.sender && (
                        <p className="text-xs text-muted-foreground mt-2">
                          From: {feedbackContext.sender}
                        </p>
                      )}
                      <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">
                        {feedbackContext.raw_text}
                      </p>
                      {feedbackContext.source_url && (
                        <a
                          href={feedbackContext.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-2"
                        >
                          View Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Received: {new Date(feedbackContext.received_at).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Empty State */}
                  {!errorContext && !feedbackContext && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No error or feedback attached to this task.</p>
                      <p className="text-xs mt-1">
                        Use the buttons above to attach context.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <Button type="button" variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
            Delete Task
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={updateTask.isPending}>
              {updateTask.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete this task?"
        description={task ? `Are you sure you want to delete "${task.title}"? This action cannot be undone.` : 'Are you sure you want to delete this task?'}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Quick Error Capture Modal */}
      <QuickErrorCapture
        open={showErrorCapture}
        onOpenChange={setShowErrorCapture}
        attachToTask={task}
      />

      {/* Quick Feedback Capture Modal */}
      <QuickFeedbackCapture
        open={showFeedbackCapture}
        onOpenChange={setShowFeedbackCapture}
        attachToTask={task}
      />
    </div>
  );
}
