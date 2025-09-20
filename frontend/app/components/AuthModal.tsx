"use client";
import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { disableBodyScroll, enableBodyScroll } from '../utils/scrollLock';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login, register, isAuthenticated } = useAuth();

  // Clear success message when modal is closed or user logs out
  useEffect(() => {
    if (!isOpen || !isAuthenticated) {
      setSuccess('');
      setError('');
    }
  }, [isOpen, isAuthenticated]);

  // Handle body scroll locking
  useEffect(() => {
    if (isOpen) {
      disableBodyScroll();
    } else {
      enableBodyScroll();
    }

    // Cleanup on unmount
    return () => {
      enableBodyScroll();
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      let success = false;
      
      if (mode === 'login') {
        success = await login(email, password);
        if (success) {
          setSuccess('Login successful!');
          setTimeout(() => {
            onClose();
          }, 1000);
        } else {
          setError('Invalid email or password');
        }
      } else {
        success = await register(email, password);
        if (success) {
          // Check if we got a token immediately (no email confirmation needed)
          const hasToken = localStorage.getItem('auth_token');
          if (hasToken) {
            setSuccess('Registration successful!');
            setTimeout(() => {
              onClose();
            }, 2000);
          } else {
            setSuccess('Registration successful! Please check your email to confirm your account.');
            // Switch to login mode after successful registration
            setTimeout(() => {
              setMode('login');
              setSuccess('');
                  setEmail('');
    setPassword('');
            }, 2000);
          }
        } else {
          setError('Registration failed. Please try again.');
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-3 sm:p-4">
      <div className="bg-white dark:bg-black backdrop-blur-sm rounded-lg shadow-2xl p-3 sm:p-6 w-full max-w-xs mx-auto border border-gray-200 dark:border-gray-800/70 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-lg 2xl:text-lg font-medium text-black dark:text-white">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[12px]">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-[12px]">
              {success}
            </div>
          )}



          <div>
            <label className="block text-[12px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-800/70 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-[12px] bg-white dark:bg-black text-black dark:text-white"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-[12px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-800/70 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-[12px] pr-12 bg-white dark:bg-black text-black dark:text-white"
                placeholder="Enter your password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white"
              >
                {showPassword ? <EyeOff size={16} className="sm:w-4 sm:h-4" /> : <Eye size={16} className="sm:w-4 sm:h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-row gap-2 sm:gap-3 pt-2 sm:pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-2 sm:px-3 py-1.5 border border-gray-300 dark:border-gray-800/70 text-black dark:text-white rounded-lg hover:bg-gray-100 dark:bg-black dark:hover:bg-gray-900 font-medium transition-colors cursor-pointer text-[12px] sm:text-xs 2xl:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-2 sm:px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer text-[12px] sm:text-xs 2xl:text-sm"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span className="text-[12px] sm:text-xs 2xl:text-sm">{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                </div>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={switchMode}
              className="text-blue-600 hover:text-blue-700 text-[12px] sm:text-xs 2xl:text-sm font-medium cursor-pointer"
            >
              {mode === 'login' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
