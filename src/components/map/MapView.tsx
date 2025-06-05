import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import { UserMarker } from './UserMarker';
import { useLocationStore } from '../../store/locationStore';
import { useMapStore } from '../../store/mapStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useUserStore } from '../../store/userStore';
import { vibrate } from '../../utils/helpers';
import { UserLocation } from '../../types';
import 'leaflet/dist/leaflet.css';
import { fetchBTCMapLocations } from '../../utils/btcmapApi';

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
  const { currentLocation, userLocations, checkLocationPermission, startWatchingLocation } = useLocationStore();
  const settings = useMapStore(state => state.settings);
  const user = useUserStore(state => state);
  const { addNotification } = useNotificationStore();

  const [mapCenter] = useState<[number, number]>(settings.defaultCenter);
  const [mapZoom] = useState(settings.defaultZoom);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

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

  return (
    <div className="flex-1 relative mt-14 mb-14 touch-none">
      {isLocating && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 flex flex-col items-center">
          <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
          <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Locating…</span>
        </div>
      )}
      
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