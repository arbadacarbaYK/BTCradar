import React from 'react';
import { Link } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { Zap } from 'lucide-react';

export function Navigation() {
  const { pubkey, name, displayName, picture, isLoggedIn } = useUserStore();

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-white/80 dark:bg-gray-900/80 shadow-lg border-b border-[#F7931A]/20 dark:border-[#8B5CF6]/20 backdrop-blur-md z-[1000]">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center text-2xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
          <Zap className="h-6 w-6 text-[#8B5CF6] mr-1" />
          BTCradar
        </Link>
        
        <div className="flex items-center space-x-4">
          {isLoggedIn && pubkey && (
            <Link 
              to="/profile" 
              className="flex items-center space-x-2"
            >
              {picture ? (
                <img 
                  src={picture} 
                  alt={displayName || name || 'Profile'} 
                  className="w-8 h-8 rounded-full border-2 border-[#F7931A] dark:border-[#8B5CF6] shadow-md"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = `https://www.gravatar.com/avatar/${pubkey}?d=identicon`;
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-[#8B5CF6]">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {(displayName || name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
} 