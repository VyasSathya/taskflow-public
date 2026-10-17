/**
 * GitHub Integration Card
 * Settings UI for configuring GitHub webhook integration
 */

'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { IntegrationCard } from './IntegrationCard';
import {
  integrationService,
  type GitHubIntegration,
  type WebhookLog,
} from '@/lib/services/integration-service';

// GitHub logo SVG
const GitHubLogo = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const GITHUB_EVENTS = [
  { value: 'issues', label: 'Issues', description: 'Issue created, closed, reopened' },
  { value: 'issue_comment', label: 'Issue Comments', description: 'Comments on issues' },
  { value: 'pull_request', label: 'Pull Requests', description: 'PR created, merged, closed' },
];

export function GitHubIntegrationCard() {
  const [integration, setIntegration] = useState<GitHubIntegration | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settings state
  const [enabledEvents, setEnabledEvents] = useState<string[]>(['issues']);
  const [defaultPriority, setDefaultPriority] = useState<'none' | 'low' | 'medium' | 'high'>('high');
  const [defaultProjectTag, setDefaultProjectTag] = useState('');
  const [githubSecret, setGithubSecret] = useState('');

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    try {
      setIsLoading(true);
      const data = await integrationService.getGitHubIntegration();
      setIntegration(data);

      if (data) {
        setEnabledEvents(data.enabled_events?.split(',') || ['issues']);
        setDefaultPriority(data.default_priority);
        setDefaultProjectTag(data.default_project_tag || '');
        setGithubSecret(data.github_secret || '');

        const logsData = await integrationService.getWebhookLogs('github', 10);
        setLogs(logsData);
      }
    } catch (error) {
      console.error('Failed to load GitHub integration:', error);
      toast.error('Failed to load GitHub integration settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable = async () => {
    const data = await integrationService.enableGitHubIntegration({
      default_priority: defaultPriority,
      enabled_events: enabledEvents,
      default_project_tag: defaultProjectTag || undefined,
      github_secret: githubSecret || undefined,
    });
    setIntegration(data);
  };

  const handleDisable = async () => {
    await integrationService.disableGitHubIntegration();
    setIntegration((prev) => (prev ? { ...prev, is_enabled: false } : null));
  };

  const handleRegenerateSecret = async () => {
    const newSecret = await integrationService.regenerateWebhookSecret('github');
    setIntegration((prev) => (prev ? { ...prev, webhook_secret: newSecret } : null));
  };

  const handleTestWebhook = async () => {
    if (!integration) return { success: false, message: 'No integration found' };
    return integrationService.testWebhook('github', integration.webhook_secret);
  };

  const handleSaveSettings = async () => {
    try {
      await integrationService.updateGitHubIntegration({
        enabled_events: enabledEvents.join(','),
        default_priority: defaultPriority,
        default_project_tag: defaultProjectTag || null,
        github_secret: githubSecret || null,
      });
      toast.success('Settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const toggleEvent = (event: string) => {
    setEnabledEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const webhookUrl = integration
    ? integrationService.getGitHubWebhookUrl(integration.webhook_secret)
    : '';

  return (
    <IntegrationCard
      name="GitHub"
      description="Create tasks from GitHub issues and PRs"
      icon={<GitHubLogo />}
      iconBgColor="rgba(36, 41, 46, 0.9)"
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
          <h4 className="font-medium">How to set up GitHub Webhooks:</h4>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              Go to your repository&apos;s <strong>Settings &gt; Webhooks</strong>
              <a
                href="https://github.com/settings/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
              >
                Open GitHub <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>Click <strong>&quot;Add webhook&quot;</strong></li>
            <li>Paste your <strong>Payload URL</strong> (webhook URL above)</li>
            <li>Set <strong>Content type</strong> to <code>application/json</code></li>
            <li>
              (Optional) Add a <strong>Secret</strong> for signature verification and enter it in
              Advanced Settings below
            </li>
            <li>
              Select events:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Issues</li>
                <li>Issue comments (optional)</li>
                <li>Pull requests (optional)</li>
              </ul>
            </li>
            <li>Click <strong>&quot;Add webhook&quot;</strong></li>
          </ol>
          <p className="text-xs text-muted-foreground mt-2">
            New GitHub issues will automatically create tasks in VibeTasks. Issues labeled &quot;bug&quot;,
            &quot;error&quot;, or similar will be classified as bugs with high priority.
          </p>
        </div>
      }
      advancedSettings={
        <>
          {/* GitHub Events */}
          <div>
            <label className="text-sm font-medium mb-2 block">Handle these events:</label>
            <div className="flex flex-wrap gap-2">
              {GITHUB_EVENTS.map((event) => (
                <button
                  key={event.value}
                  onClick={() => toggleEvent(event.value)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    enabledEvents.includes(event.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                  title={event.description}
                >
                  {event.label}
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
              GitHub issue labels like &quot;critical&quot; or &quot;p0&quot; will override this.
            </p>
          </div>

          {/* Default Project Tag */}
          <div>
            <label className="text-sm font-medium mb-2 block">Default project tag:</label>
            <Input
              value={defaultProjectTag}
              onChange={(e) => setDefaultProjectTag(e.target.value)}
              placeholder="Leave empty to use repository name"
            />
          </div>

          {/* GitHub Webhook Secret */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              GitHub Webhook Secret (optional):
            </label>
            <Input
              type="password"
              value={githubSecret}
              onChange={(e) => setGithubSecret(e.target.value)}
              placeholder="Enter for signature verification"
            />
            <p className="text-xs text-muted-foreground mt-1">
              If set, webhook requests will be verified using HMAC-SHA256.
            </p>
          </div>
        </>
      }
      disabledInfo={
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">What this integration does:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Creates a VibeTasks task for each new GitHub issue</li>
            <li>Automatically classifies issues as bugs or feedback</li>
            <li>Syncs status: closed in GitHub = done in VibeTasks</li>
            <li>Maps GitHub labels to task priority</li>
            <li>Includes issue details and link back to GitHub</li>
          </ul>
        </div>
      }
    />
  );
}
