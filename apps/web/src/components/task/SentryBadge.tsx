/**
 * Sentry Badge Component
 * Shows Sentry error info on task cards
 */

'use client';

import { ExternalLink } from 'lucide-react';

// Sentry logo SVG (small version)
const SentryIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 72 66" fill="currentColor">
    <path d="M29,2.26a4.67,4.67,0,0,0-8,0L14.42,13.53A32.21,32.21,0,0,1,32.17,40.19H27.55A27.68,27.68,0,0,0,12.09,17.47L6,28a15.92,15.92,0,0,1,9.23,12.17H4.62A.76.76,0,0,1,4,39.06l2.94-5a10.74,10.74,0,0,0-3.36-1.9l-2.91,5a4.54,4.54,0,0,0,1.69,6.24A4.66,4.66,0,0,0,4.62,44H19.15a19.4,19.4,0,0,0-8-17.31l2.31-4A23.87,23.87,0,0,1,23.76,44H36.07A35.88,35.88,0,0,0,16.41,8.8l2.67-4.61a.77.77,0,0,1,1.05-.27c.53.29,20.29,34.77,20.66,35.17a.76.76,0,0,1-.68,1.13H35.93a43.67,43.67,0,0,1,5.88,15.74H54a4.64,4.64,0,0,0,4-6.9Z"/>
  </svg>
);

interface SentryBadgeProps {
  sentryIssueId?: string;
  sentryLevel?: string;
  sentryErrorCount?: number;
  sentryUrl?: string;
  sentryProject?: string;
  compact?: boolean;
}

const levelColors: Record<string, string> = {
  fatal: 'bg-red-500/20 text-red-400 border-red-500/30',
  error: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  debug: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export function SentryBadge({
  sentryIssueId,
  sentryLevel,
  sentryErrorCount,
  sentryUrl,
  sentryProject,
  compact = false,
}: SentryBadgeProps) {
  if (!sentryIssueId) return null;

  const levelColor = levelColors[sentryLevel || 'error'] || levelColors.error;

  if (compact) {
    return (
      <a
        href={sentryUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded border ${levelColor} hover:opacity-80 transition-opacity`}
        title={`Sentry: ${sentryLevel} (${sentryErrorCount} occurrences)`}
        onClick={(e) => e.stopPropagation()}
      >
        <SentryIcon className="h-3 w-3" />
        {sentryErrorCount && sentryErrorCount > 1 && (
          <span className="font-medium">{sentryErrorCount}x</span>
        )}
      </a>
    );
  }

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${levelColor}`}>
      <SentryIcon className="h-4 w-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase">{sentryLevel}</span>
          {sentryProject && (
            <span className="text-xs text-muted-foreground">in {sentryProject}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{sentryErrorCount || 1} occurrence{(sentryErrorCount || 1) > 1 ? 's' : ''}</span>
        </div>
      </div>
      {sentryUrl && (
        <a
          href={sentryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="View in Sentry"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
