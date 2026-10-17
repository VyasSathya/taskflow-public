/**
 * Share Intent Handler Component
 * 
 * Place this in your root layout to handle incoming share intents.
 * When content is shared to the app, it automatically navigates to
 * the share handler screen.
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';

interface ShareIntentHandlerProps {
  /**
   * Whether to auto-navigate to the share handler screen
   * @default true
   */
  autoNavigate?: boolean;
}

export function ShareIntentHandler({ autoNavigate = true }: ShareIntentHandlerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasShareIntent, shareIntent } = useShareIntentContext();

  useEffect(() => {
    // Only navigate if we have a share intent and we're not already on the share handler
    if (hasShareIntent && shareIntent && autoNavigate && pathname !== '/share-handler') {
      // Small delay to ensure the app is fully mounted
      const timer = setTimeout(() => {
        router.push('/share-handler');
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [hasShareIntent, shareIntent, autoNavigate, pathname, router]);

  // This component doesn't render anything
  return null;
}

export default ShareIntentHandler;
