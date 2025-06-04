import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, User, Settings, Map } from 'lucide-react';
import { vibrate } from '../../utils/helpers';

export function Navbar() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const handleNavClick = () => {
    vibrate(10); // Subtle haptic feedback
  };
  
  return (
    <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-[#F7931A]/20 dark:border-[#8B5CF6]/20 shadow-2xl rounded-full px-4 py-2 flex items-center justify-around gap-2 min-w-[320px] max-w-md mx-auto">
        <NavItem 
          to="/" 
          icon={<Map />} 
          label="Map" 
          isActive={isActive('/')} 
          onClick={handleNavClick}
          accentColor="#F7931A"
        />
        <NavItem 
          to="/nearby" 
          icon={<MapPin />} 
          label="Nearby" 
          isActive={isActive('/nearby')} 
          onClick={handleNavClick}
          accentColor="#8B5CF6"
        />
        <NavItem 
          to="/profile" 
          icon={<User />} 
          label="Profile" 
          isActive={isActive('/profile')} 
          onClick={handleNavClick}
          accentColor="#F7931A"
        />
        <NavItem 
          to="/settings" 
          icon={<Settings />} 
          label="Settings" 
          isActive={isActive('/settings')} 
          onClick={handleNavClick}
          accentColor="#8B5CF6"
        />
      </div>
    </nav>
  );
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
  accentColor: string;
}

function NavItem({ to, icon, label, isActive, onClick, accentColor }: NavItemProps) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center w-16 py-1 transition-colors duration-150 font-bold ${
        isActive
          ? 'text-white drop-shadow-[0_2px_8px_rgba(247,147,26,0.25)] scale-110'
          : 'text-gray-500 hover:text-[#8B5CF6] dark:text-gray-400 dark:hover:text-[#F7931A]'
      }`}
      onClick={onClick}
      style={isActive ? { color: accentColor } : {}}
    >
      <div className="relative">
        {React.cloneElement(icon as React.ReactElement, {
          className: `h-7 w-7 ${isActive ? 'animate-bounce' : ''}`,
          style: isActive ? { color: accentColor } : {},
        })}
        {isActive && (
          <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gradient-to-r from-[#F7931A] to-[#8B5CF6] rounded-full shadow-lg" />
        )}
      </div>
      <span className="text-xs mt-1 tracking-wide uppercase">{label}</span>
    </Link>
  );
}