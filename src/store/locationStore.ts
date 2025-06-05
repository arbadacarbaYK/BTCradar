import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserLocation, GeolocationStatus } from '../types/index';
import { getUserProfile, publishLocation, subscribeToAllLocations } from '../utils/nostr';
import { useUserStore } from './userStore';

interface LocationState {
  userLocations: UserLocation[];
  currentLocation: GeolocationPosition | null;
  geolocationStatus: 'idle' | 'watching' | 'error';
  watchId: number | null;
  permissionState: PermissionState | null;
  isLocationSharing: boolean;
  
  // Actions
  setUserLocations: (locations: UserLocation[]) => void;
  addUserLocation: (location: UserLocation) => void;
  removeUserLocation: (pubkey: string) => void;
  updateCurrentLocation: (location: GeolocationPosition | null) => void;
  setGeolocationStatus: (status: Partial<GeolocationStatus>) => void;
  startWatchingLocation: () => Promise<boolean>;
  stopWatchingLocation: () => void;
  requestLocationPermission: () => Promise<boolean>;
  checkLocationPermission: () => Promise<PermissionState>;
  setLocationSharingWithPermission: (isSharing: boolean) => Promise<void>;
  
  // Selectors
  getUserLocation: (pubkey: string) => UserLocation | undefined;
  getLocationMessage: () => string | null;
}

export type PermissionState = {
  granted: boolean;
  state: 'granted' | 'prompt' | 'denied';
  backgroundGranted?: boolean;
  browserSettings?: boolean;
};

declare global {
  interface Window {
    __btcradarLocationSub?: () => void;
  }
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => {
      // Subscribe to all BTCradar location events and update userLocations
      if (typeof window !== 'undefined' && !window.__btcradarLocationSub) {
        window.__btcradarLocationSub = subscribeToAllLocations(async (location) => {
          let profile: import('../types/index').NostrProfile | undefined;
          try {
            const fetched = await getUserProfile(location.pubkey);
            profile = fetched === null ? undefined : fetched;
          } catch {
            // ignore profile fetch errors
          }
          set((state) => {
            const existingIndex = state.userLocations.findIndex(l => l.pubkey === location.pubkey);
            const newLoc = {
              ...location,
              picture: profile?.picture,
              name: profile?.name,
              displayName: profile?.display_name,
            };
            if (existingIndex >= 0) {
              // Update existing
              const updated = [...state.userLocations];
              updated[existingIndex] = { ...updated[existingIndex], ...newLoc };
              return { userLocations: updated };
            } else {
              // Add new
              return { userLocations: [...state.userLocations, newLoc] };
            }
          });
        });
      }

      return {
        userLocations: [],
        currentLocation: null,
        geolocationStatus: 'idle',
        watchId: null,
        permissionState: null,
        isLocationSharing: false,
        
        setUserLocations: (locations) => set({ userLocations: locations }),
        
        addUserLocation: async (location) => {
          const { userLocations } = get();
          const existingIndex = userLocations.findIndex(loc => loc.pubkey === location.pubkey);
          
          try {
            const profile = await getUserProfile(location.pubkey);
            if (profile) {
              location = {
                ...location,
                picture: profile.picture,
                name: profile.name || location.name,
                displayName: profile.display_name
              };
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
          
          if (existingIndex >= 0) {
            const updatedLocations = [...userLocations];
            updatedLocations[existingIndex] = {
              ...updatedLocations[existingIndex],
              ...location,
              picture: location.picture || updatedLocations[existingIndex].picture,
              name: location.name || updatedLocations[existingIndex].name,
              displayName: location.displayName || updatedLocations[existingIndex].displayName
            };
            set({ userLocations: updatedLocations });
          } else {
            set({ userLocations: [...userLocations, location] });
          }
        },
        
        removeUserLocation: (pubkey) => {
          const { userLocations } = get();
          set({ userLocations: userLocations.filter(loc => loc.pubkey !== pubkey) });
        },
        
        updateCurrentLocation: (location) => set({ currentLocation: location }),
        
        setGeolocationStatus: (status) => set({ 
          geolocationStatus: status.isAvailable ? 'watching' : 'error'
        }),

        checkLocationPermission: async () => {
          // Only check permissions if user is logged in
          const userState = useUserStore.getState();
          if (!userState.isLoggedIn) {
            return {
              granted: false,
              state: 'denied' as const,
              permissionState: { state: 'denied' as const },
            };
          }

          let permissionState: PermissionStatus | { state: 'prompt' } = { state: 'prompt' };
          if (navigator.permissions) {
            try {
              permissionState = await navigator.permissions.query({ name: 'geolocation' });
            } catch {
              // fallback
            }
          }
          let granted = false;
          if (permissionState.state === 'granted') granted = true;
          return {
            granted,
            state: permissionState.state as 'granted' | 'prompt' | 'denied',
            permissionState: { state: permissionState.state as 'granted' | 'prompt' | 'denied' },
          };
        },

        requestLocationPermission: async () => {
          if (!navigator.geolocation) {
            set({ geolocationStatus: 'error' });
            return false;
          }

          try {
            // Always check permission state first
            let permissionState: PermissionStatus | { state: 'prompt' } = { state: 'prompt' };
            if (navigator.permissions) {
              try {
                permissionState = await navigator.permissions.query({ name: 'geolocation' });
                console.log('Permission API state:', permissionState.state);
              } catch {
                // fallback
              }
            }

            // If permission is prompt, always trigger the popup
            if (permissionState.state === 'prompt') {
              console.log('Triggering geolocation popup (prompt state)');
              return new Promise<boolean>((resolve) => {
                navigator.geolocation.getCurrentPosition(
                  () => {
                    set({ 
                      permissionState: {
                        granted: true,
                        state: 'granted'
                      }
                    });
                    get().checkLocationPermission().then((perm) => {
                      set({ permissionState: perm });
                      console.log('Permission state after location update:', perm);
                    });
                    resolve(true);
                  },
                  (error) => {
                    console.error('Location error (prompt):', error);
                    set({ 
                      permissionState: {
                        granted: false,
                        state: 'denied'
                      }
                    });
                    get().checkLocationPermission().then((perm) => {
                      set({ permissionState: perm });
                      console.log('Permission state after location update:', perm);
                    });
                    resolve(false);
                  },
                  {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                  }
                );
              });
            }

            // If permission is already granted, no popup, just resolve true
            if (permissionState.state === 'granted') {
              set({ 
                permissionState: {
                  granted: true,
                  state: 'granted'
                }
              });
              get().checkLocationPermission().then((perm) => {
                set({ permissionState: perm });
                console.log('Permission state after location update:', perm);
              });
              return true;
            }

            // If denied, resolve false and show UI message
            if (permissionState.state === 'denied') {
              set({ 
                permissionState: {
                  granted: false,
                  state: 'denied'
                }
              });
              get().checkLocationPermission().then((perm) => {
                set({ permissionState: perm });
                console.log('Permission state after location update:', perm);
              });
              return false;
            }

            // Fallback: always try to trigger the popup
            console.log('Fallback: triggering geolocation popup');
            return new Promise<boolean>((resolve) => {
              navigator.geolocation.getCurrentPosition(
                () => {
                  set({ 
                    permissionState: {
                      granted: true,
                      state: 'granted'
                    }
                  });
                  get().checkLocationPermission().then((perm) => {
                    set({ permissionState: perm });
                    console.log('Permission state after location update:', perm);
                  });
                  resolve(true);
                },
                (error) => {
                  console.error('Location error (fallback):', error);
                  set({ 
                    permissionState: {
                      granted: false,
                      state: 'denied'
                    }
                  });
                  get().checkLocationPermission().then((perm) => {
                    set({ permissionState: perm });
                    console.log('Permission state after location update:', perm);
                  });
                  resolve(false);
                },
                {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 0,
                }
              );
            });
          } catch (error) {
            console.error('Location permission error:', error);
            set({ geolocationStatus: 'error' });
            return false;
          }
        },
        
        startWatchingLocation: async () => {
          if (!navigator.geolocation) {
            set({ geolocationStatus: 'error' });
            return false;
          }

          // Clear any existing watch before starting a new one
          get().stopWatchingLocation();

          // Always try to get permission first
          const hasPermission = await get().requestLocationPermission();
          if (!hasPermission) {
            return false;
          }

          // Set status to watching before starting the watch
          set({ geolocationStatus: 'watching' });

          try {
            // Start watching with more lenient settings
            const watchId = navigator.geolocation.watchPosition(
              (position) => {
                if (import.meta.env.DEV) {
                  console.log('Location update:', {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                  });
                }
                
                set({ currentLocation: position });
                console.log('Location update:', position);
                get().checkLocationPermission().then((perm) => {
                  set({ permissionState: perm });
                });

                // Publish location to Nostr if we have a user
                const userStr = localStorage.getItem('btcmaps-user');
                if (userStr) {
                  try {
                    const user = JSON.parse(userStr);
                    const location: UserLocation = {
                      pubkey: user.pubkey,
                      name: user.name,
                      displayName: user.displayName,
                      picture: user.picture,
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                      accuracy: position.coords.accuracy,
                      lastUpdated: Date.now(),
                    };
                    publishLocation(location).catch(error => {
                      console.error('Failed to publish location:', error);
                    });
                  } catch (error) {
                    console.error('Failed to parse user data:', error);
                  }
                }
              },
              (error) => {
                console.error('Geolocation error:', error);
                set({ geolocationStatus: 'error' });
                // Do not throw, just return false
                // Optionally, you can set a state to show error in UI
              },
              {
                enableHighAccuracy: true,
                timeout: 15000, // 15s timeout for continuous updates
                maximumAge: 5000, // Allow positions up to 5s old
              }
            );

            // Store the watch ID
            localStorage.setItem('btcmaps-location-watch-id', watchId.toString());
            set({ watchId });
            return true;
          } catch (error) {
            console.error('Error starting location watch:', error);
            set({ geolocationStatus: 'error' });
            return false;
          }
        },
        
        stopWatchingLocation: () => {
          const { watchId } = get();
          if (watchId) {
            navigator.geolocation.clearWatch(watchId);
            localStorage.removeItem('btcmaps-location-watch-id');
            set({ watchId: null, geolocationStatus: 'idle' });
          }
        },
        
        getUserLocation: (pubkey) => {
          return get().userLocations.find(loc => loc.pubkey === pubkey);
        },

        getLocationMessage: () => {
          const state = get();
          const user = useUserStore.getState();
          
          if (!user || !user.pubkey) {
            return 'Sign in to share your location';
          }
          
          if (!user.isLocationSharing) {
            return 'Enable location sharing to appear on the map';
          }

          // If we're actively watching but don't have a location yet
          if (state.geolocationStatus === 'watching' && !state.currentLocation) {
            return 'Getting your location...';
          }

          // If location is completely blocked
          if (state.permissionState?.browserSettings === false) {
            return 'Location blocked - Click shield icon in address bar';
          }

          // If we need initial permission
          if (!state.permissionState?.granted) {
            return 'Click to show location permission prompt';
          }

          return null;
        },

        setLocationSharingWithPermission: async (isSharing: boolean) => {
          const { checkLocationPermission, startWatchingLocation } = get();
          set({ isLocationSharing: isSharing });
          if (isSharing) {
            const perm = await checkLocationPermission();
            set({ permissionState: perm });
            if (perm.state === 'prompt') {
              // Trigger browser prompt
              navigator.geolocation.getCurrentPosition(
                () => {
                  // Permission granted, start watching
                  startWatchingLocation();
                },
                () => {
                  // Permission denied or error, just update state
                  checkLocationPermission().then((perm2) => set({ permissionState: perm2 }));
                }
              );
            } else if (perm.state === 'granted') {
              startWatchingLocation();
            }
          }
        },
      };
    },
    {
      name: 'btcmaps-location-storage',
      partialize: (state) => ({ 
        userLocations: state.userLocations.filter(loc => 
          // Only persist locations less than 12 hours old
          Date.now() - loc.lastUpdated < 12 * 60 * 60 * 1000
        )
      }),
    }
  )
);