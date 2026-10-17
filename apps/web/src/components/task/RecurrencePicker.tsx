/**
 * RecurrencePicker Component
 * UI for setting up recurring tasks
 */

'use client';

import { useState } from 'react';
import { RRule } from 'rrule';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'NONE';

interface RecurrencePickerProps {
  value?: string; // RRULE string
  onChange: (rrule: string | undefined) => void;
}

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    value ? parseRRule(value).frequency : 'NONE'
  );
  const [interval, setInterval] = useState(value ? parseRRule(value).interval : 1);
  const [endDate, setEndDate] = useState<string | undefined>(
    value ? parseRRule(value).endDate : undefined
  );

  const handleFrequencyChange = (freq: RecurrenceFrequency) => {
    setFrequency(freq);
    if (freq === 'NONE') {
      onChange(undefined);
    } else {
      updateRRule(freq, interval, endDate);
    }
  };

  const handleIntervalChange = (int: number) => {
    setInterval(int);
    if (frequency !== 'NONE') {
      updateRRule(frequency, int, endDate);
    }
  };

  const handleEndDateChange = (date: string | undefined) => {
    setEndDate(date);
    if (frequency !== 'NONE') {
      updateRRule(frequency, interval, date);
    }
  };

  const updateRRule = (freq: RecurrenceFrequency, int: number, end?: string) => {
    if (freq === 'NONE') {
      onChange(undefined);
      return;
    }

    const freqMap = {
      DAILY: RRule.DAILY,
      WEEKLY: RRule.WEEKLY,
      MONTHLY: RRule.MONTHLY,
      YEARLY: RRule.YEARLY,
      NONE: RRule.DAILY,
    };

    const rule = new RRule({
      freq: freqMap[freq],
      interval: int,
      ...(end && { until: new Date(end) }),
    });

    onChange(rule.toString());
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Repeat</label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            type="button"
            variant={frequency === 'NONE' ? 'default' : 'outline'}
            onClick={() => handleFrequencyChange('NONE')}
            className="w-full"
          >
            None
          </Button>
          <Button
            type="button"
            variant={frequency === 'DAILY' ? 'default' : 'outline'}
            onClick={() => handleFrequencyChange('DAILY')}
            className="w-full"
          >
            Daily
          </Button>
          <Button
            type="button"
            variant={frequency === 'WEEKLY' ? 'default' : 'outline'}
            onClick={() => handleFrequencyChange('WEEKLY')}
            className="w-full"
          >
            Weekly
          </Button>
          <Button
            type="button"
            variant={frequency === 'MONTHLY' ? 'default' : 'outline'}
            onClick={() => handleFrequencyChange('MONTHLY')}
            className="w-full"
          >
            Monthly
          </Button>
        </div>
      </div>

      {frequency !== 'NONE' && (
        <>
          <div>
            <label className="text-sm font-medium">Every</label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                min={1}
                value={interval}
                onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                {frequency === 'DAILY' && 'day(s)'}
                {frequency === 'WEEKLY' && 'week(s)'}
                {frequency === 'MONTHLY' && 'month(s)'}
                {frequency === 'YEARLY' && 'year(s)'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">End Date (Optional)</label>
            <Input
              type="date"
              value={endDate || ''}
              onChange={(e) => handleEndDateChange(e.target.value || undefined)}
              className="mt-2"
            />
          </div>
        </>
      )}

      {value && frequency !== 'NONE' && (
        <div className="text-xs text-muted-foreground">
          {RRule.fromString(value).toText()}
        </div>
      )}
    </div>
  );
}

function parseRRule(rruleString: string): {
  frequency: RecurrenceFrequency;
  interval: number;
  endDate?: string;
} {
  try {
    const rule = RRule.fromString(rruleString);
    const options = rule.origOptions;

    const freqMap: Record<number, RecurrenceFrequency> = {
      [RRule.DAILY]: 'DAILY',
      [RRule.WEEKLY]: 'WEEKLY',
      [RRule.MONTHLY]: 'MONTHLY',
      [RRule.YEARLY]: 'YEARLY',
    };

    return {
      frequency: options.freq !== undefined ? (freqMap[options.freq] || 'NONE') : 'NONE',
      interval: options.interval || 1,
      endDate: options.until ? options.until.toISOString().split('T')[0] : undefined,
    };
  } catch {
    return { frequency: 'NONE', interval: 1 };
  }
}
