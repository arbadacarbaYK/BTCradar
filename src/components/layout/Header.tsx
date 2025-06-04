import React, { useState, useEffect } from 'react';
import { Bitcoin, Menu, X } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { useLocationStore } from '../../store/locationStore';
import { Switch } from '../ui/Switch';

export function Header() {
  const { user, toggleLocationSharing, logout } = useUserStore();
  const { startWatchingLocation, stopWatchingLocation } = useLocationStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  
  // Handle location sharing toggle
  useEffect(() => {
    if (user?.isLocationSharing) {
      startWatchingLocation();
    } else {
      stopWatchingLocation();
    }
  }, [user?.isLocationSharing, startWatchingLocation, stopWatchingLocation]);
  
  useEffect(() => {
    let deferredPrompt: any;
    function handleBeforeInstallPrompt(e: any) {
      e.preventDefault();
      deferredPrompt = e;
      setShowPwaPrompt(true);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);
  
  const handleLocationToggle = () => {
    toggleLocationSharing();
  };
  
  const handleLogout = () => {
    stopWatchingLocation();
    logout();
    setIsMenuOpen(false);
  };

  const handleInstallClick = () => {
    if ((window as any).deferredPrompt) {
      (window as any).deferredPrompt.prompt();
      (window as any).deferredPrompt.userChoice.then(() => setShowPwaPrompt(false));
    }
  };
  
  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center">
          <Bitcoin className="h-6 w-6 text-[#F7931A]" />
          <span className="ml-2 font-bold text-[#0F172A] dark:text-white">BTCradar</span>
        </div>
        
        {user?.isLoggedIn && (
          <div className="flex items-center space-x-4">
            <Switch
              checked={user.isLocationSharing}
              onChange={handleLocationToggle}
              label="Share Location"
            />
            
            <button
              className="relative p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              )}
            </button>
            
            {isMenuOpen && (
              <div className="absolute top-14 right-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg w-48 py-1 animate-fade-in z-50">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {user.displayName || user.name}
                  </div>
                </div>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {showPwaPrompt && (
        <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-3 flex items-center justify-between z-[2000]">
          <span>Add BTCMaps to your home screen for the best experience!</span>
          <button className="ml-4 px-3 py-1 bg-white text-blue-600 rounded shadow" onClick={handleInstallClick}>Install</button>
        </div>
      )}
    </header>
  );
}