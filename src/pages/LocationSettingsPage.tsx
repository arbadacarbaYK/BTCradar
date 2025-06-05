import React from 'react';
import { useLocationStore } from '../store/locationStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useUserStore } from '../store/userStore';

export function LocationSettingsPage() {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isBrave = /Brave/.test(ua) || (typeof (window.navigator as Navigator & { brave?: unknown }).brave !== 'undefined');
  const isChrome = /Chrome/.test(ua) && !isBrave;

  const navigate = useNavigate();

  let instructions = '';
  if (isIOS) {
    instructions = `Go to Settings > Privacy & Security > Location Services > Safari Websites > Allow While Using App.`;
  } else if (isAndroid && isFirefox) {
    instructions = `Go to Android Settings > Apps > Firefox > Permissions > Location > Allow.\nThen in Firefox: tap the lock icon in the address bar > Permissions > Clear this site.`;
  } else if (isAndroid && isBrave) {
    instructions = `Go to Android Settings > Apps > Brave > Permissions > Location > Allow.\nThen in Brave: tap the lock icon in the address bar > Site settings > Location > Allow.`;
  } else if (isAndroid && isChrome) {
    instructions = `Go to Android Settings > Apps > Chrome > Permissions > Location > Allow.\nThen in Chrome: tap the lock icon in the address bar > Permissions > Location > Allow.`;
  } else if (isFirefox) {
    instructions = `Click the lock icon in the address bar > Permissions > Allow Location.\nIf blocked, go to browser settings and clear site data for this site.`;
  } else if (isBrave) {
    instructions = `Click the lock icon in the address bar > Site settings > Location > Allow.`;
  } else if (isChrome) {
    instructions = `Click the lock icon in the address bar > Site settings > Location > Allow.`;
  } else {
    instructions = `Check your browser or system settings to allow location access for this site.`;
  }

  const handleRetry = () => {
    navigator.geolocation.getCurrentPosition(
      () => {
        // Permission granted: set toggle and start watching
        useUserStore.getState().setLocationSharing(true);
        useLocationStore.getState().startWatchingLocation();
        navigate('/');
      },
      () => {
        // Permission denied: set toggle off, stay on page
        useUserStore.getState().setLocationSharing(false);
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-2xl font-extrabold text-gray-900 dark:text-white">
            Enable Location Access
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            To use BTCradar, you need to enable location access in your browser and system settings.
          </p>
        </div>
        <div className="mt-8 bg-white dark:bg-gray-800 py-8 px-4 shadow-lg rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="text-gray-700 dark:text-gray-200 whitespace-pre-line">
              {instructions}
            </div>
            <Button fullWidth variant="primary" onClick={handleRetry}>
              Retry Location Access
            </Button>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              After enabling, reload this page or tap Retry.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 