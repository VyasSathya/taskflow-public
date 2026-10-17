/**
 * Dashboard Layout
 * Sidebar + main content area with viber-focused features
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckSquare,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Zap,
  AlertTriangle,
  Archive,
  ListOrdered,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useAppStore } from '@/lib/stores/app-store';
import { useTasks, useTaskSubscription } from '@/lib/hooks/useTasks';
import { usePathname, useSearchParams } from 'next/navigation';
import { LOADING, COLORS } from '@/lib/styles/constants';

const navigation = [
  { name: 'Focus', href: '/dashboard', icon: Zap, matchPath: '/dashboard', matchQuery: null },
  { name: 'Inbox', href: '/inbox', icon: Inbox, matchPath: '/inbox', matchQuery: null },
  { name: 'Priority', href: '/priority', icon: ListOrdered, matchPath: '/priority', matchQuery: null },
  { name: 'Errors', href: '/errors', icon: AlertCircle, matchPath: '/errors', matchQuery: null },
  { name: 'Completed', href: '/completed', icon: Archive, matchPath: '/completed', matchQuery: null },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, signOut, initialize, isAuthenticated, isLoading } = useAuthStore();
  
  // Check if a nav item is currently active
  const isNavActive = (item: typeof navigation[0]) => {
    if (item.matchPath === '/dashboard') {
      // Focus is active only when on /dashboard without filter param
      return pathname === '/dashboard' && !searchParams.get('filter');
    }
    return pathname === item.matchPath;
  };
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: tasks } = useTasks('all');

  // Calculate vibing count and projects
  const vibingCount = tasks?.filter((t) => t.status === 'vibing' && !t.completed).length || 0;
  const isOverWipLimit = vibingCount > 3;

  // Calculate inbox count (errors + feedback from external sources)
  const inboxCount = tasks?.filter((t) => {
    if (t.completed || t.status === 'done') return false;
    // Count tasks from external sources or high-priority error-like tasks
    const sourceType = (t as any).source_type || '';
    const hasExternalSource = sourceType && sourceType !== 'manual';
    const isError = t.priority === 'high' && ['error', 'bug', 'fix', 'crash', 'fail'].some(p => 
      t.title?.toLowerCase().includes(p)
    );
    return hasExternalSource || isError || (t as any).sentry_issue_id || (t as any).github_issue_id;
  }).length || 0;
  
  // Deduplicate projects case-insensitively and normalize whitespace
  const projectMap = new Map<string, string>(); // normalized -> display
  tasks?.forEach((t) => {
    if (t.project_tag) {
      const normalized = t.project_tag.toLowerCase().trim();
      // Keep the first occurrence's casing as the display name
      if (!projectMap.has(normalized)) {
        projectMap.set(normalized, t.project_tag.trim());
      }
    }
  });
  const projects = Array.from(projectMap.values());
  
  // Count tasks per project (case-insensitive matching)
  const projectCounts = projects.reduce((acc, project) => {
    const normalizedProject = project.toLowerCase().trim();
    acc[project] = tasks?.filter((t) => 
      t.project_tag?.toLowerCase().trim() === normalizedProject && !t.completed
    ).length || 0;
    return acc;
  }, {} as Record<string, number>);

  // Initialize auth store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Redirect to login if not authenticated (backup to middleware)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Redirect to onboarding if not completed (skip if already on onboarding page)
  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasCompletedOnboarding && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [isLoading, isAuthenticated, hasCompletedOnboarding, pathname, router]);

  // Subscribe to realtime task updates
  useTaskSubscription(user?.id);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className={`flex h-screen ${LOADING.container}`}>
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Show onboarding page without sidebar
  const isOnboardingPage = pathname === '/onboarding';
  if (isOnboardingPage) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${isCollapsed ? 'w-16' : 'w-64'} border-r border-border bg-card transition-all duration-300 relative`}>
        {/* Floating toggle button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-16 z-10 h-6 w-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>

        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={`flex h-16 items-center border-b border-border ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
            {!isCollapsed && <h1 className="text-xl font-bold">VibeTasks</h1>}
            {isCollapsed && <span className="text-xl font-bold">VT</span>}
          </div>

          {/* Navigation */}
          <nav className={`flex-1 ${isCollapsed ? 'p-2' : 'p-4'} overflow-y-auto`}>
            {/* Main Navigation */}
            <div className="space-y-1 mb-6">
              {!isCollapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
                  Views
                </p>
              )}
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = isNavActive(item);
                const isFocus = item.name === 'Focus';
                const isInbox = item.name === 'Inbox';
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center ${isCollapsed ? 'justify-center px-3' : 'gap-3 px-3'} rounded-lg py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                      isActive 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground'
                    } ${isFocus && vibingCount > 0 ? 'text-purple-400' : ''} ${isInbox && inboxCount > 0 ? 'text-purple-400' : ''}`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <div className="relative">
                      <Icon className={`h-5 w-5 ${isFocus && vibingCount > 0 ? 'text-purple-400' : ''} ${isInbox && inboxCount > 0 ? 'text-purple-400' : ''}`} />
                      {/* Inbox badge when collapsed */}
                      {isCollapsed && isInbox && inboxCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center">
                          {inboxCount > 9 ? '9+' : inboxCount}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className="flex-1">{item.name}</span>
                        {isFocus && vibingCount > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${isOverWipLimit ? `${COLORS.semantic.warning.bg} ${COLORS.semantic.warning.text}` : `${COLORS.status.vibing.bg} ${COLORS.status.vibing.text}`}`}>
                            {vibingCount}
                          </span>
                        )}
                        {isInbox && inboxCount > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${COLORS.status.vibing.bg} ${COLORS.status.vibing.text}`}>
                            {inboxCount}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Projects Section */}
            {!isCollapsed && projects.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
                  Projects (Auto-detected)
                </p>
                {projects.map((project, index) => {
                  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                  const color = colors[index % colors.length];
                  return (
                    <Link
                      key={project}
                      href={`/dashboard?project=${project}`}
                      className="flex items-center gap-3 px-3 rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="flex-1 truncate">{project}</span>
                      <span className="text-xs text-muted-foreground">
                        {projectCounts[project as string]}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* WIP Warning */}
            {!isCollapsed && isOverWipLimit && (
              <div className={`mt-6 p-3 ${COLORS.semantic.warning.bg} ${COLORS.semantic.warning.border} border rounded-lg`}>
                <div className={`flex items-center gap-2 ${COLORS.semantic.warning.text} font-semibold text-xs mb-1`}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  WIP Limit Warning
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  You have {vibingCount} tasks vibing. Research shows 3+ tasks = 40% productivity loss.
                </p>
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className={`border-t border-border ${isCollapsed ? 'p-2' : 'p-4'} space-y-1`}>
            <Link
              href="/settings"
              className={`flex items-center ${isCollapsed ? 'justify-center px-3' : 'gap-3 px-3'} rounded-lg py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                pathname === '/settings' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
              }`}
              title={isCollapsed ? 'Settings' : undefined}
            >
              <Settings className="h-5 w-5" />
              {!isCollapsed && 'Settings'}
            </Link>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-3' : 'gap-3 px-3'} rounded-lg py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground text-left`}
              title={isCollapsed ? 'Logout' : undefined}
            >
              <LogOut className="h-5 w-5" />
              {!isCollapsed && 'Logout'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
