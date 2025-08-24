"use client";
import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import AuthModal from './AuthModal';
import { disableBodyScroll, enableBodyScroll } from '../utils/scrollLock';
import { useAuth } from '../contexts/AuthContext';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    if (showAuthModal) {
      disableBodyScroll();
    } else {
      enableBodyScroll();
    }
    return () => enableBodyScroll();
  }, [showAuthModal]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop / Tablet Sidebar */}
      <div className="hidden md:block">
        <Sidebar onShowAuthModal={() => setShowAuthModal(true)} onLogout={logout} />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <Header onShowAuthModal={() => setShowAuthModal(true)} onLogout={logout} />
      </div>

      {/* Content */}
      <div className="pl-56 pb-16 md:pb-0">
        {children}
      </div>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
    </div>
  );
}


