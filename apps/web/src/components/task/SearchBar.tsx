/**
 * Task Search Bar Component (Web)
 * Search and filter tasks
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchFilters {
  priority?: 'high' | 'medium' | 'low' | 'none';
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChangeText,
  onFiltersChange,
  placeholder = 'Search tasks...',
  className,
}: SearchBarProps) {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const handleClear = () => {
    onChangeText('');
  };

  const handleFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
    onFiltersChange?.({});
    setShowFilters(false);
  };

  const activeFiltersCount = Object.keys(filters).filter((key) => {
    const value = filters[key as keyof SearchFilters];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined;
  }).length;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {value.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filters */}
      <Popover open={showFilters} onOpenChange={setShowFilters}>
        <PopoverTrigger asChild>
          <Button
            variant={activeFiltersCount > 0 ? 'default' : 'outline'}
            size="icon"
            className="relative"
          >
            <Filter className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Filters</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                disabled={activeFiltersCount === 0}
              >
                Clear all
              </Button>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <div className="grid grid-cols-2 gap-2">
                {(['high', 'medium', 'low', 'none'] as const).map((priority) => {
                  const isSelected = filters.priority === priority;
                  return (
                    <button
                      key={priority}
                      onClick={() => {
                        handleFilterChange({
                          ...filters,
                          priority: isSelected ? undefined : priority,
                        });
                      }}
                      className={cn(
                        'px-3 py-2 rounded-md border text-sm font-medium transition-colors',
                        'hover:bg-accent',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background'
                      )}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Apply Button */}
            <Button
              onClick={() => setShowFilters(false)}
              className="w-full"
            >
              Apply Filters
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
