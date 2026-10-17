/**
 * Kanban Board Component
 * Displays tasks in three columns: Todo, Vibing, Done
 * Supports drag and drop between columns
 */

'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, Plus, History, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { KanbanColumn } from './KanbanColumn';
import { KanbanTaskCard } from './KanbanTaskCard';
import { TaskQuickAdd } from './TaskQuickAdd';
import { useTaskMutations, useTasks } from '@/lib/hooks/useTasks';
import { useTaskStore } from '@/lib/stores/task-store';
import { Button } from '@/components/ui/button';
import { COLORS, EMPTY_STATE } from '@/lib/styles/constants';
import type { Task } from '@/lib/types';

interface KanbanBoardProps {
  tasks: Task[];
}

const WIP_LIMIT = 3;

export function KanbanBoard({ tasks }: KanbanBoardProps) {
  const { updateTask } = useTaskMutations();
  const { data: archivedTasks } = useTasks('archived');
  const showArchivedColumn = useTaskStore((state) => state.showArchivedColumn);
  const toggleShowArchivedColumn = useTaskStore((state) => state.toggleShowArchivedColumn);
  const [quickAddColumn, setQuickAddColumn] = useState<'todo' | 'vibing' | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<'todo' | 'vibing' | 'done' | 'archived' | null>(null);

  // Group tasks by status
  const todoTasks = tasks.filter((t) => t.status === 'todo' && !t.completed);
  const vibingTasks = tasks.filter((t) => t.status === 'vibing' && !t.completed);
  const doneTasks = tasks.filter((t) => t.status === 'done' || t.completed);
  const archivedTasksList = archivedTasks || [];

  // Create shortId mapping for all tasks (1-99)
  const allDisplayTasks = [...vibingTasks, ...todoTasks, ...doneTasks, ...archivedTasksList];
  const taskShortIdMap = new Map<string, number>();
  allDisplayTasks.slice(0, 99).forEach((task, index) => {
    taskShortIdMap.set(task.id, index + 1);
  });

  const isOverWipLimit = vibingTasks.length > WIP_LIMIT;

  // Handle status change
  const handleStatusChange = useCallback((taskId: string, newStatus: 'todo' | 'vibing' | 'done' | 'archived') => {
    const updates: Partial<Task> = {
      status: newStatus,
      completed: newStatus === 'done' || newStatus === 'archived',
      completed_at: newStatus === 'done' ? new Date().toISOString() : undefined,
    };
    updateTask.mutate({ id: taskId, updates });
  }, [updateTask]);

  // Drag and drop handlers
  const handleDragStart = useCallback((taskId: string) => {
    setDraggedTaskId(taskId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback((column: 'todo' | 'vibing' | 'done' | 'archived') => {
    setDragOverColumn(column);
  }, []);

  const handleDrop = useCallback((targetColumn: 'todo' | 'vibing' | 'done' | 'archived') => {
    if (draggedTaskId) {
      // Check in both regular tasks and archived tasks
      const task = tasks.find(t => t.id === draggedTaskId) || archivedTasksList.find(t => t.id === draggedTaskId);
      if (task && task.status !== targetColumn) {
        handleStatusChange(draggedTaskId, targetColumn);
      }
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  }, [draggedTaskId, tasks, archivedTasksList, handleStatusChange]);

  // Get unique projects for stats
  const projects = [...new Set(tasks.map((t) => t.project_tag).filter(Boolean))];

  return (
    <div className="flex flex-col h-full">
      {/* Header with History Toggle */}
      <div className="mx-6 mb-4 flex items-center justify-end">
        <Button
          variant={showArchivedColumn ? 'secondary' : 'outline'}
          size="sm"
          onClick={toggleShowArchivedColumn}
          className="text-xs"
        >
          {showArchivedColumn ? (
            <>
              <EyeOff className="h-3.5 w-3.5 mr-1.5" />
              Hide History Column
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Show History ({archivedTasksList.length})
            </>
          )}
        </Button>
      </div>

      {/* WIP Limit Warning */}
      {isOverWipLimit && (
        <div className={`mx-6 mb-4 p-4 ${COLORS.semantic.warning.bg} ${COLORS.semantic.warning.border} border rounded-lg flex items-start gap-3`}>
          <AlertTriangle className={`h-5 w-5 ${COLORS.semantic.warning.text} flex-shrink-0 mt-0.5`} />
          <div>
            <p className={`font-semibold ${COLORS.semantic.warning.text}`}>WIP Limit Exceeded</p>
            <p className="text-sm text-muted-foreground">
              You have {vibingTasks.length} tasks in progress. Research shows 3+ concurrent tasks = 40% productivity loss.
              Focus on finishing before starting new work.
            </p>
          </div>
        </div>
      )}

      {/* Kanban Columns */}
      <div className="flex-1 flex gap-6 px-6 pb-6 overflow-x-auto">
        {/* Todo Column */}
        <KanbanColumn
          title="Todo"
          subtitle="Ready to start when you have energy"
          count={todoTasks.length}
          color="gray"
          columnId="todo"
          onAddClick={() => setQuickAddColumn('todo')}
          isDragOver={dragOverColumn === 'todo'}
          onDragOver={() => handleDragOver('todo')}
          onDragLeave={() => setDragOverColumn(null)}
          onDrop={() => handleDrop('todo')}
        >
          {quickAddColumn === 'todo' && (
            <div className="mb-3">
              <TaskQuickAdd
                onSuccess={() => setQuickAddColumn(null)}
                defaultStatus="todo"
                compact
              />
            </div>
          )}
          {todoTasks.map((task) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              onDragStart={() => handleDragStart(task.id)}
              onDragEnd={handleDragEnd}
              isDragging={draggedTaskId === task.id}
              shortId={taskShortIdMap.get(task.id)}
            />
          ))}
          {todoTasks.length === 0 && !quickAddColumn && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No tasks waiting</p>
              <button
                onClick={() => setQuickAddColumn('todo')}
                className="text-xs text-primary hover:underline mt-2 flex items-center gap-1 mx-auto"
              >
                <Plus className="h-3 w-3" /> Add task
              </button>
            </div>
          )}
        </KanbanColumn>

        {/* Vibing Column */}
        <KanbanColumn
          title="Vibing"
          subtitle={`Currently working on (limit: ${WIP_LIMIT} for best flow)`}
          count={vibingTasks.length}
          color="purple"
          columnId="vibing"
          isWarning={isOverWipLimit}
          isDragOver={dragOverColumn === 'vibing'}
          onDragOver={() => handleDragOver('vibing')}
          onDragLeave={() => setDragOverColumn(null)}
          onDrop={() => handleDrop('vibing')}
        >
          {vibingTasks.map((task) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              onDragStart={() => handleDragStart(task.id)}
              onDragEnd={handleDragEnd}
              isDragging={draggedTaskId === task.id}
              isVibing
              shortId={taskShortIdMap.get(task.id)}
            />
          ))}
          {vibingTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nothing in progress</p>
              <p className="text-xs mt-1">Drag a task here to start working</p>
            </div>
          )}
        </KanbanColumn>

        {/* Done Column */}
        <KanbanColumn
          title="Done"
          subtitle="Recently completed, moves to history after 7 days"
          count={doneTasks.length}
          color="green"
          columnId="done"
          isDragOver={dragOverColumn === 'done'}
          onDragOver={() => handleDragOver('done')}
          onDragLeave={() => setDragOverColumn(null)}
          onDrop={() => handleDrop('done')}
        >
          {doneTasks.slice(0, 10).map((task) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              onDragStart={() => handleDragStart(task.id)}
              onDragEnd={handleDragEnd}
              isDragging={draggedTaskId === task.id}
              isDone
              shortId={taskShortIdMap.get(task.id)}
            />
          ))}
          {doneTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No completed tasks yet</p>
              <p className="text-xs mt-1">Drag a task here to complete</p>
            </div>
          )}
          {doneTasks.length > 10 && (
            <p className="text-xs text-center text-muted-foreground py-2">
              +{doneTasks.length - 10} more completed
            </p>
          )}
          {!showArchivedColumn && (
            <Link
              href="/dashboard?filter=archived"
              className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-2 mt-2 border-t border-border"
            >
              <History className="h-3 w-3" />
              View History ({archivedTasksList.length})
            </Link>
          )}
        </KanbanColumn>

        {/* Completed History Column (optional) */}
        {showArchivedColumn && (
          <KanbanColumn
            title="History"
            subtitle="Older completed tasks, stored for reference"
            count={archivedTasksList.length}
            color="slate"
            columnId="archived"
            isDragOver={dragOverColumn === 'archived'}
            onDragOver={() => handleDragOver('archived')}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={() => handleDrop('archived')}
          >
            {archivedTasksList.slice(0, 15).map((task) => (
              <KanbanTaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
                onDragStart={() => handleDragStart(task.id)}
                onDragEnd={handleDragEnd}
                isDragging={draggedTaskId === task.id}
                isDone
                isArchived
                shortId={taskShortIdMap.get(task.id)}
              />
            ))}
            {archivedTasksList.length === 0 && (
              <div className={EMPTY_STATE.container}>
                <History className={EMPTY_STATE.icon} />
                <p className={EMPTY_STATE.title}>No completed history</p>
                <p className={EMPTY_STATE.description}>Done tasks move here after 7 days</p>
              </div>
            )}
            {archivedTasksList.length > 15 && (
              <Link
                href="/dashboard?filter=archived"
                className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-2 mt-2 border-t border-border"
              >
                +{archivedTasksList.length - 15} more in history
              </Link>
            )}
          </KanbanColumn>
        )}
      </div>
    </div>
  );
}
