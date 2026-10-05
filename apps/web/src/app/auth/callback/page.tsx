'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

function SigningInState() {
  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground">
      <Card className="w-full max-w-md rounded-2xl shadow-sm">
        <CardContent
          className="flex flex-col items-center gap-4 py-10 text-center sm:py-12"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-6 w-6 animate-spin text-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">Signing you in</p>
            <p className="text-body text-muted-foreground">
              Verifying your GitHub account. This should only take a moment.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (!accessToken || !refreshToken) {
      router.replace('/login?error=missing-tokens');
      return;
    }

    void (async () => {
      try {
        const result = await signIn('archlens-tokens', {
          accessToken,
          refreshToken,
          redirect: false,
        });

        if (result?.ok) {
          router.replace('/projects');
          return;
        }

        router.replace(`/login?error=${encodeURIComponent(result?.error ?? 'signin-failed')}`);
      } catch {
        router.replace('/login?error=signin-failed');
      }
    })();
  }, [params, router]);

  return <SigningInState />;
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<SigningInState />}>
      <CallbackInner />
    </Suspense>
  );
}
