/**
 * Email Integration Card
 * Settings UI for configuring email webhook integration
 */

'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ExternalLink, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { IntegrationCard } from './IntegrationCard';
import {
  integrationService,
  type EmailIntegration,
  type WebhookLog,
} from '@/lib/services/integration-service';

const EMAIL_PROVIDERS = [
  {
    value: 'mailgun',
    label: 'Mailgun',
    description: 'Popular email service with inbound parsing',
    docsUrl: 'https://documentation.mailgun.com/en/latest/api-routes.html',
  },
  {
    value: 'sendgrid',
    label: 'SendGrid',
    description: 'Reliable email delivery and parsing',
    docsUrl: 'https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook',
  },
  {
    value: 'postmark',
    label: 'Postmark',
    description: 'Developer-friendly email service',
    docsUrl: 'https://postmarkapp.com/developer/webhooks/inbound-webhook',
  },
  {
    value: 'generic',
    label: 'Generic/Other',
    description: 'Works with most email webhook formats',
    docsUrl: null,
  },
];

export function EmailIntegrationCard() {
  const [integration, setIntegration] = useState<EmailIntegration | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settings state
  const [provider, setProvider] = useState<'mailgun' | 'sendgrid' | 'postmark' | 'generic'>(
    'generic'
  );
  const [defaultPriority, setDefaultPriority] = useState<'none' | 'low' | 'medium' | 'high'>(
    'medium'
  );
  const [allowedSenders, setAllowedSenders] = useState('');

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    try {
      setIsLoading(true);
      const data = await integrationService.getEmailIntegration();
      setIntegration(data);

      if (data) {
        setProvider(data.provider || 'generic');
        setDefaultPriority(data.default_priority);
        setAllowedSenders(data.allowed_senders || '');

        const logsData = await integrationService.getWebhookLogs('email', 10);
        setLogs(logsData);
      }
    } catch (error) {
      console.error('Failed to load email integration:', error);
      toast.error('Failed to load email integration settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable = async () => {
    const data = await integrationService.enableEmailIntegration({
      provider,
      default_priority: defaultPriority,
      allowed_senders: allowedSenders || undefined,
    });
    setIntegration(data);
  };

  const handleDisable = async () => {
    await integrationService.disableEmailIntegration();
    setIntegration((prev) => (prev ? { ...prev, is_enabled: false } : null));
  };

  const handleRegenerateSecret = async () => {
    const newSecret = await integrationService.regenerateWebhookSecret('email');
    setIntegration((prev) => (prev ? { ...prev, webhook_secret: newSecret } : null));
  };

  const handleTestWebhook = async () => {
    if (!integration) return { success: false, message: 'No integration found' };
    return integrationService.testWebhook('email', integration.webhook_secret);
  };

  const handleSaveSettings = async () => {
    try {
      await integrationService.updateEmailIntegration({
        provider,
        default_priority: defaultPriority,
        allowed_senders: allowedSenders || null,
      });
      toast.success('Settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const webhookUrl = integration
    ? integrationService.getEmailWebhookUrl(integration.webhook_secret, provider)
    : '';

  const selectedProvider = EMAIL_PROVIDERS.find((p) => p.value === provider);

  return (
    <IntegrationCard
      name="Email"
      description="Create tasks from support emails"
      icon={<Mail className="h-5 w-5 text-white" />}
      iconBgColor="rgba(59, 130, 246, 0.9)"
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
          <h4 className="font-medium">How to set up Email Inbound Parsing:</h4>

          {provider === 'mailgun' && (
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>
                Go to <strong>Mailgun Dashboard &gt; Receiving &gt; Create Route</strong>
                <a
                  href="https://app.mailgun.com/app/receiving/routes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
                >
                  Open Mailgun <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Set <strong>Expression Type</strong> to &quot;Match Recipient&quot; or &quot;Catch All&quot;
              </li>
              <li>
                Under <strong>Actions</strong>, select &quot;Forward&quot; and paste your webhook URL
              </li>
              <li>
                Enable <strong>&quot;Store and Notify&quot;</strong> to include full email data
              </li>
              <li>Save the route</li>
            </ol>
          )}

          {provider === 'sendgrid' && (
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>
                Go to <strong>SendGrid Dashboard &gt; Settings &gt; Inbound Parse</strong>
                <a
                  href="https://app.sendgrid.com/settings/parse"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
                >
                  Open SendGrid <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Click <strong>&quot;Add Host &amp; URL&quot;</strong>
              </li>
              <li>Enter your subdomain and select your domain</li>
              <li>Paste your webhook URL in the Destination URL field</li>
              <li>
                Enable <strong>&quot;POST the raw, full MIME message&quot;</strong> for more details
              </li>
              <li>Save</li>
            </ol>
          )}

          {provider === 'postmark' && (
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>
                Go to <strong>Postmark &gt; Servers &gt; Your Server &gt; Settings</strong>
                <a
                  href="https://account.postmarkapp.com/servers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
                >
                  Open Postmark <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Under <strong>Inbound</strong>, click &quot;Set up inbound&quot;
              </li>
              <li>Configure your inbound domain</li>
              <li>Set the <strong>Webhook URL</strong> to your webhook URL</li>
              <li>Save changes</li>
            </ol>
          )}

          {provider === 'generic' && (
            <div className="text-muted-foreground space-y-2">
              <p>
                Configure your email service to POST emails to the webhook URL. The payload should
                include:
              </p>
              <ul className="list-disc list-inside ml-2">
                <li>
                  <code>from</code> or <code>sender</code>: Sender email address
                </li>
                <li>
                  <code>subject</code>: Email subject line
                </li>
                <li>
                  <code>text</code> or <code>body</code>: Plain text content
                </li>
                <li>
                  <code>html</code> (optional): HTML content
                </li>
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-2">
            Emails with keywords like &quot;bug&quot;, &quot;error&quot;, or &quot;crash&quot; will be classified as bugs with
            higher priority.
          </p>
        </div>
      }
      advancedSettings={
        <>
          {/* Email Provider */}
          <div>
            <label className="text-sm font-medium mb-2 block">Email Provider:</label>
            <div className="grid grid-cols-2 gap-2">
              {EMAIL_PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setProvider(p.value as typeof provider)}
                  className={`p-3 text-sm rounded-lg border text-left transition-colors ${
                    provider === p.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">{p.label}</div>
                  <div
                    className={`text-xs ${
                      provider === p.value ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}
                  >
                    {p.description}
                  </div>
                </button>
              ))}
            </div>
            {selectedProvider?.docsUrl && (
              <a
                href={selectedProvider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2"
              >
                View {selectedProvider.label} documentation <ExternalLink className="h-3 w-3" />
              </a>
            )}
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
              Emails with &quot;urgent&quot; or &quot;critical&quot; in the subject will get high priority.
            </p>
          </div>

          {/* Allowed Senders */}
          <div>
            <label className="text-sm font-medium mb-2 block">Allowed senders (optional):</label>
            <Input
              value={allowedSenders}
              onChange={(e) => setAllowedSenders(e.target.value)}
              placeholder="user@example.com, *@company.com (comma-separated)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to accept emails from any sender. Use * as wildcard.
            </p>
          </div>
        </>
      }
      disabledInfo={
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">What this integration does:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Creates a VibeTasks task for each incoming support email</li>
            <li>Automatically classifies emails as bugs or feedback</li>
            <li>Extracts priority from subject keywords</li>
            <li>Works with Mailgun, SendGrid, Postmark, or any email service</li>
            <li>Includes sender info and email content in the task</li>
          </ul>
        </div>
      }
    />
  );
}
