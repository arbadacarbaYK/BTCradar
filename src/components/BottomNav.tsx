import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapIcon, UserIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export function BottomNav() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-14 bg-white dark:bg-gray-800 shadow-lg z-[1000]">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-around">
        <Link 
          to="/" 
          className={`flex flex-col items-center space-y-1 ${
            isActive('/') ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <MapIcon className="w-6 h-6" />
          <span className="text-xs">Map</span>
        </Link>
        
        <Link 
          to="/profile" 
          className={`flex flex-col items-center space-y-1 ${
            isActive('/profile') ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <UserIcon className="w-6 h-6" />
          <span className="text-xs">Profile</span>
        </Link>
        
        <Link 
          to="/settings" 
          className={`flex flex-col items-center space-y-1 ${
            isActive('/settings') ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <Cog6ToothIcon className="w-6 h-6" />
          <span className="text-xs">Settings</span>
        </Link>
      </div>
    </nav>
  );
} 