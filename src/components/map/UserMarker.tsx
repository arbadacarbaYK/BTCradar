import React, { useState, useEffect } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Icon, Point } from 'leaflet';
import { UserLocation } from '../../types';
import { formatDateTime, getDistance, formatDistance } from '../../utils/helpers';
import { getUserZapEndpoint, subscribeToGroupZaps } from '../../utils/nostr';
import { ZapButton } from '../ZapButton';

interface UserMarkerProps {
  location: UserLocation;
  currentLocation?: { latitude: number; longitude: number } | null;
  onClick?: () => void;
  isCurrentUser?: boolean;
}

export function UserMarker({ location, currentLocation, onClick, isCurrentUser }: UserMarkerProps) {
  const [imageError, setImageError] = useState(false);
  const [zapAddress, setZapAddress] = React.useState<string | null>(null);
  const [zapCount, setZapCount] = React.useState<number>(0);
  
  // Log profile picture info in development
  useEffect(() => {
    if (import.meta.env.DEV && isCurrentUser) {
      console.log('UserMarker profile picture:', {
        pubkey: location.pubkey,
        picture: location.picture,
        hasError: imageError
      });
    }
  }, [location.picture, imageError, isCurrentUser, location.pubkey]);
  
  const getFallbackImage = () => {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${location.pubkey}&backgroundColor=b6e3f4`;
  };

  const getProfileImage = () => {
    if (imageError || !location.picture || location.picture === '') {
      return getFallbackImage();
    }
    return location.picture;
  };

  const userIcon = new Icon({
    iconUrl: getProfileImage(),
    iconSize: new Point(48, 48),
    iconAnchor: new Point(24, 48),
    popupAnchor: new Point(0, -48),
    className: `rounded-full border-3 shadow-lg ${isCurrentUser ? 'border-[#F7931A] animate-pulse' : 'border-blue-500'}`,
  });

  let distance: string | undefined;
  if (currentLocation) {
    const distanceInKm = getDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      location.latitude,
      location.longitude
    );
    distance = formatDistance(distanceInKm);
  }

  const handleClick = () => {
    onClick?.();
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (import.meta.env.DEV) {
      console.warn('Image load error:', {
        pubkey: location.pubkey,
        src: (e.target as HTMLImageElement).src,
        error: e
      });
    }
    setImageError(true);
  };

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let isMounted = true;
    async function fetchZapInfo() {
      if (!location.pubkey) return;
      const address = await getUserZapEndpoint(location.pubkey);
      if (isMounted) setZapAddress(address);
      unsub = subscribeToGroupZaps('common', (event) => {
        if (event.tags.some(tag => tag[0] === 'p' && tag[1] === location.pubkey)) {
          setZapCount((prev) => prev + 1);
        }
      });
    }
    fetchZapInfo();
    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, [location.pubkey]);

  return (
    <Marker
      position={[location.latitude, location.longitude]}
      icon={userIcon}
      eventHandlers={{
        click: handleClick,
      }}
    >
      <Popup className="rounded-2xl shadow-2xl bg-[#181A20]/95 border-2 border-[#8B5CF6]/30 p-0 m-0 backdrop-blur-md min-w-[260px] max-w-[340px]">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <img 
              src={getProfileImage()}
              alt={location.displayName || location.name}
              className="w-12 h-12 rounded-full border-2 border-[#F7931A] shadow-md bg-[#23262F]"
              onError={handleImageError}
            />
            <div>
              <div className="font-extrabold text-lg text-[#F7931A] dark:text-[#F7931A] mb-1">
                {location.displayName || location.name}
                {isCurrentUser && <span className="ml-2 text-xs text-[#8B5CF6]">(You)</span>}
              </div>
              <div className="text-xs text-gray-400 mb-1">
                Last updated: {formatDateTime(location.lastUpdated)}
              </div>
              {zapAddress && (
                <div className="text-xs text-[#8B5CF6] mt-1 font-bold">⚡ {zapAddress}</div>
              )}
              <div className="text-xs text-[#F7931A] mt-1 font-bold">Zaps: {zapCount}</div>
            </div>
          </div>
          {distance && (
            <div className="text-sm mb-2 font-bold text-[#8B5CF6]">
              {distance} from you
            </div>
          )}
          <div className="mt-2">
            <ZapButton
              recipientPubkey={location.pubkey}
              recipientName={location.displayName || location.name}
              group={{ id: 'common', name: 'BTCradar', memberPubkeys: [], startDate: 0, endDate: 0, organizerPubkey: '', tags: [] }}
            />
          </div>
        </div>
      </Popup>
    </Marker>
  );
}