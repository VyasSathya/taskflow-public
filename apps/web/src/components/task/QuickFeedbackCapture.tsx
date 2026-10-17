/**
 * QuickFeedbackCapture - Ultra Low-Friction Feedback Capture Modal
 * 
 * Design Goals:
 * - 2 clicks max: Open modal + Create task
 * - Auto-classify feedback type
 * - Attach to existing task OR create new task
 * - No page navigation required
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MessageSquare, Clipboard, Plus, Link2, Loader2, Bug, Lightbulb, HelpCircle, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task } from '@vibetasks/shared';
import * as taskService from '@/lib/services/task-service';

// Feedback types (inlined to avoid circular deps)
type FeedbackType = 'bug_report' | 'feature_request' | 'question' | 'praise' | 'complaint' | 'other';

interface FeedbackContext {
  raw_text: string;
  feedback_type?: FeedbackType;
  sender?: string;
  source?: 'github' | 'email' | 'slack' | 'manual' | 'intercom' | 'discord';
  source_url?: string;
  source_id?: string;
  received_at: string;
  summary?: string;
}

interface QuickFeedbackCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: Attach to existing task instead of creating new */
  attachToTask?: Task;
  /** Pre-selected feedback type */
  defaultType?: FeedbackType;
}

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'bug_report', label: 'Bug', icon: <Bug className="h-4 w-4" />, color: 'text-red-500' },
  { value: 'feature_request', label: 'Feature', icon: <Lightbulb className="h-4 w-4" />, color: 'text-amber-500' },
  { value: 'question', label: 'Question', icon: <HelpCircle className="h-4 w-4" />, color: 'text-blue-500' },
  { value: 'praise', label: 'Praise', icon: <ThumbsUp className="h-4 w-4" />, color: 'text-green-500' },
];

export function QuickFeedbackCapture({ 
  open, 
  onOpenChange, 
  attachToTask,
  defaultType = 'bug_report' 
}: QuickFeedbackCaptureProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(defaultType);
  const [sender, setSender] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Auto-classify feedback type based on content
  useEffect(() => {
    if (feedbackText.length > 20) {
      const detected = classifyFeedback(feedbackText);
      if (detected) {
        setFeedbackType(detected);
      }
    }
  }, [feedbackText]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  // Handle paste from clipboard button
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setFeedbackText(text);
        toast.success('Pasted from clipboard');
      }
    } catch {
      toast.error('Failed to read clipboard. Try Ctrl+V instead.');
    }
  }, []);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (feedbackContext: FeedbackContext) => {
      const title = generateFeedbackTitle(feedbackContext);
      const priority = feedbackType === 'bug_report' ? 'high' : 'medium';
      
      // Create task with feedback details in notes
      // feedback_context field is optional - works with or without DB migration
      const taskData: any = {
        title,
        notes: formatFeedbackNotes(feedbackContext),
        notes_format: 'markdown',
        priority,
        status: 'todo',
        created_by: 'human',
      };
      
      try {
        return await taskService.createTask({
          ...taskData,
          source_type: 'manual',
          feedback_context: feedbackContext,
        } as any);
      } catch (e) {
        // Fallback: create without feedback_context if column doesn't exist
        console.warn('Creating task without feedback_context (DB migration may be pending)');
        return await taskService.createTask(taskData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Feedback task created');
      handleClose();
    },
    onError: (error) => {
      console.error('Failed to create feedback task:', error);
      toast.error('Failed to create task');
    },
  });

  // Attach to existing task mutation
  const attachToTaskMutation = useMutation({
    mutationFn: async (feedbackContext: FeedbackContext) => {
      if (!attachToTask) throw new Error('No task to attach to');
      
      try {
        return await taskService.updateTask(attachToTask.id, {
          feedback_context: feedbackContext,
        } as any);
      } catch (e) {
        // Fallback: append feedback to notes if column doesn't exist
        console.warn('Updating task without feedback_context (DB migration may be pending)');
        const existingNotes = attachToTask.notes || '';
        const feedbackNotes = formatFeedbackNotes(feedbackContext);
        return await taskService.updateTask(attachToTask.id, {
          notes: existingNotes ? `${existingNotes}\n\n---\n\n${feedbackNotes}` : feedbackNotes,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Feedback attached to task');
      handleClose();
    },
    onError: (error) => {
      console.error('Failed to attach feedback:', error);
      toast.error('Failed to attach feedback');
    },
  });

  const handleClose = () => {
    setFeedbackText('');
    setFeedbackType(defaultType);
    setSender('');
    setSourceUrl('');
    onOpenChange(false);
  };

  const handleSubmit = () => {
    const feedbackContext: FeedbackContext = {
      raw_text: feedbackText,
      feedback_type: feedbackType,
      sender: sender || undefined,
      source: 'manual',
      source_url: sourceUrl || undefined,
      received_at: new Date().toISOString(),
      summary: feedbackText.split('\n')[0].substring(0, 100),
    };

    if (attachToTask) {
      attachToTaskMutation.mutate(feedbackContext);
    } else {
      createTaskMutation.mutate(feedbackContext);
    }
  };

  const isLoading = createTaskMutation.isPending || attachToTaskMutation.isPending;
  const selectedTypeInfo = FEEDBACK_TYPES.find(t => t.value === feedbackType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            {attachToTask ? 'Attach Feedback to Task' : 'Quick Feedback Capture'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Attach to task indicator */}
          {attachToTask && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Attaching to:</span>
              <span className="font-medium truncate">{attachToTask.title}</span>
            </div>
          )}

          {/* Feedback type selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Feedback Type</label>
            <div className="flex gap-2">
              {FEEDBACK_TYPES.map((type) => (
                <Button
                  key={type.value}
                  variant={feedbackType === type.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFeedbackType(type.value)}
                  className="flex-1"
                >
                  <span className={feedbackType === type.value ? '' : type.color}>
                    {type.icon}
                  </span>
                  <span className="ml-1">{type.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Feedback text input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Feedback</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePasteFromClipboard}
                className="h-7 text-xs"
              >
                <Clipboard className="h-3 w-3 mr-1" />
                Paste
              </Button>
            </div>
            <Textarea
              ref={textareaRef}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={
                feedbackType === 'bug_report'
                  ? "Describe the bug: what happened, what you expected, steps to reproduce..."
                  : feedbackType === 'feature_request'
                  ? "Describe the feature you'd like to see..."
                  : feedbackType === 'question'
                  ? "What's your question?"
                  : "Share your feedback..."
              }
              className="min-h-[120px]"
            />
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From (optional)</label>
              <Input
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="Name or email"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Source URL (optional)</label>
              <Input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="GitHub issue, email, etc."
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Preview */}
          {feedbackText.length > 10 && (
            <div className="p-3 bg-muted/50 rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <span className={selectedTypeInfo?.color}>
                  {selectedTypeInfo?.icon}
                </span>
                <span className="text-xs font-medium">
                  {selectedTypeInfo?.label}
                </span>
              </div>
              <p className="text-sm">
                {generateFeedbackTitle({ raw_text: feedbackText, feedback_type: feedbackType, received_at: '' })}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!feedbackText.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : attachToTask ? (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Attach Feedback
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Auto-classify feedback type based on content
 */
function classifyFeedback(text: string): FeedbackType | null {
  const lower = text.toLowerCase();
  
  const bugPatterns = ['bug', 'error', 'crash', 'broken', 'not working', 'fail', 'issue', 'problem'];
  const featurePatterns = ['feature', 'would be nice', 'should', 'could you', 'please add', 'request', 'suggestion'];
  const questionPatterns = ['how do', 'how to', 'what is', 'where is', 'can i', 'is it possible', '?'];
  const praisePatterns = ['love', 'great', 'awesome', 'amazing', 'thank', 'excellent', 'perfect'];

  if (bugPatterns.some(p => lower.includes(p))) return 'bug_report';
  if (featurePatterns.some(p => lower.includes(p))) return 'feature_request';
  if (questionPatterns.some(p => lower.includes(p))) return 'question';
  if (praisePatterns.some(p => lower.includes(p))) return 'praise';
  
  return null;
}

/**
 * Generate task title from feedback
 */
function generateFeedbackTitle(feedback: FeedbackContext): string {
  const prefixes: Record<FeedbackType, string> = {
    bug_report: 'Bug:',
    feature_request: 'Feature:',
    question: 'Question:',
    praise: 'Feedback:',
    complaint: 'Issue:',
    other: 'Feedback:',
  };

  const prefix = prefixes[feedback.feedback_type || 'other'];
  const firstLine = feedback.raw_text.split('\n')[0].substring(0, 80);
  
  return `${prefix} ${firstLine}${feedback.raw_text.length > 80 ? '...' : ''}`;
}

/**
 * Format feedback context as markdown notes
 */
function formatFeedbackNotes(feedback: FeedbackContext): string {
  const lines: string[] = [];

  lines.push('## Feedback Details\n');
  
  if (feedback.feedback_type) {
    lines.push(`**Type:** ${feedback.feedback_type.replace('_', ' ')}`);
  }
  if (feedback.sender) {
    lines.push(`**From:** ${feedback.sender}`);
  }
  if (feedback.source_url) {
    lines.push(`**Source:** [${feedback.source_url}](${feedback.source_url})`);
  }
  lines.push(`**Received:** ${new Date(feedback.received_at).toLocaleString()}`);

  lines.push('\n### Content\n');
  lines.push(feedback.raw_text);

  return lines.join('\n');
}

// =============================================================================
// GLOBAL KEYBOARD SHORTCUT HOOK
// =============================================================================

/**
 * Hook to handle global Ctrl+Shift+F shortcut for quick feedback capture
 */
export function useQuickFeedbackCaptureShortcut(onOpen: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+F or Cmd+Shift+F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        onOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
}
