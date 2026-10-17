/**
 * Today Page
 * Shows tasks due today
 */

'use client';

import { TaskCard } from '@/components/task/TaskCard';
import { TaskQuickAdd } from '@/components/task/TaskQuickAdd';
import { useTasks } from '@/lib/hooks/useTasks';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function TodayPage() {
  const { data: tasks, isLoading, error } = useTasks('today');
  const todayDate = new Date();
  const todayFormatted = format(todayDate, 'EEEE, MMMM d');

  // Set default due date to today
  const todayISO = new Date();
  todayISO.setHours(0, 0, 0, 0);

  return (
    <div className="container max-w-4xl py-8 px-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Today</h1>
        <p className="text-muted-foreground">{todayFormatted} · {tasks?.length || 0} tasks</p>
      </div>

      {/* Quick Add */}
      <TaskQuickAdd defaultDueDate={todayISO.toISOString()} placeholder="Add a task for today..." />

      {/* Task List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load tasks</p>
        </div>
      ) : tasks && tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nothing due today. You're all caught up!</p>
        </div>
      )}
    </div>
  );
}
