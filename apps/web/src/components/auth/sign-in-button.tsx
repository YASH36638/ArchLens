'use client';

import { useState } from 'react';
import { Github, Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/constants';

interface Props extends Omit<ButtonProps, 'onClick'> {
  callbackUrl?: string;
  label?: string;
  /** When false, omits data-testid (use for duplicate CTAs on the same page). */
  exposeTestId?: boolean;
}

export function SignInWithGitHubButton({
  size = 'default',
  variant = 'default',
  disabled,
  label,
  exposeTestId = true,
  ...rest
}: Props) {
  const href = `${API_BASE_URL}/auth/github`;
  const [isRedirecting, setIsRedirecting] = useState(false);

  return (
    <Button
      {...(exposeTestId ? { 'data-testid': 'sign-in-github' } : {})}
      size={size}
      variant={variant}
      disabled={isRedirecting || disabled}
      aria-busy={isRedirecting}
      {...rest}
      onClick={() => {
        setIsRedirecting(true);
        window.location.href = href;
      }}
    >
      {isRedirecting ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Github className="h-4 w-4" aria-hidden="true" />
      )}
      {isRedirecting ? 'Opening GitHub…' : (label ?? 'Sign in with GitHub')}
    </Button>
  );
}
