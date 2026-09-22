import React, { createContext, useContext, useState } from "react";

const PremiumModalContext = createContext(null);

export function PremiumModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  return (
    <PremiumModalContext.Provider value={{ isOpen, open, close }}>
      {children}
    </PremiumModalContext.Provider>
  );
}

export function usePremiumModal() {
  const ctx = useContext(PremiumModalContext);
  if (!ctx) throw new Error("usePremiumModal must be used within PremiumModalProvider");
  return ctx;
}