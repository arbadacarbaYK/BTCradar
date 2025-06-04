import { BTCMapLocation } from '../types';

interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Fetch BTC Map locations
export async function fetchBTCMapLocations(bounds: BoundingBox): Promise<BTCMapLocation[]> {
  try {
    // Convert to bbox: lon1,lat1,lon2,lat2 (SW, NE)
    const bbox = [
      bounds.west,  // lon1 (SW)
      bounds.south, // lat1 (SW)
      bounds.east,  // lon2 (NE)
      bounds.north  // lat2 (NE)
    ].join(',');

    // NOTE: The /v1/places?bbox=... endpoint is deprecated and returns 404 as of 2024-06. See: https://btcmap.org/api-docs
    // The new endpoint is /v1/places/within-bbox?bbox=lon1,lat1,lon2,lat2
    const url = `https://api.btcmap.org/v1/places/within-bbox?bbox=${bbox}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`BTC Map API error: ${response.status} for URL: ${url}`);
      if (response.status === 404) {
        // Endpoint not found, return empty array and log
        return [];
      }
      throw new Error(`BTC Map API error: ${response.status}`);
    }

    const geojson = await response.json();
    if (!geojson.features) return [];

    // Map GeoJSON features to your BTCMapLocation type
    return geojson.features.map((feature: {
      properties: {
        id?: string | number;
        name?: string | null;
        type?: string | null;
        description?: string | null;
        website?: string | null;
        openingHours?: string | null;
        address?: string | null;
        city?: string | null;
        country?: string | null;
      };
      geometry: {
        coordinates: [number, number];
      };
    }) => ({
      id: feature.properties.id?.toString() ?? '',
      name: feature.properties.name || 'Unknown Location',
      type: feature.properties.type || 'unknown',
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
      description: feature.properties.description || undefined,
      website: feature.properties.website || undefined,
      openingHours: feature.properties.openingHours || undefined,
      address: feature.properties.address || undefined,
      city: feature.properties.city || undefined,
      country: feature.properties.country || undefined,
    }));
  } catch (error) {
    console.error('Error fetching BTC Map locations:', error);
    throw error;
  }
}

// Fetch a single location by ID
export async function fetchBTCMapLocationById(id: string): Promise<BTCMapLocation | null> {
  try {
    const response = await fetch(`https://api.btcmap.org/v1/places/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`BTC Map API error: ${response.status}`);
    }
    const feature = await response.json();
    // GeoJSON single feature
    return {
      id: feature.properties.id?.toString() ?? '',
      name: feature.properties.name || 'Unknown Location',
      type: feature.properties.type || 'unknown',
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
      description: feature.properties.description || undefined,
      website: feature.properties.website || undefined,
      openingHours: feature.properties.openingHours || undefined,
      address: feature.properties.address || undefined,
      city: feature.properties.city || undefined,
      country: feature.properties.country || undefined,
    };
  } catch (error) {
    console.error('Error fetching BTC Map location:', error);
    return null;
  }
}

// Get location types (categories)
export async function fetchBTCMapLocationTypes(): Promise<string[]> {
  try {
    const response = await fetch(`https://api.btcmap.org/v1/categories`);
    if (!response.ok) {
      throw new Error(`BTC Map API error: ${response.status}`);
    }
    const data = await response.json();
    // API returns { categories: [ { id: string, name: string, ... }, ... ] }
    return Array.isArray(data.categories)
      ? data.categories.map((cat: { id: string }) => cat.id)
      : [];
  } catch (error) {
    console.error('Error fetching BTC Map location types:', error);
    return [];
  }
}