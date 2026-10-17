/**
 * Sentry Integration Card
 * Settings UI for configuring Sentry integration
 */

'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { IntegrationCard } from './IntegrationCard';
import {
  sentryIntegrationService,
  type SentryIntegration,
  type SentryWebhookLog,
} from '@/lib/services/sentry-integration-service';
import { integrationService, type WebhookLog } from '@/lib/services/integration-service';

// Sentry logo SVG
const SentryLogo = () => (
  <svg className="h-5 w-5" viewBox="0 0 72 66" fill="currentColor">
    <path d="M29,2.26a4.67,4.67,0,0,0-8,0L14.42,13.53A32.21,32.21,0,0,1,32.17,40.19H27.55A27.68,27.68,0,0,0,12.09,17.47L6,28a15.92,15.92,0,0,1,9.23,12.17H4.62A.76.76,0,0,1,4,39.06l2.94-5a10.74,10.74,0,0,0-3.36-1.9l-2.91,5a4.54,4.54,0,0,0,1.69,6.24A4.66,4.66,0,0,0,4.62,44H19.15a19.4,19.4,0,0,0-8-17.31l2.31-4A23.87,23.87,0,0,1,23.76,44H36.07A35.88,35.88,0,0,0,16.41,8.8l2.67-4.61a.77.77,0,0,1,1.05-.27c.53.29,20.29,34.77,20.66,35.17a.76.76,0,0,1-.68,1.13H35.93a43.67,43.67,0,0,1,5.88,15.74H54a4.64,4.64,0,0,0,4-6.9Z" />
  </svg>
);

type SentryLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

const SENTRY_LEVELS: { value: SentryLevel; label: string; description: string }[] = [
  { value: 'fatal', label: 'Fatal', description: 'Critical errors that crash the application' },
  { value: 'error', label: 'Error', description: 'Errors that need attention' },
  { value: 'warning', label: 'Warning', description: 'Potential issues to monitor' },
  { value: 'info', label: 'Info', description: 'Informational messages' },
  { value: 'debug', label: 'Debug', description: 'Debugging information' },
];

// Convert SentryWebhookLog to WebhookLog format for compatibility
function convertLogs(sentryLogs: SentryWebhookLog[]): WebhookLog[] {
  return sentryLogs.map((log) => ({
    id: log.id,
    user_id: log.user_id,
    integration_type: 'sentry',
    action: log.action,
    resource: log.resource,
    success: log.success,
    error_message: log.error_message,
    task_id: log.task_id,
    ip_address: log.ip_address,
    created_at: log.created_at,
    metadata: log.sentry_issue_id ? { sentry_issue_id: log.sentry_issue_id } : undefined,
  }));
}

export function SentryIntegrationCard() {
  const [integration, setIntegration] = useState<SentryIntegration | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settings state
  const [enabledLevels, setEnabledLevels] = useState<SentryLevel[]>(['fatal', 'error']);
  const [defaultPriority, setDefaultPriority] = useState<'none' | 'low' | 'medium' | 'high'>('high');
  const [defaultProjectTag, setDefaultProjectTag] = useState('');

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    try {
      setIsLoading(true);
      const data = await sentryIntegrationService.getIntegration();
      setIntegration(data);

      if (data) {
        setEnabledLevels(data.enabled_levels.split(',') as SentryLevel[]);
        setDefaultPriority(data.default_priority);
        setDefaultProjectTag(data.default_project_tag || '');

        const logsData = await sentryIntegrationService.getWebhookLogs(10);
        setLogs(convertLogs(logsData));
      }
    } catch (error) {
      console.error('Failed to load Sentry integration:', error);
      toast.error('Failed to load Sentry integration settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable = async () => {
    const data = await sentryIntegrationService.enableIntegration({
      default_priority: defaultPriority,
      enabled_levels: enabledLevels,
      default_project_tag: defaultProjectTag || undefined,
    });
    setIntegration(data);
  };

  const handleDisable = async () => {
    await sentryIntegrationService.disableIntegration();
    setIntegration((prev) => (prev ? { ...prev, is_enabled: false } : null));
  };

  const handleRegenerateSecret = async () => {
    const newSecret = await sentryIntegrationService.regenerateWebhookSecret();
    setIntegration((prev) => (prev ? { ...prev, webhook_secret: newSecret } : null));
  };

  const handleTestWebhook = async () => {
    if (!integration) return { success: false, message: 'No integration found' };
    return integrationService.testWebhook('sentry', integration.webhook_secret);
  };

  const handleSaveSettings = async () => {
    try {
      await sentryIntegrationService.updateIntegration({
        enabled_levels: enabledLevels,
        default_priority: defaultPriority,
        default_project_tag: defaultProjectTag || null,
      });
      toast.success('Settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const toggleLevel = (level: SentryLevel) => {
    setEnabledLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const webhookUrl = integration
    ? sentryIntegrationService.getWebhookUrl(integration.webhook_secret)
    : '';

  return (
    <IntegrationCard
      name="Sentry"
      description="Auto-create tasks from production errors"
      icon={<SentryLogo />}
      iconBgColor="#362D59"
      isEnabled={integration?.is_enabled || false}
      isLoading={isLoading}
      tasksCreated={integration?.tasks_created || 0}
      lastWebhookAt={integration?.last_webhook_at || null}
      webhookUrl={webhookUrl}
      logs={logs}
      onEnable={handleEnable}
      onDisable={handleDisable}
      onRegenerateSecret={handleRegenerateSecret}
      onTestWebhook={handleTestWebhook}
      onSaveSettings={handleSaveSettings}
      setupInstructions={
        <div className="space-y-3">
          <h4 className="font-medium">How to set up in Sentry:</h4>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              Go to <strong>Settings &gt; Developer Settings &gt; Custom Integrations</strong> in
              Sentry
              <a
                href="https://sentry.io/settings/developer-settings/new-internal/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
              >
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              Click <strong>&quot;Create New Integration&quot;</strong> &gt;{' '}
              <strong>&quot;Internal Integration&quot;</strong>
            </li>
            <li>Give it a name (e.g., &quot;VibeTasks&quot;)</li>
            <li>
              Under <strong>Webhooks</strong>, paste your webhook URL above
            </li>
            <li>
              Enable <strong>Issue webhooks</strong> and select:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>issue.created</li>
                <li>issue.resolved</li>
                <li>issue.unresolved</li>
                <li>issue.assigned (optional)</li>
              </ul>
            </li>
            <li>
              Under <strong>Permissions</strong>, set Issue &amp; Event to <strong>Read</strong>
            </li>
            <li>
              Click <strong>Save Changes</strong>
            </li>
          </ol>
          <p className="text-xs text-muted-foreground mt-2">
            Once set up, new Sentry issues will automatically create tasks in VibeTasks.
          </p>
        </div>
      }
      advancedSettings={
        <>
          {/* Error Levels */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Create tasks for these error levels:
            </label>
            <div className="flex flex-wrap gap-2">
              {SENTRY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => toggleLevel(level.value)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    enabledLevels.includes(level.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                  title={level.description}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Default Priority */}
          <div>
            <label className="text-sm font-medium mb-2 block">Default task priority:</label>
            <div className="flex gap-2">
              {(['high', 'medium', 'low', 'none'] as const).map((priority) => (
                <button
                  key={priority}
                  onClick={() => setDefaultPriority(priority)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    defaultPriority === priority
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sentry&apos;s issue priority will override this when available.
            </p>
          </div>

          {/* Default Project Tag */}
          <div>
            <label className="text-sm font-medium mb-2 block">Default project tag:</label>
            <Input
              value={defaultProjectTag}
              onChange={(e) => setDefaultProjectTag(e.target.value)}
              placeholder="e.g., my-app (leave empty to use Sentry project name)"
            />
          </div>
        </>
      }
      disabledInfo={
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            What this integration does:
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Creates a VibeTasks task for each new Sentry error</li>
            <li>Deduplicates: same error = increments count, not new task</li>
            <li>Syncs status: resolved in Sentry = done in VibeTasks</li>
            <li>Includes error details, stack trace link, and stats</li>
          </ul>
        </div>
      }
    />
  );
}
