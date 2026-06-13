"use client";

import React, { createContext, useContext, useState } from "react";
import { QuoteModal } from "./quote-modal";

interface QuoteContextType {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => {
    setIsOpen(true);
  };
  const close = () => setIsOpen(false);

  return (
    <QuoteContext.Provider value={{ open, close, isOpen }}>
      {children}
      {isOpen && <QuoteModal open={isOpen} onClose={close} />}
    </QuoteContext.Provider>
  );
}

export function useQuoteModal() {
  const context = useContext(QuoteContext);
  if (context === undefined) {
    throw new Error("useQuoteModal must be used within a QuoteProvider");
  }
  return context;
}
