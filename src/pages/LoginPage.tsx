import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bitcoin, Key, Ghost } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useLocationStore } from '../store/locationStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { nsecToHex } from '../utils/nostr';
import { useNotificationStore } from '../store/notificationStore';
import { Event } from 'nostr-tools';

// Define the window.nostr type
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: Event): Promise<Event>;
      getRelays(): Promise<{ [url: string]: { read: boolean; write: boolean } }>;
    };
  }
}

export function LoginPage() {
  const { login, isLoggedIn } = useUserStore();
  const { startWatchingLocation } = useLocationStore();
  const { addNotification } = useNotificationStore();
  const [privateKey, setPrivateKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, navigate]);
  
  const handleNsecLogin = async () => {
    try {
      setIsLoading(true);
      
      // First try to login
      const hexKey = nsecToHex(privateKey);
      if (!hexKey) {
        throw new Error('Invalid private key format');
      }
      await login(hexKey);
      
      // After successful login, request location permission
      const locationGranted = await startWatchingLocation();
      if (!locationGranted) {
        addNotification('Location permission is required to use the app', 'error');
        navigate('/location-settings');
        return;
      }
      
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      addNotification(error instanceof Error ? error.message : 'Failed to login', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNip07Login = async () => {
    try {
      setIsLoading(true);
      
      if (window.nostr) {
        const pubkey = await window.nostr.getPublicKey();
        await login(pubkey);
        
        // After successful login, request location permission
        const locationGranted = await startWatchingLocation();
        if (!locationGranted) {
          addNotification('Location permission is required to use the app', 'error');
          navigate('/location-settings');
          return;
        }
        
        navigate('/');
      } else {
        throw new Error('NIP-07 extension not found');
      }
    } catch (error) {
      console.error('Login error:', error);
      addNotification(error instanceof Error ? error.message : 'Failed to login', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#F7931A]/30 via-white to-[#8B5CF6]/30 dark:from-[#0F172A] dark:via-gray-900 dark:to-[#8B5CF6]/20">
      <div className="max-w-md w-full space-y-8 bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-2xl border border-[#F7931A]/20 dark:border-[#8B5CF6]/20 backdrop-blur-md p-8">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Ghost className="h-14 w-14 text-[#8B5CF6] animate-bounce drop-shadow-lg" />
          </div>
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            BTCradar
          </h2>
          <p className="mt-2 text-base font-medium text-[#8B5CF6] dark:text-[#F7931A]">
            Find your frens, zap, and never get lost again.
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Connect with Nostr and enable location sharing after login
          </p>
        </div>
        <div className="mt-8 py-8 px-4 sm:px-10 space-y-6">
          <div>
            <label htmlFor="private-key" className="sr-only">
              Private Key (nsec or hex)
            </label>
            <Input
              id="private-key"
              type="password"
              placeholder="nsec1..."
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              disabled={isLoading}
              fullWidth
              className="rounded-lg shadow-md border border-[#8B5CF6]/30 focus:ring-[#8B5CF6]"
            />
          </div>
          <div>
            <Button
              onClick={handleNsecLogin}
              className="w-full flex justify-center py-2 px-4 rounded-lg shadow-md bg-[#F7931A] hover:bg-[#E78008] text-white font-bold text-base"
              disabled={!privateKey || isLoading}
            >
              <Key className="h-5 w-5 mr-2" />
              Login with Private Key
            </Button>
            <Button
              onClick={handleNip07Login}
              className="w-full flex justify-center py-2 px-4 mt-4 rounded-lg shadow-md bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-base"
              disabled={isLoading}
            >
              <Bitcoin className="h-5 w-5 mr-2" />
              Login with Extension
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}