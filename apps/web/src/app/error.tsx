'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg rounded-2xl">
        <CardHeader>
          <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-risk/10 text-risk">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <CardTitle className="text-section-title">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-body text-muted-foreground">
            Archlens could not complete this request. Your data is safe; try loading the page again.
          </p>
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
