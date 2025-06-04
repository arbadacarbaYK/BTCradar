import { publishLocationUpdate } from './nostr';
import { useUserStore } from '../store/userStore';

let watchId: number | null = null;
let wakeLock: any | null = null;

export async function startBackgroundLocationTracking(
  privateKey: string | null,
  pubkey: string
) {
  try {
    // Request wake lock to keep the device awake
    try {
      // @ts-ignore - Wake Lock API
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {
      console.warn('Wake Lock not supported:', err);
    }

    // Request background location permission if available
    if ('permissions' in navigator) {
      try {
        await navigator.permissions.query({ name: 'geolocation' });
        // Some browsers support this
        // @ts-ignore
        await navigator.permissions.query({ name: 'background-location' });
      } catch (err) {
        console.warn('Background location permission not supported:', err);
      }
    }

    // Start watching position with high accuracy
    watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          await publishLocationUpdate(
            privateKey,
            pubkey,
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy
          );
        } catch (error) {
          console.error('Error publishing location:', error);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000 // Update if position is older than 1 minute
      }
    );

    // Register a service worker for better background support
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/location-worker.js');
        console.log('Location ServiceWorker registered:', registration);
      } catch (err) {
        console.error('ServiceWorker registration failed:', err);
      }
    }

  } catch (error) {
    console.error('Error starting background tracking:', error);
    throw error;
  }
}

export function stopBackgroundLocationTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
} 