/**
 * Focus Page (Dashboard)
 * Shows active tasks (todo + vibing) in Kanban or List view
 * Completed History shows archived tasks
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { TaskCard } from '@/components/task/TaskCard';
import { TaskQuickAdd } from '@/components/task/TaskQuickAdd';
import { KanbanBoard } from '@/components/task/KanbanBoard';
import { useTasks, useTaskSubscription, useTags } from '@/lib/hooks/useTasks';
import { createClient } from '@/lib/supabase/client';
import { createTaskService } from '@/lib/shared/services/task-service';
import { Loader2, LayoutGrid, List, Share2, History, ArrowLeft, ChevronDown, ChevronUp, Folder, Tag, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { TaskFilter } from '@/lib/types';
import { PAGE_HEADER, EMPTY_STATE, LOADING, FILTER_BAR, ICON_SIZE, COLORS, SPACING } from '@/lib/styles/constants';

type ViewMode = 'kanban' | 'list';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter') as TaskFilter | null;
  const filter: TaskFilter = filterParam === 'archived' ? 'archived' : 'all';

  const { data: allTasks, isLoading, error } = useTasks(filter);
  const { data: tags } = useTags();
  const [userId, setUserId] = useState<string>();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Get unique projects from tasks
  const availableProjects = useMemo(() => {
    if (!allTasks) return [];
    return [...new Set(allTasks.map((t) => t.project_tag).filter(Boolean))] as string[];
  }, [allTasks]);

  // Filter tasks based on selected projects and tags
  const tasks = useMemo(() => {
    if (!allTasks) return allTasks;
    let filtered = allTasks;

    if (selectedProjects.length > 0) {
      filtered = filtered.filter((t) => t.project_tag && selectedProjects.includes(t.project_tag));
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((t) =>
        t.tags?.some((tag) => selectedTags.includes(tag.id))
      );
    }

    return filtered;
  }, [allTasks, selectedProjects, selectedTags]);

  const hasActiveFilters = selectedProjects.length > 0 || selectedTags.length > 0;

  const clearFilters = () => {
    setSelectedProjects([]);
    setSelectedTags([]);
  };

  const toggleProject = (project: string) => {
    setSelectedProjects((prev) =>
      prev.includes(project) ? prev.filter((p) => p !== project) : [...prev, project]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  // Get current user and trigger auto-archive + seed default tags on load
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);

        const taskService = createTaskService(supabase);
        // Auto-archive old done tasks on load
        taskService.autoArchiveOldTasks().catch(console.error);
        // Seed default dev-focused tags if user has none
        taskService.seedDefaultTags().catch(console.error);
      }
    });
  }, []);

  // Subscribe to real-time updates
  useTaskSubscription(userId);

  // Calculate stats (from filtered tasks)
  const todoCount = tasks?.filter((t) => t.status === 'todo' && !t.completed).length || 0;
  const vibingCount = tasks?.filter((t) => t.status === 'vibing' && !t.completed).length || 0;
  const isArchiveView = filter === 'archived';
  const totalCount = allTasks?.length || 0;
  const filteredCount = tasks?.length || 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          {isArchiveView ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <History className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-2xl font-bold">Completed History</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {tasks?.length || 0} tasks in history
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Focus</h1>
              <p className="text-sm text-muted-foreground">
                {tasks?.length || 0} active tasks
                {vibingCount > 0 && <span className="text-purple-500"> · {vibingCount} vibing</span>}
                {todoCount > 0 && <span> · {todoCount} todo</span>}
              </p>
            </>
          )}
        </div>

        {!isArchiveView && (
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="px-3"
              >
                <LayoutGrid className="h-4 w-4 mr-1.5" />
                Kanban
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="px-3"
              >
                <List className="h-4 w-4 mr-1.5" />
                List
              </Button>
            </div>

            {/* Share Progress */}
            <Button variant="outline" size="sm" className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10">
              <Share2 className="h-4 w-4 mr-1.5" />
              Share Progress
            </Button>
          </div>
        )}
      </div>

      {/* Collapsible Filter Bar */}
      {!isArchiveView && (availableProjects.length > 0 || (tags && tags.length > 0)) && (
        <div className="border-b border-border">
          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-6 py-2 flex items-center justify-between text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Folder className="h-3.5 w-3.5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-500 rounded-full">
                  {selectedProjects.length + selectedTags.length} active
                </span>
              )}
            </div>
            {showFilters ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {/* Filter Content */}
          {showFilters && (
            <div className="px-6 pb-4 space-y-4">
              {/* Projects */}
              {availableProjects.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Projects</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableProjects.map((project) => (
                      <button
                        key={project}
                        onClick={() => toggleProject(project)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          selectedProjects.includes(project)
                            ? 'bg-purple-500 text-white border-purple-500'
                            : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'
                        }`}
                      >
                        {project}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {tags && tags.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          selectedTags.includes(tag.id)
                            ? 'text-white'
                            : 'hover:opacity-80'
                        }`}
                        style={{
                          backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent',
                          borderColor: tag.color,
                          color: selectedTags.includes(tag.id) ? 'white' : tag.color,
                        }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active Filters Summary (when collapsed) */}
      {!isArchiveView && !showFilters && hasActiveFilters && (
        <div className="px-6 py-2 bg-purple-500/5 border-b border-purple-500/20 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filtering:</span>
          {selectedProjects.map((project) => (
            <span
              key={project}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-500"
            >
              <Folder className="h-2.5 w-2.5" />
              {project}
              <button onClick={() => toggleProject(project)} className="hover:text-purple-300">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          {selectedTags.map((tagId) => {
            const tag = tags?.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <span
                key={tagId}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                <Tag className="h-2.5 w-2.5" />
                {tag.name}
                <button onClick={() => toggleTag(tagId)} className="hover:opacity-70">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
          <span className="text-xs text-muted-foreground ml-2">
            ({filteredCount} of {totalCount} tasks)
          </span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className={LOADING.fullPage}>
          <Loader2 className={LOADING.spinner} />
        </div>
      ) : error ? (
        <div className={LOADING.fullPage}>
          <div className="text-center">
            <p className="text-destructive">Failed to load tasks</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </div>
      ) : isArchiveView ? (
        <div className="flex-1 overflow-auto">
          <div className="container max-w-4xl py-6 px-6 space-y-6">
            {tasks && tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task, index) => (
                  <TaskCard key={task.id} task={task} shortId={index + 1} />
                ))}
              </div>
            ) : (
              <div className={EMPTY_STATE.container}>
                <History className={EMPTY_STATE.icon} />
                <p className={EMPTY_STATE.title}>No completed history yet</p>
                <p className={EMPTY_STATE.description}>
                  Done tasks automatically move here after 7 days
                </p>
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="flex-1 pt-6 overflow-hidden">
          <KanbanBoard tasks={tasks || []} />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="container max-w-4xl py-6 px-6 space-y-6">
            {/* Quick Add */}
            <TaskQuickAdd />

            {/* Task List */}
            {tasks && tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task, index) => (
                  <TaskCard key={task.id} task={task} shortId={index + 1} />
                ))}
              </div>
            ) : (
              <div className={EMPTY_STATE.container}>
                <Zap className={EMPTY_STATE.icon} />
                <p className={EMPTY_STATE.title}>No tasks yet</p>
                <p className={EMPTY_STATE.description}>Add one above to get started!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
