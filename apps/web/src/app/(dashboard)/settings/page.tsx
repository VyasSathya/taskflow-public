/**
 * Settings Page
 * App configuration and integrations
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AISetupCard } from '@/components/onboarding/AISetupCard';
import { SentryIntegrationCard } from '@/components/settings/SentryIntegrationCard';
import { GitHubIntegrationCard } from '@/components/settings/GitHubIntegrationCard';
import { EmailIntegrationCard } from '@/components/settings/EmailIntegrationCard';
import { SlackIntegrationCard } from '@/components/settings/SlackIntegrationCard';
import { Calendar, LogOut, Trash2, Sun, Moon, Monitor, Settings } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useThemeStore } from '@/lib/stores/theme-store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PAGE_HEADER, SPACING } from '@/lib/styles/constants';

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { mode, setMode } = useThemeStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);

  const handleGoogleCalendarConnect = async () => {
    setIsConnecting(true);
    try {
      // OAuth flow for Google Calendar
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const redirectUri = `${window.location.origin}/auth/google-calendar/callback`;
      const scope = 'https://www.googleapis.com/auth/calendar';

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: clientId!,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope,
        access_type: 'offline',
        prompt: 'consent',
      })}`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    // TODO: Implement disconnect logic
    setIsConnected(false);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    // TODO: Implement account deletion
    toast.info('Account deletion coming soon', {
      description: 'This feature is under development and will be available soon.',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={PAGE_HEADER.container}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className={PAGE_HEADER.icon} />
            <h1 className={PAGE_HEADER.title}>Settings</h1>
          </div>
          <p className={PAGE_HEADER.subtitle}>Manage your account and preferences</p>
        </div>
      </div>

      <div className={`flex-1 overflow-auto ${SPACING.page.all} ${SPACING.container.md} mx-auto w-full ${SPACING.section}`}>

      {/* Account */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-sm">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">User ID</label>
            <p className="text-sm font-mono text-xs">{user?.id}</p>
          </div>
        </div>
      </Card>

      {/* Appearance */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Appearance</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Theme</label>
            <p className="text-sm text-muted-foreground mb-3">
              Choose how VibeTasks looks to you
            </p>
            <div className="grid gap-3">
              {[
                { value: 'light', label: 'Light', icon: Sun, desc: 'Always use light theme' },
                { value: 'dark', label: 'Dark', icon: Moon, desc: 'Always use dark theme' },
                { value: 'system', label: 'System', icon: Monitor, desc: 'Match system settings' },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setMode(option.value as 'light' | 'dark' | 'system')}
                    className={`flex items-center gap-3 p-4 border rounded-lg text-left transition-all ${
                      mode === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="flex-1">
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.desc}</p>
                    </div>
                    {mode === option.value && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Integrations */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Integrations</h2>
          <p className="text-sm text-muted-foreground">
            Connect external services to automatically create tasks from issues, emails, and messages
          </p>
        </div>
        <div className="space-y-4">
          {/* GitHub Integration */}
          <GitHubIntegrationCard />

          {/* Email Integration */}
          <EmailIntegrationCard />

          {/* Slack Integration */}
          <SlackIntegrationCard />

          {/* Sentry Integration */}
          <SentryIntegrationCard />

          {/* Google Calendar */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Google Calendar</p>
                  <p className="text-sm text-muted-foreground">
                    {isConnected ? 'Connected' : 'Sync your tasks with Google Calendar'}
                  </p>
                </div>
              </div>
              {isConnected ? (
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" onClick={handleGoogleCalendarConnect} disabled={isConnecting}>
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>
          </Card>

          {/* Coming Soon: Other Integrations */}
          <Card className="p-6 opacity-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Outlook Calendar</p>
                  <p className="text-sm text-muted-foreground">Coming soon</p>
                </div>
              </div>
              <Button size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* AI Setup */}
      <AISetupCard variant="card" />

      {/* Danger Zone */}
      <Card className="p-6 border-destructive">
        <h2 className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Log Out</p>
              <p className="text-sm text-muted-foreground">Sign out of your account</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" onClick={() => setShowDeleteAccountConfirm(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteAccountConfirm}
        onOpenChange={setShowDeleteAccountConfirm}
        onConfirm={handleDeleteAccount}
        title="Delete your account?"
        description="Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone."
        confirmText="Delete Account"
        cancelText="Cancel"
        variant="destructive"
      />
      </div>
    </div>
  );
}
