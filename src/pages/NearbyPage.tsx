import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, User, RefreshCw } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useLocationStore } from '../store/locationStore';
import { formatDateTime, getDistance, formatDistance, timeAgo } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { UserLocation } from '../types/index';

export function NearbyPage() {
  const { isLoggedIn } = useUserStore();
  const { userLocations, currentLocation } = useLocationStore();
  const navigate = useNavigate();
  const [sortedLocations, setSortedLocations] = useState<(UserLocation & { distance?: number })[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);
  
  useEffect(() => {
    if (currentLocation && userLocations.length > 0) {
      const locationsWithDistance = userLocations.map(loc => ({
        ...loc,
        distance: getDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          loc.latitude,
          loc.longitude
        )
      }));
      
      // Sort by distance
      locationsWithDistance.sort((a, b) => {
        if (a.distance && b.distance) {
          return a.distance - b.distance;
        }
        return 0;
      });
      
      setSortedLocations(locationsWithDistance);
    } else {
      setSortedLocations(userLocations);
    }
  }, [userLocations, currentLocation]);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh - in a real app, this would trigger a re-fetch of locations
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };
  
  return (
    <div className="container max-w-md mx-auto px-4 py-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nearby Users</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRefresh}
          isLoading={isRefreshing}
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>
      
      {sortedLocations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No nearby users</h3>
          <p className="text-gray-500 dark:text-gray-400">
            There are no other users sharing their location at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedLocations.map((location) => (
            <div 
              key={location.pubkey}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => navigate(`/map?user=${location.pubkey}`)}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {location.picture ? (
                    <img 
                      src={location.picture}
                      alt={location.name}
                      className="h-12 w-12 rounded-full border-2 border-[#F7931A]"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {location.displayName || location.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Last seen: {timeAgo(location.lastUpdated)}
                  </p>
                </div>
                {location.distance !== undefined && (
                  <div className="flex-shrink-0 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFF5EA] text-[#F7931A]">
                      <MapPin className="h-3 w-3 mr-1" />
                      {formatDistance(location.distance)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}