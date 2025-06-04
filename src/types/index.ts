export interface User {
  id: string;
  pubkey: string;
  name: string;
  displayName?: string;
  picture?: string;
  nip05?: string;
  about?: string;
  isLoggedIn: boolean;
  isLocationSharing: boolean;
  lastUpdated?: number;
}

export interface UserLocation {
  pubkey: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  lastUpdated: number;
  name?: string;
  displayName?: string;
  picture?: string;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  startDate: number;
  endDate: number;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  organizerPubkey: string;
}

export interface MapSettings {
  defaultCenter: [number, number];
  defaultZoom: number;
  showUserLocation: boolean;
  showOtherUsers: boolean;
  showBTCMapLocations: boolean;
}

export interface BTCMapLocation {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  description?: string;
  website?: string;
  openingHours?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface NostrProfile {
  pubkey: string;
  name?: string;
  display_name?: string;
  picture?: string;
  nip05?: string;
  about?: string;
  lud16?: string;
  lud06?: string;
}

export interface NostrEventMessage {
  subscriptionId: string;
  event: NostrEvent;
}

export interface ConferenceGroup {
  id: string;
  name: string;
  description?: string;
  startDate: number;
  endDate: number;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  organizerPubkey: string;
  tags: string[];
  memberPubkeys: string[];
}

export interface GroupMembership {
  groupId: string;
  userPubkey: string;
  joinedAt: number;
  role: 'member' | 'organizer';
}

export interface GeolocationStatus {
  isAvailable: boolean;
  isPermissionGranted: boolean;
  error?: string;
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

// BTCMap API types
export interface BTCMapAPIResponse {
  id: number;
  name: string | null;
  latitude: number;
  longitude: number;
  type: string | null;
  description: string | null;
  website: string | null;
}