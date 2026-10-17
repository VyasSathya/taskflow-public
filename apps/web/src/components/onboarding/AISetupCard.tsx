/**
 * AISetupCard Component
 * Clean, simple AI setup instructions
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Copy, Check, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { AI_SETUP_CONTENT } from '@vibetasks/shared';
import { COLORS, SPACING } from '@/lib/styles/constants';

interface AISetupCardProps {
  variant?: 'card' | 'full';
  onComplete?: () => void;
  showCompleteButton?: boolean;
}

export function AISetupCard({ variant = 'card', onComplete, showCompleteButton = false }: AISetupCardProps) {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [showDetails, setShowDetails] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">AI Setup</h2>
          <p className="text-sm text-muted-foreground">2 prompts, 2 minutes</p>
        </div>
      </div>

      {/* Two Steps - Clean Cards */}
      <div className="space-y-3">
        {/* Step 1 */}
        <div className={`p-4 ${COLORS.semantic.success.bg} ${COLORS.semantic.success.border} border rounded-lg`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">1</span>
              <span className="font-medium text-sm">Install VibeTasks</span>
            </div>
            <button
              onClick={() => copyToClipboard(AI_SETUP_CONTENT.installPrompt, 'install')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-md transition-colors"
            >
              {copiedStates['install'] ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedStates['install'] ? 'Copied!' : 'Copy prompt'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Paste this to your AI - it installs the CLI and configures MCP</p>
        </div>

        {/* Step 2 */}
        <div className={`p-4 ${COLORS.semantic.purple.bg} ${COLORS.semantic.purple.border} border rounded-lg`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center">2</span>
              <span className="font-medium text-sm">Add to CLAUDE.md</span>
            </div>
            <button
              onClick={() => copyToClipboard(AI_SETUP_CONTENT.claudeMdPrompt, 'claude-md')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded-md transition-colors"
            >
              {copiedStates['claude-md'] ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedStates['claude-md'] ? 'Copied!' : 'Copy prompt'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Paste this to your AI - it adds VibeTasks instructions to your project</p>
        </div>
      </div>

      {/* Status Flow - Compact */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-muted/30 rounded-lg">
        <span className="px-2.5 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium rounded">todo</span>
        <span className="text-muted-foreground">→</span>
        <span className="px-2.5 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-medium rounded">vibing</span>
        <span className="text-muted-foreground">→</span>
        <span className="px-2.5 py-1 bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium rounded">done</span>
        <span className="text-xs text-muted-foreground ml-2">(max 3 vibing)</span>
      </div>

      {/* What you get - Simple list */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>After setup, your AI will:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>Track tasks that persist across sessions</li>
          <li>Remember where you left off</li>
          <li>View images you attach to tasks</li>
        </ul>
      </div>

      {/* Expandable Details */}
      <button 
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showDetails ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {showDetails ? 'Hide details' : 'Show example commands & shortcuts'}
      </button>

      {showDetails && (
        <div className="space-y-4 pt-2 border-t">
          {/* Example Commands */}
          <div>
            <p className="text-xs font-medium mb-2">Example commands:</p>
            <div className="grid gap-1.5 text-xs">
              {AI_SETUP_CONTENT.exampleCommands.map((cmd: { title: string; example: string }, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{cmd.title}:</span>
                  <code className="text-primary">{cmd.example}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <p className="text-xs font-medium mb-2">Keyboard shortcuts:</p>
            <div className="flex flex-wrap gap-3 text-xs">
              {AI_SETUP_CONTENT.keyboardShortcuts.map((s: { label: string; key: string }, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">{s.key}</kbd>
                  <span className="text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New Project Note */}
          <p className="text-xs text-muted-foreground">
            <strong>New project?</strong> Just copy step 2 to that project's CLAUDE.md.
          </p>
        </div>
      )}

      {/* Complete Button */}
      {showCompleteButton && onComplete && (
        <button
          onClick={onComplete}
          className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
        >
          Done - Let's go!
        </button>
      )}
    </div>
  );

  if (variant === 'full') {
    return <div className="max-w-lg mx-auto p-6">{content}</div>;
  }

  return (
    <Card className="p-5">
      {content}
    </Card>
  );
}
