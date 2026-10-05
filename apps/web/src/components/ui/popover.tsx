'use client';

import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';

interface PopoverProps {
  trigger: ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
  contentLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({
  trigger,
  children,
  align = 'start',
  className,
  contentLabel,
  open: controlledOpen,
  onOpenChange,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const triggerRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateOpen = (value: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(value);
    onOpenChange?.(value);
  };

  const updatePosition = () => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const contentWidth = contentRef.current?.offsetWidth ?? 288;
    let left = align === 'end' ? rect.right - contentWidth : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - contentWidth - 8));
    const top = rect.bottom + 8;

    setStyle({ top, left, position: 'fixed', width: contentRef.current?.offsetWidth });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, align, children]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      const inTrigger = triggerRef.current?.contains(target) ?? false;
      const inContent = contentRef.current?.contains(target) ?? false;
      if (!inTrigger && !inContent) updateOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        updateOpen(false);
        triggerRef.current?.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const enhancedTrigger = cloneElement(trigger, {
    'aria-expanded': open,
    'aria-controls': contentId,
    'aria-haspopup': 'dialog',
    onClick: (event) => {
      trigger.props.onClick?.(event);
      if (!event.defaultPrevented) updateOpen(!open);
    },
  });

  const content = open ? (
    <div
      ref={contentRef}
      id={contentId}
      role="dialog"
      aria-label={contentLabel}
      style={style}
      className={cn(
        'fixed z-[120] w-64 rounded-lg border border-border bg-card p-4 text-body text-foreground shadow-md menu-surface',
        className
      )}
    >
      {children}
    </div>
  ) : null;

  return (
    <>
      <span ref={triggerRef} className="inline-flex">
        {enhancedTrigger}
      </span>
      {mounted && content ? createPortal(content, document.body) : null}
    </>
  );
}
