/**
 * Calendar Page
 * Visual time blocking view of tasks
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar';
import moment from 'moment';
import { toast } from 'sonner';
import { useTasks, useTaskMutations } from '@/lib/hooks/useTasks';
import { Loader2, Plus } from 'lucide-react';
import { Task } from '@/lib/types';
import { TaskDetailModal } from '@/components/task/TaskDetailModal';
import { PromptDialog } from '@/components/ui/prompt-dialog';
import { useResolvedTheme } from '@/lib/stores/theme-store';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Task;
}

export default function CalendarPage() {
  const { data: allTasks } = useTasks('all');
  const { data: todayTasks } = useTasks('today');
  const { data: upcomingTasks } = useTasks('upcoming');
  const { createTask, updateTask } = useTaskMutations();
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const resolvedTheme = useResolvedTheme();

  // Combine all tasks
  const tasks = useMemo(() => {
    const combined = [
      ...(allTasks || []),
      ...(todayTasks || []),
      ...(upcomingTasks || []),
    ];
    // Deduplicate by id
    const uniqueMap = new Map();
    combined.forEach(task => uniqueMap.set(task.id, task));
    return Array.from(uniqueMap.values());
  }, [allTasks, todayTasks, upcomingTasks]);

  // Convert tasks to calendar events
  const events = useMemo<CalendarEvent[]>(() => {
    return tasks
      .filter(task => !task.completed && task.due_date)
      .map(task => {
        const startDate = new Date(task.due_date!);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour default

        return {
          id: task.id,
          title: task.title,
          start: startDate,
          end: endDate,
          resource: task,
        };
      });
  }, [tasks]);

  // Handle clicking on a calendar slot to create task
  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      setSelectedSlot(slotInfo);
      setShowPromptDialog(true);
    },
    []
  );

  // Handle creating task from prompt dialog
  const handleCreateTask = async (title: string) => {
    if (!selectedSlot) return;

    try {
      await createTask.mutateAsync({
        title,
        due_date: selectedSlot.start.toISOString(),
        completed: false,
        priority: 'none',
        notes_format: 'html',
        position: 0,
      });
      toast.success('Task created', {
        description: `"${title}" added to calendar`,
      });
    } catch (error) {
      console.error('Failed to create task:', error);

      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = (error as any).message || 'Something went wrong';
      } else {
        errorMessage = String(error);
      }

      toast.error('Failed to create task', {
        description: errorMessage,
      });
    }
  };

  // Handle clicking on event to view/edit
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      setSelectedTask(event.resource);
      setIsModalOpen(true);
    },
    []
  );

  // Custom event styling based on priority
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const task = event.resource;
    const isDark = resolvedTheme === 'dark';

    const priorityColors = {
      high: isDark ? '#dc2626' : '#ef4444',
      medium: isDark ? '#d97706' : '#f59e0b',
      low: isDark ? '#2563eb' : '#3b82f6',
      none: isDark ? '#7c3aed' : '#8b5cf6',
    };

    return {
      style: {
        backgroundColor: priorityColors[task.priority],
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  }, [resolvedTheme]);

  return (
    <div className="container max-w-7xl py-8 px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            {tasks.length} tasks · Drag to reschedule · Click date to add task
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-card rounded-lg border p-4" style={{ height: '700px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          eventPropGetter={eventStyleGetter}
          popup
          style={{ height: '100%' }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium">Priority:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 dark:bg-red-600" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 dark:bg-amber-600" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-600" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500 dark:bg-violet-600" />
          <span>None</span>
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
        }}
      />

      {/* Create Task Dialog */}
      <PromptDialog
        open={showPromptDialog}
        onOpenChange={setShowPromptDialog}
        onConfirm={handleCreateTask}
        title="Create new task"
        description={selectedSlot ? `Add a task for ${moment(selectedSlot.start).format('MMMM D, YYYY at h:mm A')}` : undefined}
        label="Task title"
        placeholder="Enter task title..."
        confirmText="Create"
        cancelText="Cancel"
      />
    </div>
  );
}
