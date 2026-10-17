/**
 * InboxStats - Quick stats cards showing counts by category
 * Displays errors, feedback, and source counts
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { useTheme } from '@/lib/hooks';
import { tokens, semanticColors } from '@/lib/theme';

interface InboxCounts {
  total: number;
  errors: number;
  feedback: number;
  github: number;
  email: number;
  slack: number;
  sentry: number;
}

interface InboxStatsProps {
  counts: InboxCounts;
}

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  color: string;
  delay: number;
}

function StatCard({ icon, label, count, color, delay }: StatCardProps) {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeInRight.delay(delay).duration(300)}
      style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statCount, { color: colors.text }]}>{count}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Animated.View>
  );
}

export function InboxStats({ counts }: InboxStatsProps) {
  const stats = [
    { icon: 'alert-circle' as const, label: 'Errors', count: counts.errors, color: semanticColors.error },
    { icon: 'chatbubble-ellipses' as const, label: 'Feedback', count: counts.feedback, color: semanticColors.info },
    { icon: 'logo-github' as const, label: 'GitHub', count: counts.github, color: semanticColors.priorityNone },
    { icon: 'mail' as const, label: 'Email', count: counts.email, color: semanticColors.vibing },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {stats.map((stat, index) => (
        <StatCard
          key={stat.label}
          icon={stat.icon}
          label={stat.label}
          count={stat.count}
          color={stat.color}
          delay={index * 50}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  statCard: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.xs,
  },
  statCount: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default InboxStats;
