/**
 * Inbox Page
 * Shows all incoming items: errors, feedback, GitHub issues, emails, Slack messages
 * Unified view with filtering by type and source
 */

'use client';

import { useState, useMemo } from 'react';
import { useTasks, useTaskMutations } from '@/lib/hooks/useTasks';
import { TaskCard } from '@/components/task/TaskCard';
import { Button } from '@/components/ui/button';
import { 
  Inbox as InboxIcon, 
  AlertCircle, 
  MessageSquare, 
  Github, 
  Mail, 
  MessageCircle,
  Filter,
  Check,
  Clock,
  Zap,
  Loader2
} from 'lucide-react';
import { PAGE_HEADER, EMPTY_STATE, LOADING, STAT_CARD, SPACING, COLORS } from '@/lib/styles/constants';

type FilterType = 'all' | 'errors' | 'feedback';
type FilterSource = 'all' | 'github' | 'email' | 'slack' | 'sentry' | 'manual';
type FilterStatus = 'all' | 'new' | 'vibing' | 'done';

export default function InboxPage() {
  const { data: tasks, isLoading } = useTasks('all');
  const { updateTask } = useTaskMutations();
  
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('new');

  // Classify tasks
  const classifiedTasks = useMemo(() => {
    if (!tasks) return [];
    
    return tasks.map(task => {
      const sourceType = (task as any).source_type || '';
      const title = task.title?.toLowerCase() || '';
      const tags = task.tags?.map(t => t.name.toLowerCase()) || [];
      
      // Determine if error or feedback
      let type: 'error' | 'feedback' = 'feedback';
      if (
        sourceType.includes('bug') || 
        sourceType.includes('error') ||
        sourceType === 'sentry' ||
        task.priority === 'high' && ['error', 'bug', 'crash', 'fix', 'broken'].some(p => title.includes(p)) ||
        (task as any).sentry_issue_id
      ) {
        type = 'error';
      }
      
      // Determine source
      let source: FilterSource = 'manual';
      if (sourceType.startsWith('github') || (task as any).github_issue_id) {
        source = 'github';
      } else if (sourceType.startsWith('email') || (task as any).email_from) {
        source = 'email';
      } else if (sourceType.startsWith('slack') || (task as any).slack_channel) {
        source = 'slack';
      } else if (sourceType === 'sentry' || (task as any).sentry_issue_id) {
        source = 'sentry';
      }
      
      return { ...task, _type: type, _source: source };
    });
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return classifiedTasks.filter(task => {
      // Type filter
      if (filterType !== 'all' && task._type !== filterType.slice(0, -1)) {
        return false;
      }
      
      // Source filter
      if (filterSource !== 'all' && task._source !== filterSource) {
        return false;
      }
      
      // Status filter
      if (filterStatus === 'new' && (task.status !== 'todo' || task.completed)) {
        return false;
      }
      if (filterStatus === 'vibing' && task.status !== 'vibing') {
        return false;
      }
      if (filterStatus === 'done' && task.status !== 'done' && !task.completed) {
        return false;
      }
      
      return true;
    });
  }, [classifiedTasks, filterType, filterSource, filterStatus]);

  // Count by type
  const counts = useMemo(() => {
    const newTasks = classifiedTasks.filter(t => t.status === 'todo' && !t.completed);
    return {
      total: newTasks.length,
      errors: newTasks.filter(t => t._type === 'error').length,
      feedback: newTasks.filter(t => t._type === 'feedback').length,
      github: newTasks.filter(t => t._source === 'github').length,
      email: newTasks.filter(t => t._source === 'email').length,
      slack: newTasks.filter(t => t._source === 'slack').length,
      sentry: newTasks.filter(t => t._source === 'sentry').length,
    };
  }, [classifiedTasks]);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'github': return <Github className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'slack': return <MessageCircle className="h-4 w-4" />;
      case 'sentry': return <AlertCircle className="h-4 w-4" />;
      default: return <InboxIcon className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={LOADING.spinner} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={PAGE_HEADER.container}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <InboxIcon className={`${PAGE_HEADER.icon} text-purple-500`} />
            <h1 className={PAGE_HEADER.title}>Inbox</h1>
            {counts.total > 0 && (
              <span className="px-2 py-1 text-sm bg-purple-500/20 text-purple-400 rounded-full">
                {counts.total} new
              </span>
            )}
          </div>
          <p className={PAGE_HEADER.subtitle}>
            Incoming errors, feedback, and issues from all sources
          </p>
        </div>
      </div>

      <div className={`flex-1 overflow-auto ${SPACING.page.all} ${SPACING.container.md} mx-auto w-full`}>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className={STAT_CARD.container}>
          <div className={`${STAT_CARD.label} ${COLORS.semantic.error.text}`}>
            <AlertCircle className="h-4 w-4" />
            <span>Errors</span>
          </div>
          <span className={STAT_CARD.value}>{counts.errors}</span>
        </div>
        <div className={STAT_CARD.container}>
          <div className={`${STAT_CARD.label} ${COLORS.semantic.info.text}`}>
            <MessageSquare className="h-4 w-4" />
            <span>Feedback</span>
          </div>
          <span className={STAT_CARD.value}>{counts.feedback}</span>
        </div>
        <div className={STAT_CARD.container}>
          <div className={`${STAT_CARD.label} text-muted-foreground`}>
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </div>
          <span className={STAT_CARD.value}>{counts.github}</span>
        </div>
        <div className={STAT_CARD.container}>
          <div className={`${STAT_CARD.label} text-muted-foreground`}>
            <Mail className="h-4 w-4" />
            <span>Email</span>
          </div>
          <span className={STAT_CARD.value}>{counts.email}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Type Filter */}
        <div className="flex rounded-lg border overflow-hidden">
          {(['all', 'errors', 'feedback'] as FilterType[]).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-sm ${
                filterType === type 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-card hover:bg-accent'
              }`}
            >
              {type === 'all' ? 'All' : type === 'errors' ? 'Errors' : 'Feedback'}
            </button>
          ))}
        </div>

        {/* Source Filter */}
        <div className="flex rounded-lg border overflow-hidden">
          {(['all', 'github', 'email', 'slack', 'sentry', 'manual'] as FilterSource[]).map(source => (
            <button
              key={source}
              onClick={() => setFilterSource(source)}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${
                filterSource === source 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-card hover:bg-accent'
              }`}
            >
              {source !== 'all' && getSourceIcon(source)}
              {source.charAt(0).toUpperCase() + source.slice(1)}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex rounded-lg border overflow-hidden">
          {([
            { key: 'new', icon: Clock, label: 'New' },
            { key: 'vibing', icon: Zap, label: 'Working' },
            { key: 'done', icon: Check, label: 'Done' },
            { key: 'all', icon: Filter, label: 'All' },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${
                filterStatus === key 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-card hover:bg-accent'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className={EMPTY_STATE.container}>
          <InboxIcon className={EMPTY_STATE.icon} />
          <p className={EMPTY_STATE.title}>Inbox zero!</p>
          <p className={EMPTY_STATE.description}>No items matching your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <div key={task.id} className="relative">
              {/* Source Badge */}
              <div className="absolute -left-2 top-3 z-10">
                <div className={`p-1.5 rounded-full border bg-card shadow-sm ${
                  task._type === 'error' ? 'border-red-500/50' : 'border-blue-500/50'
                }`}>
                  {getSourceIcon(task._source)}
                </div>
              </div>
              <div className="ml-4">
                <TaskCard task={task} />
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
