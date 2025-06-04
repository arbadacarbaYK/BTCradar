import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import { UserMarker } from './UserMarker';
import { useLocationStore } from '../../store/locationStore';
import type { PermissionState } from '../../store/locationStore';
import { useMapStore } from '../../store/mapStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useUserStore } from '../../store/userStore';
import { vibrate } from '../../utils/helpers';
import { UserLocation } from '../../types';
import 'leaflet/dist/leaflet.css';
import { fetchBTCMapLocations, fetchBTCMapLocationTypes } from '../../utils/btcmapApi';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';

// Custom component to update the map view when center changes
function MapUpdater() {
  const map = useMap();
  const { settings, setBTCMapLocations, setFetchingLocations, setMapInitialized } = useMapStore();
  const { currentLocation } = useLocationStore();
  const { addNotification } = useNotificationStore();
  
  useEffect(() => {
    if (map && currentLocation && !map.getBounds().contains([currentLocation.coords.latitude, currentLocation.coords.longitude])) {
      map.setView([currentLocation.coords.latitude, currentLocation.coords.longitude], settings.defaultZoom, {
        animate: true,
        duration: 1
      });
    }
    
    setMapInitialized(true);
  }, [map, currentLocation, settings.defaultZoom, setMapInitialized]);
  
  // Map event handlers
  useMapEvents({
    moveend: async () => {
      if (settings.showBTCMapLocations) {
        const bounds = map.getBounds();
        await fetchLocationsInView(bounds);
      }
    },
    locationfound: (e) => {
      map.setView(e.latlng, map.getZoom(), {
        animate: true,
        duration: 1
      });
    },
    locationerror: () => {
      // Location error handled
    }
  });
  
  const fetchLocationsInView = async (bounds: LatLngBounds) => {
    try {
      setFetchingLocations(true);
      const boundParams = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      };
      
      const locations = await fetchBTCMapLocations(boundParams);
      setBTCMapLocations(locations);
      
      if (locations.length === 0) {
        // No need to set btcMapError here, as it's handled in the fetchLocationsInView function
      }
      if (locations.length > 0) {
        vibrate(10); // Subtle vibration feedback
      }
    } catch {
      addNotification('Failed to fetch Bitcoin locations', 'error');
    } finally {
      setFetchingLocations(false);
    }
  };
  
  return null;
}

function MapController() {
  const map = useMap();
  const { currentLocation } = useLocationStore();
  const { isMapInitialized, setMapInitialized } = useMapStore();

  useEffect(() => {
    if (!isMapInitialized && currentLocation) {
      map.setView(
        [currentLocation.coords.latitude, currentLocation.coords.longitude],
        13
      );
      setMapInitialized(true);
    }
  }, [map, currentLocation, isMapInitialized, setMapInitialized]);
  
  return null;
}

export function MapView() {
  const { currentLocation, userLocations, permissionState, checkLocationPermission, startWatchingLocation } = useLocationStore();
  const settings = useMapStore(state => state.settings);
  const user = useUserStore(state => state);
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();

  const [mapCenter] = useState<[number, number]>(settings.defaultCenter);
  const [mapZoom] = useState(settings.defaultZoom);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [typeColors, setTypeColors] = useState<Record<string, string>>({
    default: '#F7931A',
    atm: '#22C55E',
    restaurant: '#EF4444',
    bar: '#8B5CF6',
    shop: '#3B82F6',
    service: '#F59E0B',
  });

  // Assign a color from a palette for unknown types
  function generateColor(index: number) {
    // HSL: 0-360 hue, 60% sat, 55% light
    return `hsl(${(index * 47) % 360}, 60%, 55%)`;
  }

  useEffect(() => {
    fetchBTCMapLocationTypes().then(types => {
      setTypeColors(prev => {
        const newColors = { ...prev };
        let colorIndex = 0;
        types.forEach(type => {
          if (!newColors[type]) {
            newColors[type] = generateColor(colorIndex++);
          }
        });
        return newColors;
      });
    });
  }, []);

  // Create current user location object
  const currentUserLocation: UserLocation | null = currentLocation ? {
    pubkey: user?.pubkey || 'current',
    name: user?.name || 'You',
    displayName: user?.displayName || undefined,
    picture: user?.picture || undefined,
    latitude: currentLocation.coords.latitude,
    longitude: currentLocation.coords.longitude,
    accuracy: currentLocation.coords.accuracy,
    lastUpdated: Date.now()
  } : null;

  // Check location permissions on mount
  useEffect(() => {
    checkLocationPermission();
  }, [checkLocationPermission]);

  const handleStartLocation = useCallback(async () => {
    if (isRequestingLocation) return;
    
    setIsRequestingLocation(true);
    try {
      // First check current permissions
      await checkLocationPermission();
      
      // Then try to start watching location
      await startWatchingLocation().catch(error => {
        addNotification(error.message, 'error');
        throw error; // Re-throw to be caught by outer catch
      });
    } catch (error) {
      console.error('Failed to start location tracking:', error);
    } finally {
      setIsRequestingLocation(false);
    }
  }, [startWatchingLocation, addNotification, isRequestingLocation, checkLocationPermission]);

  // Effect to start location tracking when sharing is enabled
  useEffect(() => {
    if (user?.isLocationSharing && !currentLocation && !isRequestingLocation) {
      handleStartLocation().catch(error => {
        console.error('Failed to start location tracking in effect:', error);
      });
    }
  }, [user?.isLocationSharing, currentLocation, isRequestingLocation, handleStartLocation]);

  // Show spinner while waiting for location
  useEffect(() => {
    if (!currentLocation && user?.isLocationSharing) {
      setIsLocating(true);
    } else {
      setIsLocating(false);
    }
  }, [currentLocation, user?.isLocationSharing]);

  // Only show location permission overlay if not granted and user is sharing location
  const showLocationOverlay = !permissionState?.granted && user?.isLocationSharing;
  
  // Add effect to re-check permission and hide overlay as soon as location is fetched
  useEffect(() => {
    if (currentLocation && permissionState?.granted) {
      // Automatically navigate to map tab if not already there
      navigate('/');
    }
  }, [currentLocation, permissionState, navigate]);
  
  return (
    <div className="flex-1 relative mt-14 mb-14 touch-none">
      {isLocating && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 flex flex-col items-center">
          <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
          <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Locating…</span>
        </div>
      )}
      {showLocationOverlay && (
        <div className="absolute inset-0 z-[1000] bg-white/90 dark:bg-gray-900/90 flex flex-col items-center justify-center p-6">
          <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Enable Location Access</h2>
          <p className="mb-2 text-gray-700 dark:text-gray-300">To use BTCMaps, you need to enable location access in your browser and system settings.</p>
          {permissionState && (permissionState as PermissionState & { isBrave?: boolean }).isBrave ? (
            <div className="mb-2 text-yellow-600 dark:text-yellow-400">
              <b>Brave detected:</b> Click the orange lion icon (Brave Shields) in the address bar and allow location for this site.<br />
              Also, click the lock icon {'>'} Site settings {'>'} Location {'>'} Allow.
            </div>
          ) : (
            <div className="mb-2">
              Click the lock icon in the address bar {'>'} Site settings {'>'} Location {'>'} Allow.
            </div>
          )}
          <button
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => {
              // Retry permission prompt
              navigator.geolocation.getCurrentPosition(
                () => {
                  addNotification('Location access denied or failed. Please check your browser settings and try again.', 'error');
                }
              );
            }}
          >Retry Location Access</button>
        </div>
      )}
      {/* BTCMap Legend/Filter */}
      <div className="absolute bottom-24 left-2 right-2 z-[900] p-[2px] rounded-full bg-gradient-to-r from-[#F7931A] to-[#8B5CF6] shadow-2xl max-w-[95vw]">
        <div className="bg-white/80 dark:bg-gray-800/80 rounded-full p-2 text-xs flex flex-col gap-1 max-w-[95vw]">
          <div className="font-extrabold text-[#F7931A] dark:text-[#8B5CF6] mb-1 flex items-center gap-2 text-xs">
            <Zap className="h-4 w-4 text-[#8B5CF6]" /> BTCMap Legend
          </div>
          <div className="flex flex-wrap gap-1 overflow-x-auto max-w-[90vw]">
            {Object.entries(typeColors).map(([type, color]: [string, string]) => (
              <span
                key={type}
                className="inline-flex items-center px-2 py-1 rounded-full font-bold shadow-md text-xs"
                style={{ background: color, color: '#fff', textTransform: 'capitalize', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
              >
                <Zap className="h-3 w-3 mr-1 text-white/80" />
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-[calc(100vh-7rem)] w-full"
        zoomControl={false}
        attributionControl={false}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          minZoom={2}
          detectRetina={true}
        />
        
        <MapController />
        <MapUpdater />
        
        {settings.showUserLocation && currentUserLocation && (
          <UserMarker
            location={currentUserLocation}
            currentLocation={currentUserLocation}
            isCurrentUser={true}
          />
        )}
        
        {settings.showOtherUsers && userLocations.map((location) => (
          <UserMarker
            key={location.pubkey}
            location={location}
            currentLocation={currentUserLocation}
            isCurrentUser={false}
          />
        ))}
      </MapContainer>
    </div>
  );
}