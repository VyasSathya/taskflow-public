/**
 * Completed Page
 * Shows completed tasks with toggle to show archived
 */

'use client';

import { useState, useMemo } from 'react';
import { TaskCard } from '@/components/task/TaskCard';
import { useTasks } from '@/lib/hooks/useTasks';
import { useTaskStore } from '@/lib/stores/task-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, History, Eye, EyeOff, Search, X, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { PAGE_HEADER, EMPTY_STATE, LOADING, SPACING } from '@/lib/styles/constants';

export default function CompletedPage() {
  const { data: completedTasks, isLoading: loadingCompleted, error: errorCompleted } = useTasks('completed');
  const { data: archivedTasks, isLoading: loadingArchived, error: errorArchived } = useTasks('archived');
  const showArchived = useTaskStore((state) => state.showArchived);
  const toggleShowArchived = useTaskStore((state) => state.toggleShowArchived);
  const [searchQuery, setSearchQuery] = useState('');

  const isLoading = loadingCompleted || (showArchived && loadingArchived);
  const error = errorCompleted || (showArchived && errorArchived);

  // Combine tasks if showing archived
  const allTasks = showArchived
    ? [...(completedTasks || []), ...(archivedTasks || [])]
    : completedTasks;

  // Filter by search query
  const tasks = useMemo(() => {
    if (!searchQuery.trim() || !allTasks) return allTasks;
    const query = searchQuery.toLowerCase();
    return allTasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      task.notes?.toLowerCase().includes(query) ||
      task.project_tag?.toLowerCase().includes(query) ||
      task.tags?.some(tag => tag.name.toLowerCase().includes(query))
    );
  }, [allTasks, searchQuery]);

  const completedCount = completedTasks?.length || 0;
  const archivedCount = archivedTasks?.length || 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={PAGE_HEADER.container}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className={`${PAGE_HEADER.icon} text-emerald-500`} />
            <h1 className={PAGE_HEADER.title}>Completed</h1>
          </div>
          <p className={PAGE_HEADER.subtitle}>
            {completedCount} recently done
            {showArchived && archivedCount > 0 && (
              <span className="text-muted-foreground/70"> + {archivedCount} in history</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? 'secondary' : 'outline'}
            size="sm"
            onClick={toggleShowArchived}
            className="text-xs"
          >
            {showArchived ? (
              <>
                <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                Hide History
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Show History ({archivedCount})
              </>
            )}
          </Button>
          <Link href="/dashboard?filter=archived">
            <Button variant="outline" size="sm" className="text-xs">
              <History className="h-3.5 w-3.5 mr-1.5" />
              View Full History
            </Button>
          </Link>
        </div>
      </div>

      <div className={`flex-1 overflow-auto ${SPACING.page.all} ${SPACING.container.md} mx-auto w-full ${SPACING.section}`}>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search completed tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search results count */}
      {searchQuery && tasks && (
        <p className="text-sm text-muted-foreground">
          {tasks.length} result{tasks.length !== 1 ? 's' : ''} for "{searchQuery}"
        </p>
      )}

      {/* Task List */}
      {isLoading ? (
        <div className={`${LOADING.container} py-12`}>
          <Loader2 className={LOADING.spinner} />
        </div>
      ) : error ? (
        <div className={EMPTY_STATE.container}>
          <p className="text-destructive">Failed to load tasks</p>
        </div>
      ) : tasks && tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <TaskCard key={task.id} task={task} shortId={index + 1} />
          ))}
        </div>
      ) : searchQuery ? (
        <div className={EMPTY_STATE.container}>
          <Search className={EMPTY_STATE.icon} />
          <p className={EMPTY_STATE.title}>No tasks match "{searchQuery}"</p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-sm text-primary hover:underline mt-2"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className={EMPTY_STATE.container}>
          <CheckCircle className={EMPTY_STATE.icon} />
          <p className={EMPTY_STATE.title}>No completed tasks yet</p>
          <p className={EMPTY_STATE.description}>
            Mark tasks as done to see them here
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
