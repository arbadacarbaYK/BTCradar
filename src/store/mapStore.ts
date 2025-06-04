import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MapSettings, BTCMapLocation } from '../types/index';

interface MapState {
  settings: MapSettings;
  btcMapLocations: BTCMapLocation[];
  isFetchingLocations: boolean;
  isMapInitialized: boolean;
  selectedLocation: string | null;
  
  // Actions
  updateSettings: (settings: Partial<MapSettings>) => void;
  setBTCMapLocations: (locations: BTCMapLocation[]) => void;
  addBTCMapLocation: (location: BTCMapLocation) => void;
  setFetchingLocations: (isFetching: boolean) => void;
  setMapInitialized: (isInitialized: boolean) => void;
  setSelectedLocation: (locationId: string | null) => void;
}

const DEFAULT_SETTINGS: MapSettings = {
  defaultCenter: [0, 0],
  defaultZoom: 13,
  showUserLocation: true,
  showOtherUsers: true,
  showBTCMapLocations: true,
};

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      btcMapLocations: [],
      isFetchingLocations: false,
      isMapInitialized: false,
      selectedLocation: null,
      
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
          },
        }));
      },
        
      setBTCMapLocations: (locations) => {
        set({ btcMapLocations: locations });
      },
        
      addBTCMapLocation: (location) => {
        set((state) => ({ 
          btcMapLocations: [...state.btcMapLocations, location] 
        }));
      },
        
      setFetchingLocations: (isFetching) => {
        set({ isFetchingLocations: isFetching });
      },
        
      setMapInitialized: (isInitialized) => {
        set({ isMapInitialized: isInitialized });
      },
        
      setSelectedLocation: (locationId) => {
        set({ selectedLocation: locationId });
      },
    }),
    {
      name: 'btcmaps-map-storage',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);