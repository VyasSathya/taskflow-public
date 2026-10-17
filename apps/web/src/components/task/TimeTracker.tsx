/**
 * Time Tracker Component (Web)
 * Track time spent on tasks
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Timer, Play, Square, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface TimeEntry {
  id: string;
  task_id: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  notes?: string;
}

interface TimeTrackerProps {
  taskId: string;
  timeEntries?: TimeEntry[];
  onStart?: () => Promise<void>;
  onStop?: () => Promise<void>;
  onDelete?: (entryId: string) => Promise<void>;
  isTracking?: boolean;
}

export function TimeTracker({
  taskId,
  timeEntries = [],
  onStart,
  onStop,
  onDelete,
  isTracking = false,
}: TimeTrackerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Get active time entry
  const activeEntry = timeEntries.find((entry) => !entry.ended_at);

  useEffect(() => {
    if (isTracking && activeEntry) {
      // Calculate elapsed time
      const startTime = new Date(activeEntry.started_at).getTime();
      const updateElapsed = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(elapsed);
      };

      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      setElapsedSeconds(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isTracking, activeEntry]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDurationText = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  };

  const handleToggleTimer = async () => {
    if (isTracking) {
      await onStop?.();
    } else {
      await onStart?.();
    }
  };

  const handleDeleteEntry = async () => {
    if (deleteEntryId && onDelete) {
      await onDelete(deleteEntryId);
      setDeleteEntryId(null);
    }
  };

  // Calculate total time
  const totalSeconds =
    timeEntries.reduce((total, entry) => {
      if (entry.duration_seconds) {
        return total + entry.duration_seconds;
      }
      return total;
    }, 0) + (isTracking ? elapsedSeconds : 0);

  // Get completed entries (excluding active)
  const completedEntries = timeEntries.filter((entry) => entry.ended_at);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className={isTracking ? 'text-primary animate-pulse' : ''} />
              Time Tracker
            </div>
            {totalSeconds > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                Total: {formatDurationText(totalSeconds)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timer Display */}
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div
              className={`text-5xl font-light tabular-nums ${
                isTracking ? 'text-primary' : ''
              }`}
            >
              {formatDuration(isTracking ? elapsedSeconds : 0)}
            </div>
            <Button
              onClick={handleToggleTimer}
              variant={isTracking ? 'destructive' : 'default'}
              size="lg"
              className="w-full max-w-xs"
            >
              {isTracking ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop Timer
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Timer
                </>
              )}
            </Button>
          </div>

          {/* Time Entries List */}
          {completedEntries.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">
                Time Entries ({completedEntries.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {completedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {formatDurationText(entry.duration_seconds || 0)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(entry.started_at), 'MMM dd, yyyy • h:mm a')}
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteEntryId(entry.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEntryId} onOpenChange={(open) => !open && setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
