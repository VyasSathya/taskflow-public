/**
 * Onboarding Page
 * First-time setup for AI integration
 */

'use client';

import { useRouter } from 'next/navigation';
import { AISetupCard } from '@/components/onboarding/AISetupCard';
import { useAppStore } from '@/lib/stores/app-store';
import { SPACING } from '@/lib/styles/constants';

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);

  const handleComplete = () => {
    completeOnboarding();
    router.push('/dashboard');
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-background via-background to-purple-500/5 flex items-center justify-center ${SPACING.page.all}`}>
      <div className={`${SPACING.container.sm} w-full`}>
        <AISetupCard 
          variant="full" 
          showCompleteButton={true} 
          onComplete={handleComplete} 
        />
      </div>
    </div>
  );
}
