/**
 * Reminder Picker Component (Web)
 * Allows users to set reminders for tasks
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Clock, Calendar, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReminderOption {
  id: string;
  label: string;
  minutesBefore: number;
  icon: typeof Clock;
}

interface ReminderPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (minutesBefore: number) => void;
  currentReminder?: number;
}

const REMINDER_OPTIONS: ReminderOption[] = [
  { id: 'at-time', label: 'At time of task', minutesBefore: 0, icon: Clock },
  { id: '5-min', label: '5 minutes before', minutesBefore: 5, icon: Clock },
  { id: '10-min', label: '10 minutes before', minutesBefore: 10, icon: Clock },
  { id: '15-min', label: '15 minutes before', minutesBefore: 15, icon: Clock },
  { id: '30-min', label: '30 minutes before', minutesBefore: 30, icon: Bell },
  { id: '1-hour', label: '1 hour before', minutesBefore: 60, icon: Bell },
  { id: '2-hours', label: '2 hours before', minutesBefore: 120, icon: Bell },
  { id: '1-day', label: '1 day before', minutesBefore: 1440, icon: Calendar },
];

export function ReminderPicker({
  open,
  onOpenChange,
  onSelect,
  currentReminder,
}: ReminderPickerProps) {
  const [selectedMinutes, setSelectedMinutes] = useState<number | undefined>(currentReminder);

  const handleSelect = (minutesBefore: number) => {
    setSelectedMinutes(minutesBefore);
    onSelect(minutesBefore);
    onOpenChange(false);
  };

  const handleRemove = () => {
    setSelectedMinutes(undefined);
    onSelect(-1); // -1 means remove reminder
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Set Reminder
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          {REMINDER_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedMinutes === option.minutesBefore;

            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.minutesBefore)}
                className={cn(
                  'flex items-center justify-between w-full px-4 py-3 rounded-lg border transition-colors',
                  'hover:bg-accent hover:border-primary/50',
                  isSelected && 'bg-primary/10 border-primary'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-full',
                      isSelected ? 'bg-primary/20' : 'bg-muted'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <span className={cn(
                    'font-medium',
                    isSelected && 'text-primary'
                  )}>
                    {option.label}
                  </span>
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </button>
            );
          })}

          {selectedMinutes !== undefined && (
            <button
              onClick={handleRemove}
              className="flex items-center justify-between w-full px-4 py-3 rounded-lg border border-destructive/50 hover:bg-destructive/10 transition-colors mt-2"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/20">
                  <X className="h-4 w-4 text-destructive" />
                </div>
                <span className="font-medium text-destructive">
                  Remove reminder
                </span>
              </div>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
