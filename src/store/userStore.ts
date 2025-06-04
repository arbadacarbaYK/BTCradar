import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UserState {
  id: string | null;
  pubkey: string | null;
  name: string | null;
  displayName: string | null;
  picture: string | null;
  about?: string | null;
  nip05?: string | null;
  isLoggedIn: boolean;
  isLocationSharing: boolean;
  hydrated: boolean;
  privateKey?: string | null; // in-memory only
  setHydrated: (hydrated: boolean) => void;
  
  // Actions
  setUser: (user: Partial<UserState>) => void;
  clearUser: () => void;
  setLocationSharing: (isSharing: boolean) => void;
  login: (key: string) => Promise<void>;
}

type StoredUserState = Pick<UserState, 'id' | 'pubkey' | 'name' | 'displayName' | 'picture' | 'about' | 'nip05' | 'isLoggedIn' | 'isLocationSharing'>;

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      id: null,
      pubkey: null,
      name: null,
      displayName: null,
      picture: null,
      about: undefined,
      nip05: undefined,
      isLoggedIn: false,
      isLocationSharing: false,
      hydrated: false,
      privateKey: undefined,
      setHydrated: (hydrated) => {
        if (hydrated && !get().hydrated) {
          set({ hydrated });
        }
      },
      
      setUser: (user) => set((state) => ({ ...state, ...user, isLoggedIn: true })),
      
      clearUser: () => {
        // Clear all storage data
        sessionStorage.clear();
        localStorage.clear();
        
        set({
          id: null,
          pubkey: null,
          name: null,
          displayName: null,
          picture: null,
          about: undefined,
          nip05: undefined,
          isLoggedIn: false,
          isLocationSharing: false,
          hydrated: true,
          privateKey: null,
        });
      },
      
      setLocationSharing: (isSharing) => set({ isLocationSharing: isSharing }),

      login: async (key: string) => {
        if (!key || key.length === 0) throw new Error('No key provided');
        let pubkey = '';
        let privkey: string | null = null;
        let name = '';
        let displayName = '';
        let picture = '';
        let about = '';
        let nip05 = '';
        try {
          if (key.startsWith('nsec')) {
            // nsec: decode to hex, derive pubkey
            const nsecToHex = (await import('../utils/nostr')).nsecToHex;
            privkey = nsecToHex(key);
            if (!privkey) throw new Error('Invalid nsec');
            const { getPublicKey } = await import('nostr-tools');
            pubkey = getPublicKey(privkey);
            console.log('Login with nsec, derived pubkey:', pubkey);
          } else if (key.length === 64 && /^[a-f0-9]{64}$/i.test(key)) {
            // hex private key
            privkey = key;
            const { getPublicKey } = await import('nostr-tools');
            pubkey = getPublicKey(privkey);
            console.log('Login with hex privkey, derived pubkey:', pubkey);
          } else if (key.startsWith('npub')) {
            // npub: decode to hex pubkey
            const npubToHex = (await import('../utils/nostr')).npubToHex;
            pubkey = npubToHex(key) || '';
            if (!pubkey) throw new Error('Invalid npub');
            console.log('Login with npub:', pubkey);
          } else {
            throw new Error('Invalid key format');
          }

          // Always fetch the latest profile, but with a timeout
          const { getUserProfile } = await import('../utils/nostr');
          let profile: import('../types/index').NostrProfile | null = null;
          try {
            profile = await Promise.race([
              getUserProfile(pubkey),
              new Promise((resolve) => setTimeout(() => resolve(null), 5000))
            ]) as import('../types/index').NostrProfile | null;
          } catch (e) {
            console.warn('Profile fetch failed or timed out:', e);
            profile = null;
          }

          if (profile) {
            name = profile.name || '';
            displayName = profile.display_name || '';
            picture = profile.picture || '';
            about = profile.about || '';
            nip05 = profile.nip05 || '';
            console.log('Fetched profile:', profile);
          } else {
            console.warn('No Nostr profile found for pubkey:', pubkey);
          }

          // Only use fallback if picture is missing or empty
          if (!picture) {
            picture = `https://api.dicebear.com/7.x/identicon/svg?seed=${pubkey}`;
          }

          // Update the user store (do not set privkey if not in UserState)
          set({
            pubkey,
            name,
            displayName,
            picture,
            about,
            nip05,
            isLoggedIn: true,
            isLocationSharing: false,
            privateKey: privkey || null,
          });
          console.log('User store updated:', { pubkey, name, displayName, picture, about, nip05 });
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      },
    }),
    {
      name: 'btcmaps-user',
      storage: createJSONStorage(() => ({
        getItem: (name): string | null => {
          // Try session storage first
          const sessionData = sessionStorage.getItem(name);
          if (sessionData) return sessionData;
          
          // Fall back to local storage if user chose to persist
          const localData = localStorage.getItem(name);
          return localData;
        },
        setItem: (name, value) => {
          const strValue = JSON.stringify(value);
          // Always store in session
          sessionStorage.setItem(name, strValue);
          
          // Also store in local if user chose to persist
          const persistStr = localStorage.getItem(name);
          if (persistStr) {
            localStorage.setItem(name, strValue);
          }
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
          localStorage.removeItem(name);
        },
      })),
      partialize: (state): StoredUserState => ({
        id: state.id,
        pubkey: state.pubkey,
        name: state.name,
        displayName: state.displayName,
        picture: state.picture,
        about: state.about,
        nip05: state.nip05,
        isLoggedIn: state.isLoggedIn,
        isLocationSharing: state.isLocationSharing,
      }),
      onRehydrateStorage: () => () => {
        // No-op or handle hydration in the main function if needed
        // Hydration is handled via setHydrated elsewhere
      },
    }
  )
);