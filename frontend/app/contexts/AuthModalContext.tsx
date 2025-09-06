"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthModalContextType {
  showAuthModal: () => void;
  hideAuthModal: () => void;
  isAuthModalOpen: boolean;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};

interface AuthModalProviderProps {
  children: ReactNode;
}

export const AuthModalProvider: React.FC<AuthModalProviderProps> = ({ children }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const showAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  const hideAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthModalContext.Provider value={{
      showAuthModal,
      hideAuthModal,
      isAuthModalOpen
    }}>
      {children}
    </AuthModalContext.Provider>
  );
};
