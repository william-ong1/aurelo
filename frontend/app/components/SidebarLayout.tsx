"use client";
import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileSidebar from './MobileSidebar';
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (isAuthModalOpen || isMobileSidebarOpen) {
      disableBodyScroll();
    } else {
      enableBodyScroll();
    }
    return () => enableBodyScroll();
  }, [isAuthModalOpen, isMobileSidebarOpen]);

  const handleMobileMenuClick = () => {
    setIsMobileSidebarOpen(true);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Desktop / Tablet Sidebar */}
      <div className="hidden md:block">
        <Sidebar onLogout={logout} />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <Header onLogout={logout} onMenuClick={handleMobileMenuClick} />
      </div>

      {/* Content */}
      <div className="md:pl-56 md:pb-0">
        {children}
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={handleMobileSidebarClose}
        onLogout={logout}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={hideAuthModal}
        initialMode="login"
      />
    </div>
  );
}


