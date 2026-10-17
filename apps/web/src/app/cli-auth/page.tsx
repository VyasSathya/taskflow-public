/**
 * CLI/Extension Authentication Page
 * Handles browser-based authentication for VibeTasks CLI and Browser Extension
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function CliAuthContent() {
  const [status, setStatus] = useState<'checking' | 'redirecting' | 'extension-ready' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Check if this is from browser extension
        const source = searchParams.get('source');
        const isExtension = source === 'extension';
        
        // Get port from query params (CLI only)
        const port = searchParams.get('port');
        
        if (!port && !isExtension) {
          setErrorMessage('Missing port parameter');
          setStatus('error');
          return;
        }

        // Wait for auth to initialize
        if (isLoading) {
          return;
        }

        // If not authenticated, redirect to login
        if (!isAuthenticated || !session) {
          const returnUrl = isExtension 
            ? '/cli-auth?source=extension'
            : `/cli-auth?port=${port}`;
          router.push(`/login?return=${encodeURIComponent(returnUrl)}`);
          return;
        }

        // User is authenticated, get session
        const supabase = createClient();
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!currentSession) {
          setErrorMessage('No active session');
          setStatus('error');
          return;
        }

        // Handle browser extension auth
        if (isExtension) {
          setStatus('extension-ready');
          
          // Send tokens to extension via postMessage
          // Extension should be listening for this
          window.postMessage({
            type: 'VIBETASKS_AUTH',
            accessToken: currentSession.access_token,
            refreshToken: currentSession.refresh_token,
            user: {
              id: currentSession.user.id,
              email: currentSession.user.email,
            },
          }, '*');
          
          return;
        }

        // Handle CLI auth
        setStatus('redirecting');

        // Get Supabase config from env
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        // Construct callback URL with tokens
        const callbackUrl = new URL(`http://localhost:${port}/callback`);
        callbackUrl.searchParams.set('access_token', currentSession.access_token);
        callbackUrl.searchParams.set('refresh_token', currentSession.refresh_token);
        callbackUrl.searchParams.set('email', currentSession.user.email || '');
        callbackUrl.searchParams.set('supabase_url', supabaseUrl);
        callbackUrl.searchParams.set('supabase_key', supabaseKey);

        // Redirect to CLI callback
        window.location.href = callbackUrl.toString();
      } catch (error: any) {
        console.error('CLI auth error:', error);
        setErrorMessage(error.message || 'Authentication failed');
        setStatus('error');
      }
    };

    handleAuth();
  }, [isLoading, isAuthenticated, session, searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          {status === 'checking' && (
            <>
              <div className="mb-4">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              </div>
              <h1 className="text-2xl font-bold">Checking authentication...</h1>
              <p className="mt-2 text-muted-foreground">
                Connecting VibeTasks CLI to your account
              </p>
            </>
          )}

{status === 'redirecting' && (
            <>
              <div className="mb-4 text-4xl">&#10003;</div>
              <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">
                Authentication Successful!
              </h1>
              <p className="mt-2 text-muted-foreground">
                Redirecting to CLI...
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                You can close this window if it doesn&apos;t close automatically.
              </p>
            </>
          )}

          {status === 'extension-ready' && (
            <>
              <div className="mb-4 text-4xl">&#10003;</div>
              <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">
                Extension Connected!
              </h1>
              <p className="mt-2 text-muted-foreground">
                VibeTasks browser extension is now authenticated.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => window.close()}
                  className="w-full"
                  id="extension-auth-complete"
                  data-access-token=""
                >
                  Close This Tab
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                You can now right-click errors in DevTools Console to send them to VibeTasks!
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-4 text-4xl">❌</div>
              <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">
                Authentication Failed
              </h1>
              <p className="mt-2 text-muted-foreground">
                {errorMessage || 'An error occurred during authentication'}
              </p>
              <div className="mt-6 space-y-2">
                <Button
                  onClick={() => window.close()}
                  variant="outline"
                  className="w-full"
                >
                  Close Window
                </Button>
                <Button
                  onClick={() => router.push('/login')}
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function CliAuthFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          </div>
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </Card>
    </div>
  );
}

export default function CliAuthPage() {
  return (
    <Suspense fallback={<CliAuthFallback />}>
      <CliAuthContent />
    </Suspense>
  );
}
