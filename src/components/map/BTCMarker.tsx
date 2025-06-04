import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { BTCMapLocation } from '../../types';
import { Bitcoin } from 'lucide-react';

interface BTCMarkerProps {
  location: BTCMapLocation;
  onClick?: (location: BTCMapLocation) => void;
  typeColors: Record<string, string>;
}

// SVG icon created as a data URL
const createIcon = (type: string, typeColors: Record<string, string>) => {
  const color = typeColors[type] || typeColors.default || '#F7931A';
  const svgPin = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svgPin)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

export function BTCMarker({ location, onClick, typeColors }: BTCMarkerProps) {
  const icon = createIcon(location.type, typeColors);
  
  const handleClick = () => {
    onClick?.(location);
  };
  
  return (
    <Marker
      position={[location.latitude, location.longitude]}
      icon={icon}
      eventHandlers={{
        click: handleClick,
      }}
    >
      <Popup className="rounded-lg shadow-md">
        <div className="p-2">
          <div className="flex items-center">
            <Bitcoin className="h-4 w-4 text-[#F7931A] mr-1" />
            <span className="font-medium text-[#0F172A]">{location.name}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Type: {location.type}
          </div>
          {location.description && (
            <div className="text-sm mt-1 text-gray-700">
              {location.description.length > 100 
                ? `${location.description.substring(0, 100)}...` 
                : location.description}
            </div>
          )}
          {location.website && (
            <a
              href={location.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 mt-1 block hover:underline"
            >
              Visit website
            </a>
          )}
        </div>
      </Popup>
    </Marker>
  );
}