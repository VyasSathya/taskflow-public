/**
 * Integration Card - Reusable base component for integration settings
 */

'use client';

import { useState, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity,
  Settings2,
  Info,
  Play,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { WebhookLog } from '@/lib/services/integration-service';
import { COLORS, LOADING, STAT_CARD } from '@/lib/styles/constants';

export interface IntegrationCardProps {
  // Basic Info
  name: string;
  description: string;
  icon: ReactNode;
  iconBgColor: string;
  
  // State
  isEnabled: boolean;
  isLoading: boolean;
  tasksCreated: number;
  lastWebhookAt: string | null;
  webhookUrl: string;
  logs: WebhookLog[];
  
  // Actions
  onEnable: () => Promise<void>;
  onDisable: () => Promise<void>;
  onRegenerateSecret: () => Promise<void>;
  onTestWebhook: () => Promise<{ success: boolean; message: string }>;
  onSaveSettings?: () => Promise<void>;
  
  // Setup
  setupInstructions: ReactNode;
  advancedSettings?: ReactNode;
  disabledInfo?: ReactNode;
  
  // Children for custom content
  children?: ReactNode;
}

export function IntegrationCard({
  name,
  description,
  icon,
  iconBgColor,
  isEnabled,
  isLoading,
  tasksCreated,
  lastWebhookAt,
  webhookUrl,
  logs,
  onEnable,
  onDisable,
  onRegenerateSecret,
  onTestWebhook,
  onSaveSettings,
  setupInstructions,
  advancedSettings,
  disabledInfo,
  children,
}: IntegrationCardProps) {
  const [isEnabling, setIsEnabling] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const handleEnable = async () => {
    try {
      setIsEnabling(true);
      await onEnable();
      setShowSetupInstructions(true);
      toast.success(`${name} integration enabled!`);
    } catch (error) {
      console.error(`Failed to enable ${name} integration:`, error);
      toast.error(`Failed to enable ${name} integration`);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisable = async () => {
    try {
      await onDisable();
      toast.success(`${name} integration disabled`);
    } catch (error) {
      console.error(`Failed to disable ${name} integration:`, error);
      toast.error(`Failed to disable ${name} integration`);
    }
  };

  const handleRegenerateSecret = async () => {
    try {
      await onRegenerateSecret();
      setShowRegenerateConfirm(false);
      toast.success('Webhook secret regenerated');
    } catch (error) {
      console.error('Failed to regenerate secret:', error);
      toast.error('Failed to regenerate webhook secret');
    }
  };

  const handleCopyWebhookUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success('Webhook URL copied to clipboard');
  };

  const handleTestWebhook = async () => {
    try {
      setIsTesting(true);
      const result = await onTestWebhook();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Failed to test webhook');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 animate-pulse">
          <div className={`h-10 w-10 ${LOADING.skeleton} rounded-lg`} />
          <div className="flex-1">
            <div className={`h-5 w-32 ${LOADING.skeleton} mb-2`} />
            <div className={`h-4 w-48 ${LOADING.skeleton}`} />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: iconBgColor }}
            >
              {icon}
            </div>
            <div>
              <h3 className="font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          
          {isEnabled ? (
            <div className="flex items-center gap-2">
              <Badge variant="default" className={`${COLORS.semantic.success.bg} ${COLORS.semantic.success.text} ${COLORS.semantic.success.border} border`}>
                Active
              </Badge>
              <Button variant="outline" size="sm" onClick={handleDisable}>
                Disable
              </Button>
            </div>
          ) : (
            <Button onClick={handleEnable} disabled={isEnabling}>
              {isEnabling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : (
                'Enable'
              )}
            </Button>
          )}
        </div>

        {/* Integration Details (when enabled) */}
        {isEnabled && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className={STAT_CARD.container}>
                <p className={STAT_CARD.value}>{tasksCreated}</p>
                <p className="text-xs text-muted-foreground">Tasks created</p>
              </div>
              <div className={STAT_CARD.container}>
                <p className="text-sm font-medium">
                  {lastWebhookAt
                    ? new Date(lastWebhookAt).toLocaleDateString()
                    : 'Never'}
                </p>
                <p className="text-xs text-muted-foreground">Last webhook</p>
              </div>
            </div>

            {/* Webhook URL */}
            <div>
              <label className="text-sm font-medium mb-1 block">Webhook URL</label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyWebhookUrl}
                  title="Copy URL"
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowRegenerateConfirm(true)}
                  title="Regenerate secret"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleTestWebhook}
                  disabled={isTesting}
                  title="Test webhook"
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Custom content from parent */}
            {children}

            {/* Setup Instructions Toggle */}
            <button
              onClick={() => setShowSetupInstructions(!showSetupInstructions)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <Info className="h-4 w-4" />
              <span>Setup Instructions</span>
              {showSetupInstructions ? (
                <ChevronUp className="h-4 w-4 ml-auto" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-auto" />
              )}
            </button>

            {/* Setup Instructions */}
            {showSetupInstructions && (
              <div className="p-4 bg-muted/30 rounded-lg text-sm">
                {setupInstructions}
              </div>
            )}

            {/* Advanced Settings Toggle */}
            {advancedSettings && (
              <>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <Settings2 className="h-4 w-4" />
                  <span>Advanced Settings</span>
                  {showAdvanced ? (
                    <ChevronUp className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  )}
                </button>

                {/* Advanced Settings */}
                {showAdvanced && (
                  <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                    {advancedSettings}
                    {onSaveSettings && (
                      <Button onClick={onSaveSettings} className="w-full">
                        Save Settings
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Webhook Logs Toggle */}
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <Activity className="h-4 w-4" />
              <span>Recent Activity</span>
              {showLogs ? (
                <ChevronUp className="h-4 w-4 ml-auto" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-auto" />
              )}
            </button>

            {/* Webhook Logs */}
            {showLogs && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No webhook activity yet
                  </p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-lg text-sm ${
                        log.success ? COLORS.semantic.success.bg : COLORS.semantic.error.bg
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {log.action} ({log.resource})
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      {log.error_message && (
                        <p className={`text-xs ${COLORS.semantic.error.text} mt-1`}>{log.error_message}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Info when disabled */}
        {!isEnabled && disabledInfo && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg">{disabledInfo}</div>
        )}
      </Card>

      {/* Regenerate Secret Confirmation Dialog */}
      <Dialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Webhook Secret?</DialogTitle>
            <DialogDescription>
              This will invalidate your current webhook URL. You will need to update the webhook URL
              in {name} with the new one.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRegenerateSecret}>
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
