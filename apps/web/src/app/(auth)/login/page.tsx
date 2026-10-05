import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignInWithGitHubButton } from '@/components/auth/sign-in-button';

interface PageProps {
  searchParams?: { reauth?: string; error?: string };
}

function loginCopy(
  reauth: boolean,
  error: string | undefined
): { description: string; alert: string | null } {
  if (error === 'missing-tokens') {
    return {
      description: reauth
        ? 'Your session expired. Sign in again to continue.'
        : 'Connect your GitHub account to continue to Archlens.',
      alert: 'GitHub did not return sign-in credentials. Try again.',
    };
  }
  if (error) {
    return {
      description: reauth
        ? 'Your session expired. Sign in again to continue.'
        : 'Connect your GitHub account to continue to Archlens.',
      alert: 'GitHub sign-in failed. Try again.',
    };
  }
  return {
    description: reauth
      ? 'Your session expired. Sign in again to continue.'
      : 'Connect your GitHub account to continue to Archlens.',
    alert: null,
  };
}

export default function LoginPage({ searchParams }: PageProps) {
  const reauth = searchParams?.reauth === '1';
  const { description, alert } = loginCopy(reauth, searchParams?.error);

  return (
    <main className="dark relative flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground">
      <Card className="relative z-10 w-full max-w-md rounded-2xl shadow-sm">
        <CardHeader className="items-center pb-3 text-center sm:p-6 sm:pb-3">
          <Link
            href="/"
            className="mb-4 flex min-h-11 items-center justify-center rounded-lg"
          >
            <span className="font-brand text-[1.75rem] font-extrabold italic leading-none tracking-[-0.04em]">
              <span className="text-primary">Arch</span>
              <span className="text-foreground">lens</span>
            </span>
          </Link>
          <CardTitle className="text-2xl font-bold tracking-tight">Sign in to Archlens</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-stretch gap-4 sm:p-6 sm:pt-2">
          {alert ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-body text-destructive"
            >
              {alert}
            </div>
          ) : null}
          <SignInWithGitHubButton size="lg" className="w-full shadow-sm" />
          <p className="text-center text-metadata text-muted-foreground">
            Archlens requests repository read access through GitHub.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center justify-center rounded-lg text-button font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Back to home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
