'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils/cn';

interface DropdownMenuProps {
  trigger: ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

export function DropdownMenu({ trigger, children, align = 'end', className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    });
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])'
      ) ?? []
    );
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (current + 1 + items.length) % items.length
            : (current - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  const enhancedTrigger = cloneElement(trigger, {
    'aria-expanded': open,
    'aria-controls': menuId,
    'aria-haspopup': 'menu',
    onClick: (event) => {
      trigger.props.onClick?.(event);
      if (!event.defaultPrevented) setOpen((value) => !value);
    },
  });

  return (
    <div ref={rootRef} className="relative inline-flex">
      {enhancedTrigger}
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          onKeyDown={moveFocus}
          className={cn(
            'absolute top-full z-50 mt-2 min-w-56 rounded-md border border-border bg-card p-1.5 text-foreground shadow-md menu-surface',
            align === 'end' ? 'right-0' : 'left-0',
            className
          )}
        >
          {Children.map(children, (child) =>
            isValidElement(child)
              ? cloneElement(child, {
                  onSelect: () => {
                    const props = child.props as { onSelect?: () => void };
                    props.onSelect?.();
                    setOpen(false);
                  },
                } as never)
              : child
          )}
        </div>
      ) : null}
    </div>
  );
}

interface DropdownMenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onSelect?: () => void;
  inset?: boolean;
}

export function DropdownMenuItem({
  className,
  children,
  onClick,
  onSelect,
  inset,
  ...props
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex min-h-9 w-full items-center gap-2 rounded-md px-3 text-left text-button text-foreground outline-none transition-colors duration-[120ms] ease-out hover:bg-muted focus:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        inset && 'pl-9',
        className
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onSelect?.();
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-3 py-2 text-metadata font-medium', className)} {...props} />;
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div role="separator" className={cn('my-1 h-px bg-border', className)} />;
}
