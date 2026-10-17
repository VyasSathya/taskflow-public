import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper } from '@/components/common';
import { Button, Card } from '@/components/ui';
import { FadeIn, ScaleIn } from '@/components/animations';
import { AISetupCard } from '@/components/onboarding/AISetupCard';
import { useTheme, useHaptics } from '@/lib/hooks';
import { useAppStore, useAuthStore } from '@/lib/stores';
import { notificationService, analytics } from '@/lib/services';
import { tokens, semanticColors, iconSizes } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  action?: () => Promise<void>;
  actionLabel?: string;
  skippable?: boolean;
}

export default function SetupWizardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const haptics = useHaptics();

  const {
    setupStep,
    totalSetupSteps,
    nextSetupStep,
    previousSetupStep,
    setNotificationsEnabled,
    setOnboarded,
    setSetupStep,
  } = useAppStore();

  const { completeSetup } = useAuthStore();

  const steps: SetupStep[] = [
    {
      id: 'welcome',
      title: 'Welcome!',
      description: "Let's get you set up. This will only take a moment.",
      icon: 'hand-right-outline',
    },
    {
      id: 'ai-setup',
      title: 'AI Setup',
      description: 'Connect VibeTasks to your AI coding assistant.',
      icon: 'flash-outline',
      skippable: true,
    },
    {
      id: 'notifications',
      title: 'Stay Updated',
      description: 'Enable notifications to get important updates and reminders.',
      icon: 'notifications-outline',
      action: async () => {
        const granted = await notificationService.requestPermission();
        setNotificationsEnabled(granted);
      },
      actionLabel: 'Enable Notifications',
      skippable: true,
    },
    {
      id: 'complete',
      title: "You're All Set!",
      description: 'Start exploring and make the most of your experience.',
      icon: 'checkmark-circle-outline',
    },
  ];

  const currentStep = steps[setupStep] || steps[0];
  const isFirstStep = setupStep === 0;
  const isLastStep = setupStep === steps.length - 1;

  const handleNext = async () => {
    haptics.light();
    analytics.trackOnboardingStep(setupStep, currentStep.id);

    if (isLastStep) {
      analytics.trackOnboardingComplete();
      completeSetup();
      setOnboarded(true);
      setSetupStep(0); // Reset setup step for next time
      router.replace('/(tabs)');
    } else {
      nextSetupStep();
    }
  };

  const handleBack = () => {
    haptics.light();
    previousSetupStep();
  };

  const handleAction = async () => {
    haptics.medium();
    if (currentStep.action) {
      await currentStep.action();
    }
    handleNext();
  };

  const handleSkip = () => {
    haptics.selection();
    handleNext();
  };

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    index <= setupStep ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Content */}
        {currentStep.id === 'ai-setup' ? (
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <AISetupCard variant="full" />
          </ScrollView>
        ) : (
          <View style={styles.content}>
            <ScaleIn key={setupStep}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.primary + '20' },
                ]}
              >
                <Ionicons
                  name={currentStep.icon}
                  size={64}
                  color={colors.primary}
                />
              </View>
            </ScaleIn>

            <FadeIn key={`title-${setupStep}`} delay={100}>
              <Text style={[styles.title, { color: colors.text }]}>
                {currentStep.title}
              </Text>
            </FadeIn>

            <FadeIn key={`desc-${setupStep}`} delay={200}>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {currentStep.description}
              </Text>
            </FadeIn>
          </View>
        )}

        {/* Actions */}
        <FadeIn delay={300}>
          <View style={styles.actions}>
            {currentStep.action && (
              <Button
                title={currentStep.actionLabel || 'Continue'}
                onPress={handleAction}
                fullWidth
                style={styles.actionButton}
              />
            )}

            {currentStep.skippable && (
              <Button
                title="Skip for now"
                onPress={handleSkip}
                variant="ghost"
                fullWidth
              />
            )}

            {!currentStep.action && (
              <Button
                title={isLastStep ? 'Get Started' : 'Continue'}
                onPress={handleNext}
                fullWidth
              />
            )}

            {!isFirstStep && !isLastStep && (
              <Button
                title="Back"
                onPress={handleBack}
                variant="ghost"
                fullWidth
                style={styles.backButton}
              />
            )}
          </View>
        </FadeIn>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: tokens.spacing.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
  },
  scrollContent: {
    flex: 1,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: tokens.spacing.md,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    gap: tokens.spacing.sm,
  },
  actionButton: {
    marginBottom: tokens.spacing.sm,
  },
  backButton: {
    marginTop: tokens.spacing.xs,
  },
});
