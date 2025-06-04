import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Map, MapPin } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useMapStore } from '../store/mapStore';
import { Switch } from '../components/ui/Switch';
import { Button } from '../components/ui/Button';

export function SettingsPage() {
  const { isLoggedIn } = useUserStore();
  const { settings, updateSettings, btcMapLocations } = useMapStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);
  
  const handleSettingChange = (key: keyof typeof settings, value: boolean | number) => {
    updateSettings({ [key]: value });
  };
  
  return (
    <div className="container max-w-md mx-auto px-4 py-20">
      <div className="flex items-center mb-6">
        <Settings className="h-6 w-6 text-[#F7931A] mr-2" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Map Settings</h2>
        
        <div className="space-y-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <Map className="h-5 w-5 text-[#F7931A]" />
            </div>
            <div className="ml-3 flex-1">
              <Switch 
                label="Show BTCradar Locations" 
                description="Display Bitcoin-accepting businesses from BTCradar.org"
                checked={settings.showBTCMapLocations}
                onChange={(checked) => handleSettingChange('showBTCMapLocations', checked)}
              />
              
              {settings.showBTCMapLocations && (
                <div className="mt-2 text-sm text-gray-500">
                  {btcMapLocations.length} locations loaded
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <MapPin className="h-5 w-5 text-[#F7931A]" />
            </div>
            <div className="ml-3 flex-1">
              <Switch 
                label="Show Other Users" 
                description="Display other opted-in users on the map"
                checked={settings.showOtherUsers}
                onChange={(checked) => handleSettingChange('showOtherUsers', checked)}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Privacy Settings</h2>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your location is only shared with other users who have opted in, and only while you have location sharing enabled in BTCradar.
          </p>
          
          <Button
            variant="outline"
            fullWidth
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
          >
            Clear All Data
          </Button>
        </div>
      </div>
    </div>
  );
}