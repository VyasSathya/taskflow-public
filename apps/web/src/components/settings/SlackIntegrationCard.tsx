/**
 * Slack Integration Card
 * Settings UI for configuring Slack webhook integration
 */

'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import { IntegrationCard } from './IntegrationCard';
import {
  integrationService,
  type SlackIntegration,
  type WebhookLog,
} from '@/lib/services/integration-service';

// Slack logo SVG
const SlackLogo = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.52 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.124a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.52v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
  </svg>
);

const DEFAULT_TRIGGER_WORDS = ['feedback', 'bug', 'feature request', 'suggestion', 'issue'];
const DEFAULT_TRIGGER_REACTIONS = ['eyes', 'memo', 'bug', 'ticket'];

export function SlackIntegrationCard() {
  const [integration, setIntegration] = useState<SlackIntegration | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settings state
  const [slackSigningSecret, setSlackSigningSecret] = useState('');
  const [allowedChannels, setAllowedChannels] = useState<string[]>([]);
  const [triggerWords, setTriggerWords] = useState<string[]>(DEFAULT_TRIGGER_WORDS);
  const [triggerReactions, setTriggerReactions] = useState<string[]>(DEFAULT_TRIGGER_REACTIONS);
  const [defaultPriority, setDefaultPriority] = useState<'none' | 'low' | 'medium' | 'high'>(
    'medium'
  );

  // Input state for adding items
  const [newChannel, setNewChannel] = useState('');
  const [newTriggerWord, setNewTriggerWord] = useState('');
  const [newReaction, setNewReaction] = useState('');

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    try {
      setIsLoading(true);
      const data = await integrationService.getSlackIntegration();
      setIntegration(data);

      if (data) {
        setSlackSigningSecret(data.slack_signing_secret || '');
        setAllowedChannels(data.allowed_channels || []);
        setTriggerWords(data.trigger_words?.length ? data.trigger_words : DEFAULT_TRIGGER_WORDS);
        setTriggerReactions(
          data.trigger_reactions?.length ? data.trigger_reactions : DEFAULT_TRIGGER_REACTIONS
        );
        setDefaultPriority(data.default_priority);

        const logsData = await integrationService.getWebhookLogs('slack', 10);
        setLogs(logsData);
      }
    } catch (error) {
      console.error('Failed to load Slack integration:', error);
      toast.error('Failed to load Slack integration settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable = async () => {
    const data = await integrationService.enableSlackIntegration({
      slack_signing_secret: slackSigningSecret || undefined,
      allowed_channels: allowedChannels,
      trigger_words: triggerWords,
      default_priority: defaultPriority,
    });
    setIntegration(data);
  };

  const handleDisable = async () => {
    await integrationService.disableSlackIntegration();
    setIntegration((prev) => (prev ? { ...prev, is_enabled: false } : null));
  };

  const handleRegenerateSecret = async () => {
    const newSecret = await integrationService.regenerateWebhookSecret('slack');
    setIntegration((prev) => (prev ? { ...prev, webhook_secret: newSecret } : null));
  };

  const handleTestWebhook = async () => {
    if (!integration) return { success: false, message: 'No integration found' };
    return integrationService.testWebhook('slack', integration.webhook_secret);
  };

  const handleSaveSettings = async () => {
    try {
      await integrationService.updateSlackIntegration({
        slack_signing_secret: slackSigningSecret || null,
        allowed_channels: allowedChannels,
        trigger_words: triggerWords,
        trigger_reactions: triggerReactions,
        default_priority: defaultPriority,
      });
      toast.success('Settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const addChannel = () => {
    if (newChannel && !allowedChannels.includes(newChannel)) {
      setAllowedChannels([...allowedChannels, newChannel]);
      setNewChannel('');
    }
  };

  const removeChannel = (channel: string) => {
    setAllowedChannels(allowedChannels.filter((c) => c !== channel));
  };

  const addTriggerWord = () => {
    if (newTriggerWord && !triggerWords.includes(newTriggerWord.toLowerCase())) {
      setTriggerWords([...triggerWords, newTriggerWord.toLowerCase()]);
      setNewTriggerWord('');
    }
  };

  const removeTriggerWord = (word: string) => {
    setTriggerWords(triggerWords.filter((w) => w !== word));
  };

  const addReaction = () => {
    if (newReaction && !triggerReactions.includes(newReaction.toLowerCase())) {
      setTriggerReactions([...triggerReactions, newReaction.toLowerCase()]);
      setNewReaction('');
    }
  };

  const removeReaction = (reaction: string) => {
    setTriggerReactions(triggerReactions.filter((r) => r !== reaction));
  };

  const webhookUrl = integration
    ? integrationService.getSlackWebhookUrl(integration.webhook_secret)
    : '';

  return (
    <IntegrationCard
      name="Slack"
      description="Create tasks from Slack messages"
      icon={<SlackLogo />}
      iconBgColor="rgba(74, 21, 75, 0.9)"
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
          <h4 className="font-medium">How to set up Slack Events:</h4>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              Go to{' '}
              <a
                href="https://api.slack.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Slack API Apps <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              Click <strong>&quot;Create New App&quot;</strong> &gt; <strong>&quot;From scratch&quot;</strong>
            </li>
            <li>Give it a name (e.g., &quot;VibeTasks&quot;) and select your workspace</li>
            <li>
              Go to <strong>Event Subscriptions</strong> and enable it
            </li>
            <li>
              Paste your <strong>Request URL</strong> (webhook URL above)
            </li>
            <li>
              Under <strong>Subscribe to bot events</strong>, add:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>message.channels</li>
                <li>message.groups (for private channels)</li>
                <li>reaction_added (optional, for emoji triggers)</li>
              </ul>
            </li>
            <li>
              Go to <strong>OAuth & Permissions</strong> and add scopes:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>channels:history</li>
                <li>groups:history</li>
                <li>reactions:read (if using reaction triggers)</li>
              </ul>
            </li>
            <li>
              Install the app to your workspace via <strong>Install App</strong>
            </li>
            <li>
              (Optional) Copy the <strong>Signing Secret</strong> from Basic Information and add it
              to Advanced Settings for verification
            </li>
          </ol>
          <p className="text-xs text-muted-foreground mt-2">
            Messages containing trigger words (like &quot;feedback&quot;, &quot;bug&quot;) will automatically create
            tasks.
          </p>
        </div>
      }
      advancedSettings={
        <>
          {/* Slack Signing Secret */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Slack Signing Secret (optional):
            </label>
            <Input
              type="password"
              value={slackSigningSecret}
              onChange={(e) => setSlackSigningSecret(e.target.value)}
              placeholder="Found in Slack App > Basic Information"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enables request signature verification for added security.
            </p>
          </div>

          {/* Allowed Channels */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Allowed Channels (leave empty for all):
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                placeholder="Channel ID (e.g., C01234567)"
                onKeyDown={(e) => e.key === 'Enter' && addChannel()}
              />
              <button
                onClick={addChannel}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allowedChannels.map((channel) => (
                <Badge key={channel} variant="secondary" className="gap-1">
                  #{channel}
                  <button onClick={() => removeChannel(channel)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {allowedChannels.length === 0 && (
                <span className="text-xs text-muted-foreground">All channels (no filter)</span>
              )}
            </div>
          </div>

          {/* Trigger Words */}
          <div>
            <label className="text-sm font-medium mb-2 block">Trigger Words:</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTriggerWord}
                onChange={(e) => setNewTriggerWord(e.target.value)}
                placeholder="Add a trigger word"
                onKeyDown={(e) => e.key === 'Enter' && addTriggerWord()}
              />
              <button
                onClick={addTriggerWord}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {triggerWords.map((word) => (
                <Badge key={word} variant="secondary" className="gap-1">
                  {word}
                  <button onClick={() => removeTriggerWord(word)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Messages containing these words will create tasks.
            </p>
          </div>

          {/* Trigger Reactions */}
          <div>
            <label className="text-sm font-medium mb-2 block">Trigger Emoji Reactions:</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newReaction}
                onChange={(e) => setNewReaction(e.target.value)}
                placeholder="Emoji name without colons (e.g., eyes)"
                onKeyDown={(e) => e.key === 'Enter' && addReaction()}
              />
              <button
                onClick={addReaction}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {triggerReactions.map((reaction) => (
                <Badge key={reaction} variant="secondary" className="gap-1">
                  :{reaction}:
                  <button onClick={() => removeReaction(reaction)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Add these reactions to messages to create tasks.
            </p>
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
              Messages containing &quot;bug&quot; or &quot;error&quot; will get high priority automatically.
            </p>
          </div>
        </>
      }
      disabledInfo={
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">What this integration does:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Creates VibeTasks tasks from Slack messages</li>
            <li>Triggers on specific keywords or emoji reactions</li>
            <li>Can filter by specific channels</li>
            <li>Classifies messages as bugs or feedback</li>
            <li>Includes message content and link back to Slack</li>
          </ul>
        </div>
      }
    />
  );
}
