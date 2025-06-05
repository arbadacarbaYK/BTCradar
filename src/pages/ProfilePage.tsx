import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useLocationStore } from '../store/locationStore';
import { Button } from '../components/ui/Button';
import { formatDateTime } from '../utils/helpers';
import { nip19 } from 'nostr-tools';
import { getUserZapEndpoint, subscribeToGroupZaps, fetchAllZapsForPubkey } from '../utils/nostr';
import { ZapButton } from '../components/ZapButton';
import type { Event as NostrToolsEvent } from 'nostr-tools';

export function ProfilePage() {
  const user = useUserStore(state => ({
    pubkey: state.pubkey,
    name: state.name,
    displayName: state.displayName,
    picture: state.picture,
    about: state.about,
    isLoggedIn: state.isLoggedIn,
    isLocationSharing: state.isLocationSharing,
    nip05: state.nip05,
  }));
  const isLoggedIn = useUserStore(state => state.isLoggedIn);
  const clearUser = useUserStore(state => state.clearUser);
  const { currentLocation, stopWatchingLocation } = useLocationStore();
  const navigate = useNavigate();
  const [zapAddress, setZapAddress] = React.useState<string | null>(null);
  const [zapCount, setZapCount] = React.useState<number>(0);
  const [zapEvents, setZapEvents] = React.useState<NostrToolsEvent[]>([]);
  
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
  }, [isLoggedIn, navigate]);
  
  const handleLogout = () => {
    stopWatchingLocation();
    clearUser();
    navigate('/login');
  };
  
  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    let isMounted = true;
    async function fetchZapInfo() {
      if (!user.pubkey) return;
      const address = await getUserZapEndpoint(user.pubkey);
      if (isMounted) setZapAddress(address);
      // Fetch all historical zaps
      const allZaps = await fetchAllZapsForPubkey(user.pubkey);
      if (isMounted) {
        setZapEvents(allZaps);
        setZapCount(allZaps.length);
      }
      // Subscribe to new zaps
      unsub = subscribeToGroupZaps('common', (event) => {
        if (event.tags.some(tag => tag[0] === 'p' && tag[1] === user.pubkey)) {
          setZapEvents((prev) => {
            // Avoid duplicates by event id
            if (prev.some(e => e.id === event.id)) return prev;
            return [event, ...prev];
          });
          setZapCount((prev) => prev + 1);
        }
      });
    }
    fetchZapInfo();
    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, [user.pubkey]);

  if (!user) {
    return null;
  }
  
  const pubkeyString = user.pubkey === null || user.pubkey === undefined ? '' : user.pubkey;
  const npub = nip19.npubEncode(pubkeyString);

  return (
    <div className="container max-w-md mx-auto px-4 py-8 md:py-20">
      <div className="bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-2xl border-4 border-transparent bg-clip-padding p-0 relative" style={{ borderImage: 'linear-gradient(90deg, #F7931A, #8B5CF6) 1' }}>
        <div className="h-24 bg-gradient-to-r from-[#F7931A]/80 to-[#8B5CF6]/80 rounded-t-2xl"></div>
        <div className="px-4 md:px-6 py-4 md:py-5 relative">
          <div className="absolute -top-12 left-6">
            {(user.picture && user.picture !== '') ? (
              <img 
                src={user.picture} 
                alt={user.displayName || user.name || npub} 
                className="h-24 w-24 rounded-full border-4 border-[#8B5CF6] shadow-xl bg-white object-cover"
              />
            ) : (
              <img
                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${user.pubkey}`}
                alt={user.displayName || user.name || npub}
                className="h-24 w-24 rounded-full border-4 border-[#F7931A] shadow-xl bg-white object-cover"
              />
            )}
          </div>
          <div className="mt-16 text-sm md:text-base">
            <h1 className="text-lg md:text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              {user.displayName || user.name}
              <span className="inline-block px-2 py-0.5 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] text-xs font-bold ml-2">@BTCradar</span>
            </h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 font-semibold">Shadowy supercoder (or just a pleb)? You belong here.</p>
            {user.about && (
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-line">{user.about}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3 text-xs md:text-sm">
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#F7931A]/10 text-[#F7931A] text-xs font-bold border border-[#F7931A]/30">{npub}</span>
              {user.nip05 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] text-xs font-bold border border-[#8B5CF6]/30">{user.nip05}</span>
              )}
              {zapAddress && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] text-xs font-bold border border-[#8B5CF6]/30">⚡ {zapAddress}</span>
              )}
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#F7931A]/10 text-[#F7931A] text-xs font-bold border border-[#F7931A]/30">Zaps: {zapCount}</span>
            </div>
            <div className="mt-6 space-y-3 md:space-y-4">
              <div className="flex items-center text-gray-700 dark:text-gray-300 text-xs md:text-sm">
                <MapPin className="h-5 w-5 mr-2 text-[#F7931A]" />
                {currentLocation ? (
                  <span>
                    {currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)}
                  </span>
                ) : (
                  <span>Location not available</span>
                )}
              </div>
              <div className="flex items-center text-gray-700 dark:text-gray-300 text-xs md:text-sm">
                <Clock className="h-5 w-5 mr-2 text-[#8B5CF6]" />
                <span>Last updated: {formatDateTime(Date.now())}</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs md:text-sm">
                <ZapButton
                  recipientPubkey={user.pubkey || ''}
                  recipientName={user.displayName || user.name || npub}
                  group={{
                    id: 'common',
                    name: 'BTCradar',
                    memberPubkeys: [],
                    startDate: 0,
                    endDate: 0,
                    organizerPubkey: '',
                    tags: [],
                  }}
                />
                <Button
                  variant="outline"
                  className="border-[#8B5CF6] text-[#8B5CF6] font-bold rounded-full px-6 py-2"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* All Time Zaps Section */}
      <div className="bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-xl border mt-8 p-4 md:p-6">
        <h2 className="text-base md:text-lg font-bold text-[#F7931A] mb-4">All Time Zaps</h2>
        {zapEvents.length === 0 ? (
          <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">No zaps received yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 text-xs md:text-sm">
            {zapEvents.map((event, idx) => {
              const amountTag = event.tags.find((tag: string[]) => tag[0] === 'amount');
              const amount = amountTag ? amountTag[1] : '?';
              const fromTag = event.pubkey;
              return (
                <li key={event.id + idx} className="py-2 flex flex-col">
                  <span className="font-bold text-[#8B5CF6]">From: {fromTag.slice(0, 12)}...{fromTag.slice(-6)}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Amount: <span className="font-bold text-[#F7931A]">{amount}</span> sats</span>
                  <span className="text-xs text-gray-400">At: {formatDateTime(event.created_at * 1000)}</span>
                  {event.content && <span className="text-xs text-gray-500 mt-1">Comment: {event.content}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}