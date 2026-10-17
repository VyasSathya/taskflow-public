/**
 * Priority Page
 * Shows tasks sorted by priority (high -> medium -> low -> none)
 * with full task management capabilities
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { TaskCard } from '@/components/task/TaskCard';
import { TaskQuickAdd } from '@/components/task/TaskQuickAdd';
import { useTasks, useTaskSubscription, useTags } from '@/lib/hooks/useTasks';
import { createClient } from '@/lib/supabase/client';
import { createTaskService } from '@/lib/shared/services/task-service';
import { Loader2, ListOrdered, ChevronDown, ChevronUp, Folder, Tag, X, Sparkles, Play, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@/lib/types';
import { PAGE_HEADER, EMPTY_STATE, LOADING, FILTER_BAR, COLORS, SPACING } from '@/lib/styles/constants';

// Priority order for sorting (high first)
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, none: 3 };

export default function PriorityPage() {
  const { data: allTasks, isLoading, error } = useTasks('all');
  const { data: tags } = useTags();
  const [userId, setUserId] = useState<string>();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['todo']); // Default to todo only

  // Get unique projects from tasks
  const availableProjects = useMemo(() => {
    if (!allTasks) return [];
    return [...new Set(allTasks.map((t) => t.project_tag).filter(Boolean))] as string[];
  }, [allTasks]);

  // Filter and sort tasks by priority
  const tasks = useMemo(() => {
    if (!allTasks) return allTasks;

    // Filter by selected statuses (default: todo only)
    let filtered = allTasks.filter((t) => {
      // Always exclude archived
      if (t.status === 'archived') return false;
      // Apply status filter
      return selectedStatuses.length === 0 || selectedStatuses.includes(t.status || 'todo');
    });

    // Apply project filter
    if (selectedProjects.length > 0) {
      filtered = filtered.filter((t) => t.project_tag && selectedProjects.includes(t.project_tag));
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((t) =>
        t.tags?.some((tag) => selectedTags.includes(tag.id))
      );
    }

    // Sort by priority (high -> medium -> low -> none), then by position
    return filtered.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return (a.position || 0) - (b.position || 0);
    });
  }, [allTasks, selectedProjects, selectedTags, selectedStatuses]);

  // Check if filters differ from defaults
  const hasActiveFilters = selectedProjects.length > 0 || selectedTags.length > 0 ||
    !(selectedStatuses.length === 1 && selectedStatuses[0] === 'todo');

  const clearFilters = () => {
    setSelectedProjects([]);
    setSelectedTags([]);
    setSelectedStatuses(['todo']); // Reset to default
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
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

  // Get current user
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);

        const taskService = createTaskService(supabase);
        taskService.autoArchiveOldTasks().catch(console.error);
        taskService.seedDefaultTags().catch(console.error);
      }
    });
  }, []);

  // Subscribe to real-time updates
  useTaskSubscription(userId);

  // Group tasks by priority for display
  const groupedTasks = useMemo(() => {
    if (!tasks) return { high: [], medium: [], low: [], none: [] };
    return {
      high: tasks.filter((t) => t.priority === 'high'),
      medium: tasks.filter((t) => t.priority === 'medium'),
      low: tasks.filter((t) => t.priority === 'low'),
      none: tasks.filter((t) => t.priority === 'none'),
    };
  }, [tasks]);

  // Get the next task (highest priority)
  const nextTask = tasks && tasks.length > 0 ? tasks[0] : null;

  // Stats
  const totalCount = allTasks?.filter((t) => !t.completed && t.status !== 'archived').length || 0;
  const filteredCount = tasks?.length || 0;
  const highCount = groupedTasks.high.length;
  const mediumCount = groupedTasks.medium.length;
  const lowCount = groupedTasks.low.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ListOrdered className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Priority</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {filteredCount} tasks
            {highCount > 0 && <span className="text-red-500"> · {highCount} high</span>}
            {mediumCount > 0 && <span className="text-amber-500"> · {mediumCount} medium</span>}
            {lowCount > 0 && <span className="text-blue-500"> · {lowCount} low</span>}
          </p>
        </div>

        {/* Next Task Badge */}
        {nextTask && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1.5 text-sm bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-purple-500" />
              <span className="text-muted-foreground mr-1">Next:</span>
              <span className="font-medium truncate max-w-[200px]">{nextTask.title}</span>
            </Badge>
          </div>
        )}
      </div>

      {/* Collapsible Filter Bar - always show for status filter */}
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
                  {selectedStatuses.length + selectedProjects.length + selectedTags.length} active
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
              {/* Status Filter */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleStatus('todo')}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors flex items-center gap-1.5 ${
                      selectedStatuses.includes('todo')
                        ? 'bg-gray-500 text-white border-gray-500'
                        : 'border-gray-500/30 text-gray-400 hover:bg-gray-500/10'
                    }`}
                  >
                    <Play className="h-3 w-3" />
                    Todo
                  </button>
                  <button
                    onClick={() => toggleStatus('vibing')}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors flex items-center gap-1.5 ${
                      selectedStatuses.includes('vibing')
                        ? 'bg-purple-500 text-white border-purple-500'
                        : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'
                    }`}
                  >
                    <Zap className="h-3 w-3" />
                    Vibing
                  </button>
                  <button
                    onClick={() => toggleStatus('done')}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors flex items-center gap-1.5 ${
                      selectedStatuses.includes('done')
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                  >
                    <Check className="h-3 w-3" />
                    Done
                  </button>
                </div>
              </div>

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

      {/* Active Filters Summary (when collapsed) */}
      {!showFilters && hasActiveFilters && (
        <div className="px-6 py-2 bg-purple-500/5 border-b border-purple-500/20 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filtering:</span>
          {/* Status filters */}
          {selectedStatuses.map((status) => {
            const statusConfig: Record<string, { icon: typeof Play; color: string; bg: string }> = {
              todo: { icon: Play, color: 'text-gray-500', bg: 'bg-gray-500/20' },
              vibing: { icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/20' },
              done: { icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-500/20' },
            };
            const config = statusConfig[status];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <span
                key={status}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.color}`}
              >
                <Icon className="h-2.5 w-2.5" />
                {status}
                <button onClick={() => toggleStatus(status)} className="hover:opacity-70">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
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
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="container max-w-4xl py-6 px-6 space-y-6">
            {/* Quick Add */}
            <TaskQuickAdd />

            {/* Priority Groups */}
            {tasks && tasks.length > 0 ? (
              <div className="space-y-8">
                {/* High Priority */}
                {groupedTasks.high.length > 0 && (
                  <PrioritySection
                    title="High Priority"
                    color="red"
                    tasks={groupedTasks.high}
                  />
                )}

                {/* Medium Priority */}
                {groupedTasks.medium.length > 0 && (
                  <PrioritySection
                    title="Medium Priority"
                    color="amber"
                    tasks={groupedTasks.medium}
                  />
                )}

                {/* Low Priority */}
                {groupedTasks.low.length > 0 && (
                  <PrioritySection
                    title="Low Priority"
                    color="blue"
                    tasks={groupedTasks.low}
                  />
                )}

                {/* No Priority */}
                {groupedTasks.none.length > 0 && (
                  <PrioritySection
                    title="No Priority"
                    color="gray"
                    tasks={groupedTasks.none}
                  />
                )}
              </div>
            ) : (
              <div className={EMPTY_STATE.container}>
                <ListOrdered className={EMPTY_STATE.icon} />
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

// Priority Section Component
function PrioritySection({
  title,
  color,
  tasks,
}: {
  title: string;
  color: 'red' | 'amber' | 'blue' | 'gray';
  tasks: Task[];
}) {
  const colorClasses = {
    red: 'border-red-500/30 text-red-500',
    amber: 'border-amber-500/30 text-amber-500',
    blue: 'border-blue-500/30 text-blue-500',
    gray: 'border-border text-muted-foreground',
  };

  const dotColors = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    gray: 'bg-muted-foreground',
  };

  return (
    <div>
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${colorClasses[color]}`}>
        <div className={`h-2 w-2 rounded-full ${dotColors[color]}`} />
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">({tasks.length})</span>
      </div>
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <TaskCard key={task.id} task={task} shortId={index + 1} />
        ))}
      </div>
    </div>
  );
}
