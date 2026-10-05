import { cn } from '@/lib/utils/cn';

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
] as const;

function colorForOwner(owner: string): string {
  let hash = 0;
  for (let i = 0; i < owner.length; i++) {
    hash = owner.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

interface OwnerAvatarProps {
  owner: string;
  className?: string;
}

export function OwnerAvatar({ owner, className }: OwnerAvatarProps) {
  const initial = owner.trim().charAt(0).toUpperCase() || '?';

  return (
    <span
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold uppercase ring-1 ring-border/60',
        colorForOwner(owner),
        className
      )}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
