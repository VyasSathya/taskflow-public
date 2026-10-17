/**
 * AISetupCard Component (Mobile)
 * Clean, simple AI setup instructions
 */

import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { AI_SETUP_CONTENT } from '@vibetasks/shared';

interface AISetupCardProps {
  variant?: 'card' | 'full';
  onComplete?: () => void;
  showCompleteButton?: boolean;
}

export function AISetupCard({ variant = 'card', onComplete, showCompleteButton = false }: AISetupCardProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [showDetails, setShowDetails] = useState(false);

  const copyToClipboard = async (text: string, key: string) => {
    await Clipboard.setStringAsync(text);
    haptics.selection();
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    Alert.alert('Copied!', 'Paste this to your AI');
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
          <Ionicons name="flash" size={20} color="#FFFFFF" />
        </View>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>AI Setup</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>2 prompts, 2 minutes</Text>
        </View>
      </View>

      {/* Step 1 */}
      <View style={[styles.stepCard, { backgroundColor: colors.success + '08', borderColor: colors.success + '30' }]}>
        <View style={styles.stepHeader}>
          <View style={styles.stepLeft}>
            <View style={[styles.stepNumber, { backgroundColor: colors.success }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Install VibeTasks</Text>
          </View>
          <TouchableOpacity
            onPress={() => copyToClipboard(AI_SETUP_CONTENT.installPrompt, 'install')}
            style={[styles.copyButton, { backgroundColor: colors.success }]}
          >
            <Ionicons name={copiedStates['install'] ? 'checkmark' : 'copy-outline'} size={14} color="#FFFFFF" />
            <Text style={styles.copyButtonText}>{copiedStates['install'] ? 'Copied!' : 'Copy'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
          Paste to your AI - installs CLI & configures MCP
        </Text>
      </View>

      {/* Step 2 */}
      <View style={[styles.stepCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '30' }]}>
        <View style={styles.stepHeader}>
          <View style={styles.stepLeft}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Add to CLAUDE.md</Text>
          </View>
          <TouchableOpacity
            onPress={() => copyToClipboard(AI_SETUP_CONTENT.claudeMdPrompt, 'claude-md')}
            style={[styles.copyButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name={copiedStates['claude-md'] ? 'checkmark' : 'copy-outline'} size={14} color="#FFFFFF" />
            <Text style={styles.copyButtonText}>{copiedStates['claude-md'] ? 'Copied!' : 'Copy'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
          Paste to your AI - adds instructions to your project
        </Text>
      </View>

      {/* Status Flow */}
      <View style={[styles.flowRow, { backgroundColor: colors.surface }]}>
        <View style={[styles.statusBadge, { backgroundColor: colors.info + '20' }]}>
          <Text style={[styles.statusText, { color: colors.info }]}>todo</Text>
        </View>
        <Text style={[styles.arrow, { color: colors.textTertiary }]}>→</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.statusText, { color: colors.primary }]}>vibing</Text>
        </View>
        <Text style={[styles.arrow, { color: colors.textTertiary }]}>→</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
          <Text style={[styles.statusText, { color: colors.success }]}>done</Text>
        </View>
      </View>

      {/* What you get */}
      <View style={styles.benefitsList}>
        <Text style={[styles.benefitsLabel, { color: colors.textSecondary }]}>After setup, your AI will:</Text>
        <Text style={[styles.benefitItem, { color: colors.textSecondary }]}>• Track tasks across sessions</Text>
        <Text style={[styles.benefitItem, { color: colors.textSecondary }]}>• Remember where you left off</Text>
        <Text style={[styles.benefitItem, { color: colors.textSecondary }]}>• View attached images</Text>
      </View>

      {/* Toggle Details */}
      <TouchableOpacity 
        onPress={() => setShowDetails(!showDetails)} 
        style={styles.toggleButton}
      >
        <Ionicons 
          name={showDetails ? 'chevron-down' : 'chevron-forward'} 
          size={14} 
          color={colors.textTertiary} 
        />
        <Text style={[styles.toggleText, { color: colors.textTertiary }]}>
          {showDetails ? 'Hide details' : 'Show examples & tips'}
        </Text>
      </TouchableOpacity>

      {showDetails && (
        <View style={[styles.detailsSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.detailsNote, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: '600' }}>New project?</Text> Just copy step 2 to that project's CLAUDE.md.
          </Text>
        </View>
      )}

      {/* Complete Button */}
      {showCompleteButton && onComplete && (
        <TouchableOpacity
          onPress={onComplete}
          style={[styles.completeButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.completeButtonText}>Done - Let's go!</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: tokens.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
  stepCard: {
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.xs,
  },
  stepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepDesc: {
    fontSize: 12,
    marginLeft: 30,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  statusBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 12,
  },
  benefitsList: {
    marginBottom: tokens.spacing.md,
  },
  benefitsLabel: {
    fontSize: 13,
    marginBottom: tokens.spacing.xs,
  },
  benefitItem: {
    fontSize: 12,
    marginLeft: tokens.spacing.xs,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleText: {
    fontSize: 12,
  },
  detailsSection: {
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
    borderTopWidth: 1,
  },
  detailsNote: {
    fontSize: 12,
    lineHeight: 18,
  },
  completeButton: {
    marginTop: tokens.spacing.lg,
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
