/**
 * QuickErrorCapture - Ultra Low-Friction Error Capture Modal
 * 
 * Design Goals:
 * - 2 clicks max: Open modal + Create task
 * - Auto-parse pasted error text
 * - Attach to existing task OR create new task
 * - No page navigation required
 * 
 * Usage:
 * - Global keyboard shortcut: Ctrl+Shift+E
 * - Button in header/sidebar
 * - Right-click context menu
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Clipboard, Plus, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task } from '@vibetasks/shared';
import * as taskService from '@/lib/services/task-service';

// Error parsing types (inlined to avoid circular deps)
interface ErrorContext {
  raw_text: string;
  error_type?: string;
  message?: string;
  category?: string;
  file_path?: string;
  line_number?: number;
  column?: number;
  code?: string;
  stack_trace?: string;
  suggestion?: string;
  captured_at: string;
  capture_source?: 'paste' | 'clipboard' | 'terminal' | 'browser' | 'sentry' | 'ci';
}

interface QuickErrorCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: Attach to existing task instead of creating new */
  attachToTask?: Task;
}

export function QuickErrorCapture({ open, onOpenChange, attachToTask }: QuickErrorCaptureProps) {
  const [errorText, setErrorText] = useState('');
  const [parsedError, setParsedError] = useState<ErrorContext | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Parse error as user types/pastes
  useEffect(() => {
    if (errorText.length > 10) {
      const parsed = parseErrorText(errorText);
      setParsedError(parsed);
      if (parsed) {
        setGeneratedTitle(generateTaskTitle(parsed));
      } else {
        setGeneratedTitle('');
      }
    } else {
      setParsedError(null);
      setGeneratedTitle('');
    }
  }, [errorText]);

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
        setErrorText(text);
        toast.success('Pasted from clipboard');
      }
    } catch {
      toast.error('Failed to read clipboard. Try Ctrl+V instead.');
    }
  }, []);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (errorContext: ErrorContext) => {
      const project = detectProject(errorContext);
      
      // Create task with error details in notes
      // error_context field is optional - works with or without DB migration
      const taskData: any = {
        title: generatedTitle || 'Fix error',
        notes: formatErrorNotes(errorContext),
        notes_format: 'markdown',
        priority: 'high',
        status: 'todo',
        project_tag: project,
        created_by: 'human',
      };
      
      // Try with error_context first, fall back without if DB doesn't support it
      try {
        return await taskService.createTask({
          ...taskData,
          source_type: 'manual',
          error_context: errorContext,
        } as any);
      } catch (e) {
        // Fallback: create without error_context if column doesn't exist
        console.warn('Creating task without error_context (DB migration may be pending)');
        return await taskService.createTask(taskData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Error task created');
      handleClose();
    },
    onError: (error) => {
      console.error('Failed to create error task:', error);
      toast.error('Failed to create task');
    },
  });

  // Attach to existing task mutation
  const attachToTaskMutation = useMutation({
    mutationFn: async (errorContext: ErrorContext) => {
      if (!attachToTask) throw new Error('No task to attach to');
      
      // Try with error_context first, fall back to just updating notes
      const updates: any = {
        ...(attachToTask.priority !== 'high' && { priority: 'high' }),
      };
      
      try {
        return await taskService.updateTask(attachToTask.id, {
          ...updates,
          error_context: errorContext,
        } as any);
      } catch (e) {
        // Fallback: append error to notes if column doesn't exist
        console.warn('Updating task without error_context (DB migration may be pending)');
        const existingNotes = attachToTask.notes || '';
        const errorNotes = formatErrorNotes(errorContext);
        return await taskService.updateTask(attachToTask.id, {
          ...updates,
          notes: existingNotes ? `${existingNotes}\n\n---\n\n${errorNotes}` : errorNotes,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Error attached to task');
      handleClose();
    },
    onError: (error) => {
      console.error('Failed to attach error:', error);
      toast.error('Failed to attach error');
    },
  });

  const handleClose = () => {
    setErrorText('');
    setParsedError(null);
    setGeneratedTitle('');
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!parsedError) {
      // Create with raw text if not parsed
      const rawError: ErrorContext = {
        raw_text: errorText,
        category: 'general',
        captured_at: new Date().toISOString(),
        capture_source: 'paste',
      };
      
      if (attachToTask) {
        attachToTaskMutation.mutate(rawError);
      } else {
        createTaskMutation.mutate(rawError);
      }
      return;
    }

    if (attachToTask) {
      attachToTaskMutation.mutate(parsedError);
    } else {
      createTaskMutation.mutate(parsedError);
    }
  };

  const isLoading = createTaskMutation.isPending || attachToTaskMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            {attachToTask ? 'Attach Error to Task' : 'Quick Error Capture'}
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

          {/* Error text input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Paste your error</label>
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
              value={errorText}
              onChange={(e) => setErrorText(e.target.value)}
              placeholder="Paste error message, stack trace, or terminal output here...

Example:
TypeError: Cannot read property 'foo' of undefined
    at MyComponent (src/components/MyComponent.tsx:42:15)"
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* Parsed preview */}
          {parsedError && (
            <div className="p-3 bg-muted/50 rounded-md space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Detected: {parsedError.category}
                </span>
                {parsedError.error_type && (
                  <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-500 rounded">
                    {parsedError.error_type}
                  </span>
                )}
              </div>
              {generatedTitle && (
                <p className="text-sm font-medium">{generatedTitle}</p>
              )}
              {parsedError.file_path && (
                <p className="text-xs text-muted-foreground font-mono">
                  {parsedError.file_path}
                  {parsedError.line_number && `:${parsedError.line_number}`}
                </p>
              )}
              {parsedError.suggestion && (
                <p className="text-xs text-blue-500">{parsedError.suggestion}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!errorText.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : attachToTask ? (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Attach Error
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
 * Format error context as markdown notes
 */
function formatErrorNotes(error: ErrorContext): string {
  const lines: string[] = [];

  lines.push('## Error Details\n');
  
  if (error.error_type) {
    lines.push(`**Type:** ${error.error_type}`);
  }
  if (error.category) {
    lines.push(`**Category:** ${error.category}`);
  }
  if (error.message) {
    lines.push(`**Message:** ${error.message}`);
  }
  if (error.file_path) {
    lines.push(`**File:** \`${error.file_path}\``);
  }
  if (error.line_number) {
    lines.push(`**Line:** ${error.line_number}${error.column ? `:${error.column}` : ''}`);
  }
  
  if (error.suggestion) {
    lines.push('\n### Suggestion');
    lines.push(error.suggestion);
  }

  if (error.stack_trace) {
    lines.push('\n### Stack Trace');
    lines.push('```');
    lines.push(error.stack_trace);
    lines.push('```');
  }

  lines.push('\n### Raw Error');
  lines.push('```');
  // Limit raw text to 50 lines
  const rawLines = error.raw_text.split('\n').slice(0, 50);
  lines.push(rawLines.join('\n'));
  if (error.raw_text.split('\n').length > 50) {
    lines.push('... (truncated)');
  }
  lines.push('```');

  return lines.join('\n');
}

// =============================================================================
// LOCAL ERROR PARSING (inlined for simplicity)
// =============================================================================

/**
 * Parse raw error text into structured ErrorContext
 */
function parseErrorText(rawText: string): ErrorContext | null {
  if (!rawText || rawText.trim().length < 10) return null;
  
  const text = rawText.trim();
  
  // TypeScript errors
  const tsMatch = text.match(/TS(\d{4,5})/);
  if (tsMatch) {
    const msgMatch = text.match(/TS\d+:\s*(.+?)(?:\n|$)/);
    const fileMatch = text.match(/([^\s:(]+\.[tj]sx?):(\d+):(\d+)/);
    return {
      raw_text: text,
      error_type: `TS${tsMatch[1]}`,
      message: msgMatch?.[1]?.trim(),
      category: 'typescript',
      file_path: fileMatch?.[1],
      line_number: fileMatch ? parseInt(fileMatch[2]) : undefined,
      column: fileMatch ? parseInt(fileMatch[3]) : undefined,
      captured_at: new Date().toISOString(),
      capture_source: 'paste',
    };
  }
  
  // Node.js errors
  const nodeMatch = text.match(/(TypeError|ReferenceError|SyntaxError|RangeError|Error):\s*(.+?)(?:\n|$)/);
  if (nodeMatch) {
    const stackMatch = text.match(/at\s+.+\s+\((.+):(\d+):(\d+)\)/);
    return {
      raw_text: text,
      error_type: nodeMatch[1],
      message: nodeMatch[2]?.trim(),
      category: 'nodejs',
      file_path: stackMatch?.[1],
      line_number: stackMatch ? parseInt(stackMatch[2]) : undefined,
      column: stackMatch ? parseInt(stackMatch[3]) : undefined,
      stack_trace: extractStackTrace(text),
      captured_at: new Date().toISOString(),
      capture_source: 'paste',
    };
  }
  
  // npm errors
  if (text.includes('npm ERR!') || text.includes('ERESOLVE') || text.includes('E404')) {
    return {
      raw_text: text,
      error_type: text.includes('ERESOLVE') ? 'ERESOLVE' : 'npm Error',
      category: 'npm',
      suggestion: text.includes('ERESOLVE') ? 'Try: npm install --legacy-peer-deps' : undefined,
      captured_at: new Date().toISOString(),
      capture_source: 'paste',
    };
  }
  
  // Generic error detection
  if (/error|fail|exception|crash/i.test(text)) {
    return {
      raw_text: text,
      category: 'general',
      message: text.split('\n')[0].substring(0, 200),
      captured_at: new Date().toISOString(),
      capture_source: 'paste',
    };
  }
  
  return null;
}

function extractStackTrace(text: string): string | undefined {
  const lines = text.split('\n').filter(line => /^\s*at\s+/.test(line));
  return lines.length > 0 ? lines.slice(0, 20).join('\n') : undefined;
}

function generateTaskTitle(error: ErrorContext): string {
  const prefixes: Record<string, string> = {
    typescript: 'Fix TS',
    nodejs: 'Fix',
    npm: 'Resolve npm',
    general: 'Fix',
  };
  
  const prefix = prefixes[error.category || 'general'] || 'Fix';
  let title = `${prefix} ${error.error_type || 'error'}`;
  
  if (error.message) {
    const snippet = error.message.substring(0, 60);
    title += `: ${snippet}${error.message.length > 60 ? '...' : ''}`;
  }
  
  if (error.file_path && error.line_number) {
    const fileName = error.file_path.split(/[/\\]/).pop();
    title += ` in ${fileName}:${error.line_number}`;
  }
  
  return title.substring(0, 100);
}

function detectProject(error: ErrorContext): string | undefined {
  if (!error.file_path) return undefined;
  const patterns = [/apps\/([^/]+)/, /packages\/([^/]+)/, /src\/([^/]+)/];
  for (const pattern of patterns) {
    const match = error.file_path.match(pattern);
    if (match) return match[1];
  }
  return undefined;
}

// =============================================================================
// GLOBAL KEYBOARD SHORTCUT HOOK
// =============================================================================

/**
 * Hook to handle global Ctrl+Shift+E shortcut for quick error capture
 */
export function useQuickErrorCaptureShortcut(onOpen: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+E or Cmd+Shift+E
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        onOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
}
