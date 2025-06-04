import React from 'react';
import { useMapStore } from '../store/mapStore';
import { useUserStore } from '../store/userStore';
import { useLocationStore } from '../store/locationStore';
import { Switch } from './ui/Switch';
import { Bitcoin } from 'lucide-react';

export function Settings() {
  const { settings, updateSettings } = useMapStore();
  const user = useUserStore(state => ({
    isLocationSharing: state.isLocationSharing,
    isLoggedIn: state.isLoggedIn,
  }));
  const setLocationSharingWithPermission = useLocationStore(state => state.setLocationSharingWithPermission);
  const permissionState = useLocationStore(state => state.permissionState);

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4 bg-gradient-to-br from-[#F7931A]/30 via-white to-[#8B5CF6]/30 dark:from-[#0F172A] dark:via-gray-900 dark:to-[#8B5CF6]/20">
      <div className="max-w-md w-full space-y-8 bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-2xl border border-[#F7931A]/20 dark:border-[#8B5CF6]/20 backdrop-blur-md p-8">
        <div className="flex items-center mb-8">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[#F7931A]/10 mr-3">
            <Bitcoin className="h-6 w-6 text-[#F7931A]" />
          </span>
          <h1 className="text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">Settings</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8 border border-[#F7931A]/10 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-[#F7931A] dark:text-[#F7931A] mb-4 flex items-center">
            Map Settings
          </h2>
          <div className="space-y-6">
            <Switch
              label="Show Other Users"
              description="Display other opted-in users on the map."
              checked={settings.showOtherUsers}
              onChange={(checked) => updateSettings({ showOtherUsers: checked })}
              highlightColor="#8B5CF6"
            />
            <Switch
              label="Show Bitcoin Locations"
              description="Display Bitcoin-accepting businesses from BTCMap.org."
              checked={settings.showBTCMapLocations}
              onChange={(checked) => updateSettings({ showBTCMapLocations: checked })}
              highlightColor="#F7931A"
            />
          </div>
        </div>

        {user && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-[#8B5CF6]/10 dark:border-gray-700 mb-8">
            <h2 className="text-lg font-semibold text-[#8B5CF6] dark:text-[#8B5CF6] mb-4 flex items-center">
              Location Sharing
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location Permission (browser/system)
              </label>
              <div className="flex items-center space-x-2">
                <span className={`inline-block w-3 h-3 rounded-full ${permissionState?.granted ? 'bg-green-500' : permissionState?.state === 'prompt' ? 'bg-yellow-400' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {permissionState?.granted ? 'Granted' : permissionState?.state === 'prompt' ? 'Prompt (not decided)' : 'Denied'}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This is controlled by your browser or device settings. You can change it in your browser's site settings.
              </div>
            </div>
            <Switch
              label="Share my location with others in BTCradar"
              description="Allow BTCradar to share your live location with other opted-in users. Requires browser permission above. You can turn this off anytime."
              checked={user.isLocationSharing}
              onChange={setLocationSharingWithPermission}
              highlightColor="#8B5CF6"
            />
            {permissionState && !permissionState.granted && (
              <div className="text-xs text-red-500 dark:text-red-400 mt-2 font-bold">
                Location sharing is enabled in the app, but browser permission is not granted. You must allow location access in your browser settings for sharing to work.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 