/**
 * TaskQuickAdd Component
 * Quick task entry field
 */

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTaskMutations } from '@/lib/hooks/useTasks';

interface TaskQuickAddProps {
  defaultDueDate?: string;
  placeholder?: string;
  defaultStatus?: 'todo' | 'vibing' | 'done';
  compact?: boolean;
  onSuccess?: () => void;
}

export function TaskQuickAdd({
  defaultDueDate,
  placeholder = 'Add a task...',
  defaultStatus = 'todo',
  compact = false,
  onSuccess,
}: TaskQuickAddProps = {}) {
  const { createTask } = useTaskMutations();
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsLoading(true);
      await createTask.mutateAsync({
        title: title.trim(),
        completed: false,
        status: defaultStatus,
        priority: 'none',
        notes_format: 'html',
        position: 0,
        due_date: defaultDueDate,
        created_by: 'human',
      });
      setTitle('');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setTitle('');
              onSuccess?.();
            }
          }}
          autoFocus
        />
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading}
        className="flex-1"
      />
      <Button type="submit" disabled={!title.trim() || isLoading} className="shrink-0">
        <Plus className="h-4 w-4 mr-2" />
        Add
      </Button>
    </form>
  );
}
