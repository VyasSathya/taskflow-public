/**
 * PageWrapper Component
 * Provides consistent page layout structure across all pages
 */

'use client';

import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { PAGE_HEADER, EMPTY_STATE, LOADING, SPACING } from '@/lib/styles/constants';

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  iconClassName?: string;
}

interface PageWrapperProps {
  children: ReactNode;
  header?: PageHeaderProps;
  maxWidth?: 'sm' | 'md' | 'lg' | 'full';
  isLoading?: boolean;
  error?: Error | null;
  errorMessage?: string;
}

export function PageHeader({ icon, title, subtitle, badge, actions, iconClassName }: PageHeaderProps) {
  return (
    <div className={PAGE_HEADER.container}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          {icon && <span className={iconClassName}>{icon}</span>}
          <h1 className={PAGE_HEADER.title}>{title}</h1>
          {badge}
        </div>
        {subtitle && <p className={PAGE_HEADER.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageWrapper({
  children,
  header,
  maxWidth = 'md',
  isLoading = false,
  error = null,
  errorMessage = 'Failed to load',
}: PageWrapperProps) {
  const containerClasses = {
    sm: SPACING.container.sm,
    md: SPACING.container.md,
    lg: SPACING.container.lg,
    full: SPACING.container.full,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {header && <PageHeader {...header} />}
        <div className={LOADING.fullPage}>
          <Loader2 className={LOADING.spinner} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        {header && <PageHeader {...header} />}
        <div className={LOADING.fullPage}>
          <div className="text-center">
            <p className="text-destructive">{errorMessage}</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {header && <PageHeader {...header} />}
      <div className={`flex-1 overflow-auto ${SPACING.page.all} ${containerClasses[maxWidth]} mx-auto w-full`}>
        <div className={SPACING.section}>{children}</div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={EMPTY_STATE.container}>
      <div className={EMPTY_STATE.icon}>{icon}</div>
      <p className={EMPTY_STATE.title}>{title}</p>
      {description && <p className={EMPTY_STATE.description}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={`${LOADING.spinner} ${className || ''}`} />;
}
