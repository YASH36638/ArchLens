'use client';

import { cn } from '@/lib/utils/cn';
import { useTheme } from '@/providers/theme-provider';

const OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;

export function AccountThemeControl() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex w-fit gap-0.5 rounded-md border border-border bg-muted/50 p-0.5"
      role="radiogroup"
      aria-label="Appearance"
    >
      {OPTIONS.map((option) => {
        const selected = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(option.value)}
            className={cn(
              'inline-flex min-h-9 items-center rounded-md px-3 text-navigation transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'bg-card font-semibold text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
