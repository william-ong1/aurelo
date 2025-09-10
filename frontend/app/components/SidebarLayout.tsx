"use client";
import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import AuthModal from './AuthModal';
import { disableBodyScroll, enableBodyScroll } from '../utils/scrollLock';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const { logout } = useAuth();
  const { isAuthModalOpen, hideAuthModal } = useAuthModal();

  useEffect(() => {
    if (isAuthModalOpen) {
      disableBodyScroll();
    } else {
      enableBodyScroll();
    }
    return () => enableBodyScroll();
  }, [isAuthModalOpen]);

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Desktop / Tablet Sidebar */}
      <div className="hidden md:block">
        <Sidebar onLogout={logout} />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <Header onLogout={logout} />
      </div>

      {/* Content */}
      <div className="pl-56 pb-16 md:pb-0">
        {children}
      </div>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={hideAuthModal}
        initialMode="login"
      />
    </div>
  );
}


