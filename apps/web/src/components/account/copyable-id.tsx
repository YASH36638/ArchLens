'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyableIdProps {
  value: string;
}

export function CopyableId({ value }: CopyableIdProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="break-all font-mono text-metadata text-foreground"
        data-testid="account-user-id"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={copied ? 'User ID copied' : 'Copy user ID'}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
