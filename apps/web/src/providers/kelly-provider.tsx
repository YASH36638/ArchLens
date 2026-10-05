'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface KellyContextValue {
  open: boolean;
  modalOpen: boolean;
  openModal: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
}

const KellyContext = createContext<KellyContextValue | null>(null);

export function KellyProvider({ children }: { children: ReactNode }) {
  const [open, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const setOpen = useCallback((next: boolean) => setIsOpen(next), []);

  const value = useMemo(
    () => ({
      open,
      modalOpen: open,
      openModal,
      close,
      setOpen,
    }),
    [open, openModal, close, setOpen]
  );

  return <KellyContext.Provider value={value}>{children}</KellyContext.Provider>;
}

export function useKelly(): KellyContextValue {
  const ctx = useContext(KellyContext);
  if (!ctx) throw new Error('useKelly must be used within KellyProvider');
  return ctx;
}
