import { 
  SimplePool, 
  getEventHash, 
  signEvent, 
  validateEvent,
  nip19,
  nip04,
  type Event as NostrToolsEvent,
  type Filter,
  getPublicKey
} from 'nostr-tools';
import { NostrProfile, ConferenceGroup, UserLocation } from '../types/index';

// Define the window.nostr type
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: NostrToolsEvent): Promise<NostrToolsEvent>;
      nip04: {
        encrypt(pubkey: string, content: string): Promise<string>;
        decrypt(pubkey: string, content: string): Promise<string>;
      };
      getRelays(): Promise<{ [url: string]: { read: boolean; write: boolean } }>;
    };
  }
}

// IMPORTANT: Add relays here where your Nostr profile is published!
export const RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://relay.nostr.band',
  'wss://nostr.mom',
  'wss://relay.noderunners.network',
  'wss://nostr.einundzwanzig.space',
  // Add more relays as needed, especially where your profile is published
];

// Create a pool of relays
const pool = new SimplePool();

// Verify an event
function verifyEvent(event: NostrToolsEvent): boolean {
  return validateEvent(event);
}

// Get user profile from Nostr
export async function getUserProfile(pubkey: string): Promise<NostrProfile | null> {
  console.log('getUserProfile called', pubkey);
  try {
    console.log('Fetching Nostr profile for pubkey:', pubkey);
    const promises = RELAYS.map(async (relay) => {
      try {
        console.log('Querying relay:', relay);
        const ws = new WebSocket(relay);
        return new Promise<NostrProfile | null>((resolve) => {
          let resolved = false;
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              ws.close();
              console.log('Relay timeout:', relay);
              resolve(null);
            }
          }, 5000);

          ws.onopen = () => {
            console.log('WebSocket opened for relay:', relay);
            ws.send(JSON.stringify([
              'REQ',
              'profile',
      {
        kinds: [0],
        authors: [pubkey],
                limit: 1
              }
            ]));
          };

          ws.onmessage = (msg) => {
            try {
              console.log('WebSocket message from relay', relay, msg.data);
              const data = JSON.parse(msg.data);
              if (data[0] === 'EVENT' && data[2] && data[2].kind === 0) {
                const profile = JSON.parse(data[2].content);
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timeout);
                  ws.close();
                  console.log('Profile found on relay', relay, profile);
                  resolve({
        pubkey,
                    name: profile.name,
                    display_name: profile.display_name,
                    picture: profile.picture,
                    nip05: profile.nip05,
                    about: profile.about,
                    lud16: profile.lud16,
                    lud06: profile.lud06,
                  });
                }
              }
            } catch (error) {
              console.error('Failed to parse profile:', error);
            }
          };

          ws.onerror = (error) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              ws.close();
              console.error(`Failed to fetch profile from ${relay}:`, error);
              resolve(null);
            }
          };

          ws.onclose = () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              console.log('WebSocket closed for relay:', relay);
              resolve(null);
            }
          };
        });
      } catch (error) {
        console.error(`Failed to connect to ${relay}:`, error);
        return null;
      }
    });

    // Wait for all relays, but pick the first non-null profile
    const results = await Promise.allSettled(promises);
    const firstProfile = results.find(
      (result): result is PromiseFulfilledResult<NostrProfile> =>
        result.status === 'fulfilled' && result.value !== null && Boolean(result.value && result.value.picture)
    );
    if (firstProfile) {
      return firstProfile.value;
    }
    // fallback: try any non-null profile
    const anyProfile = results.find(
      (result): result is PromiseFulfilledResult<NostrProfile> =>
        result.status === 'fulfilled' && result.value !== null
    );
    if (anyProfile) {
      return anyProfile.value;
    }
    console.warn('No Nostr profile found for pubkey:', pubkey);
    return null;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
}

// Publish encrypted location update to group members
export async function publishLocationUpdate(
  privateKey: string | null,
  pubkey: string,
  latitude: number,
  longitude: number,
  accuracy?: number,
  group?: ConferenceGroup
): Promise<string | null> {
  try {
    if (!group) return null; // Only share location within groups

    const content = JSON.stringify({
      type: 'location',
      latitude,
      longitude,
      accuracy,
      timestamp: Math.floor(Date.now() / 1000)
    });

    // Create encrypted events for each group member
    const publishPromises = group.memberPubkeys
      .filter(memberPubkey => memberPubkey !== pubkey) // Don't send to self
      .map(async (recipientPubkey) => {
        let encryptedContent: string;

        // Try NIP-07 first
        if (window.nostr?.nip04) {
          try {
            encryptedContent = await window.nostr.nip04.encrypt(recipientPubkey, content);
          } catch (e) {
            console.error('NIP-07 encryption failed, falling back to private key:', e);
            if (!privateKey) return null;
            encryptedContent = await nip04.encrypt(privateKey, recipientPubkey, content);
          }
        } else {
          // Fallback to private key encryption
          if (!privateKey) return null;
          encryptedContent = await nip04.encrypt(privateKey, recipientPubkey, content);
        }

        const event: NostrToolsEvent = {
          kind: 4, // Encrypted Direct Message
      pubkey,
      created_at: Math.floor(Date.now() / 1000),
          tags: [
            ['p', recipientPubkey],
            ['g', group.id], // Tag with group ID
            ['t', 'location'] // Tag for filtering
          ],
          content: encryptedContent,
      id: '',
      sig: ''
    };

        // Get the event hash
    event.id = getEventHash(event);

        // Sign the event
        if (window.nostr) {
          try {
            const signedEvent = await window.nostr.signEvent({
              kind: event.kind,
              created_at: event.created_at,
              tags: event.tags,
              content: event.content,
              pubkey: event.pubkey,
              id: event.id,
              sig: ''
            });

        if (verifyEvent(signedEvent)) {
              const pubs = pool.publish(RELAYS, signedEvent);
          await Promise.all(pubs);
          return signedEvent.id;
        }
      } catch (e) {
        console.error('NIP-07 signing failed, falling back to private key:', e);
      }
    }

    if (privateKey) {
      event.sig = signEvent(event, privateKey);
      if (verifyEvent(event)) {
            const pubs = pool.publish(RELAYS, event);
        await Promise.all(pubs);
        return event.id;
      }
    }

    return null;
      });

    const results = await Promise.all(publishPromises);
    return results.find((id: string | null) => id !== null) || null;
  } catch (error) {
    console.error('Error publishing encrypted location update:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Subscribe to encrypted location updates for a group
export function subscribeToLocationUpdates(
  privateKey: string | null,
  pubkey: string,
  group: ConferenceGroup,
  callback: (event: NostrToolsEvent) => void
) {
  const filter: Filter = {
    kinds: [4], // Encrypted Direct Messages
    '#g': [group.id], // Filter by group
    '#t': ['location'] // Filter by location tag
  };

  const sub = pool.sub(RELAYS, [filter]);

  sub.on('event', async (event: NostrToolsEvent) => {
    if (!verifyEvent(event)) return;
    
    // Only process messages where we are the recipient
    const recipientTag = event.tags.find(tag => tag[0] === 'p' && tag[1] === pubkey);
    if (!recipientTag) return;

    try {
      let decryptedContent: string;

      // Try NIP-07 first
      if (window.nostr?.nip04) {
        try {
          decryptedContent = await window.nostr.nip04.decrypt(event.pubkey, event.content);
        } catch (e) {
          console.error('NIP-07 decryption failed, falling back to private key:', e);
          if (!privateKey) return;
          decryptedContent = await nip04.decrypt(privateKey, event.pubkey, event.content);
        }
      } else {
        // Fallback to private key decryption
        if (!privateKey) return;
        decryptedContent = await nip04.decrypt(privateKey, event.pubkey, event.content);
      }

      const locationData = JSON.parse(decryptedContent);
      if (locationData.type === 'location') {
      callback(event);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error processing encrypted location update:', error.message);
      } else {
        console.error('Error processing encrypted location update:', error);
      }
    }
  });

  return () => {
    sub.unsub();
  };
}

// Convert npub to hex pubkey
export function npubToHex(npub: string): string | null {
  try {
    const { type, data } = nip19.decode(npub);
    if (type === 'npub') {
      return data as string;
    }
    return null;
  } catch (error) {
    console.error('Error converting npub to hex:', error);
    return null;
  }
}

// Convert hex pubkey to npub
export function hexToNpub(hex: string): string {
  return nip19.npubEncode(hex);
}

// Convert nsec to hex private key
export function nsecToHex(nsec: string): string | null {
  try {
    const { type, data } = nip19.decode(nsec);
    if (type === 'nsec') {
      return data as string;
    }
    return null;
  } catch (error) {
    console.error('Error converting nsec to hex:', error);
    return null;
  }
}

// Convert hex private key to nsec
export function hexToNsec(hex: string): string {
  return nip19.nsecEncode(hex);
}

// Get user's LNURL/Lightning Address from profile
export async function getUserZapEndpoint(pubkey: string): Promise<string | null> {
  try {
    const profile = await getUserProfile(pubkey);
    if (!profile) return null;

    // Check top-level fields first
    if (profile.lud16) return profile.lud16;
    if (profile.lud06) return profile.lud06;

    // Fallback: try to parse about as JSON if it looks like JSON
    if (profile.about && profile.about.trim().startsWith('{')) {
      try {
        const content = JSON.parse(profile.about);
        return content.lud16 || content.lud06 || null;
      } catch {
        // ignore
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting user zap endpoint:', error);
    return null;
  }
}

// Create a zap request event
export async function createZapRequest(
  privateKey: string | null,
  pubkey: string,
  recipientPubkey: string,
  amount: number, // Amount in sats
  comment: string = '',
  groupId: string
): Promise<NostrToolsEvent | null> {
  try {
    const event: NostrToolsEvent = {
      kind: 9734, // Zap Request
      pubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['p', recipientPubkey],
        ['amount', amount.toString()],
        ['relays', ...RELAYS],
        ['g', groupId], // Include group context
        ['description', JSON.stringify({
          content: comment,
          created_at: Math.floor(Date.now() / 1000),
        })]
      ],
      content: comment,
      id: '',
      sig: ''
    };

    event.id = getEventHash(event);

    // Try NIP-07 signing first
    if (window.nostr) {
      try {
        const signedEvent = await window.nostr.signEvent({
          kind: event.kind,
          created_at: event.created_at,
          tags: event.tags,
          content: event.content,
          pubkey: event.pubkey,
          id: event.id,
          sig: ''
        });

        if (verifyEvent(signedEvent)) {
          return signedEvent;
        }
      } catch (e) {
        console.error('NIP-07 signing failed, falling back to private key:', e);
      }
    }

    // Fallback to private key signing
    if (privateKey) {
      event.sig = signEvent(event, privateKey);
      if (verifyEvent(event)) {
        return event;
      }
    }

    return null;
  } catch (error) {
    console.error('Error creating zap request:', error);
    return null;
  }
}

// Send a zap to a user
export async function sendZap(
  privateKey: string | null,
  pubkey: string,
  recipientPubkey: string,
  amount: number,
  comment: string = '',
  groupId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get recipient's zap endpoint
    const zapEndpoint = await getUserZapEndpoint(recipientPubkey);
    console.log('[sendZap] zapEndpoint:', zapEndpoint);
    if (!zapEndpoint) {
      return { 
        success: false, 
        message: 'Recipient does not have a Lightning address configured' 
      };
    }

    // Create zap request event
    const zapRequest = await createZapRequest(
      privateKey,
      pubkey,
      recipientPubkey,
      amount,
      comment,
      groupId
    );
    console.log('[sendZap] zapRequest:', zapRequest);

    if (!zapRequest) {
      return { 
        success: false, 
        message: 'Failed to create zap request' 
      };
    }

    // Publish zap request to relays (resilient to relay errors, with timeout)
    // NOTE: This timeout is ONLY for zap publishing, not for geolocation or hydration logic.
    function withTimeout<T>(promise: Promise<T>, ms: number, relay: string): Promise<T> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout on relay: ${relay}`)), ms);
        promise.then((val) => {
          clearTimeout(timer);
          resolve(val);
        }).catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
      });
    }
    // Lowered zap relay timeout to 2000ms for faster UX (safe for zaps only)
    const pubs = pool.publish(RELAYS, zapRequest);
    const results = await Promise.allSettled(pubs.map((p, i) => withTimeout(p, 2000, RELAYS[i])));
    const failedRelays: string[] = [];
    let successCount = 0;
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        failedRelays.push(RELAYS[i]);
      } else {
        successCount++;
      }
    });
    if (successCount === 0) {
      return {
        success: false,
        message: `Failed to publish zap request to all relays (timeout or error). Errors: ${failedRelays.join(', ')}`
      };
    }

    // Get LNURL pay endpoint
    let lnurlEndpoint = zapEndpoint;
    if (zapEndpoint.includes('@')) {
      // Convert Lightning Address to LNURL
      lnurlEndpoint = `https://${zapEndpoint.split('@')[1]}/.well-known/lnurlp/${zapEndpoint.split('@')[0]}`;
    }
    console.log('[sendZap] lnurlEndpoint:', lnurlEndpoint);

    // Fetch LNURL pay params
    let lnurlData;
    try {
      const response = await fetch(lnurlEndpoint);
      lnurlData = await response.json();
      console.log('[sendZap] lnurlData:', lnurlData);
    } catch (err) {
      console.error('[sendZap] Error fetching LNURL endpoint:', err);
      return {
        success: false,
        message: 'Failed to fetch LNURL endpoint: ' + (err instanceof Error ? err.message : String(err))
      };
    }

    if (!lnurlData.callback) {
      return { 
        success: false, 
        message: 'Invalid LNURL response: ' + JSON.stringify(lnurlData) 
      };
    }

    // Add zap request to callback
    let callbackUrl;
    try {
      callbackUrl = new URL(lnurlData.callback);
      callbackUrl.searchParams.append('amount', (amount * 1000).toString()); // Convert to millisats
      callbackUrl.searchParams.append('nostr', JSON.stringify(zapRequest));
      console.log('[sendZap] callbackUrl:', callbackUrl.toString());
    } catch (err) {
      return {
        success: false,
        message: 'Failed to construct callback URL: ' + (err instanceof Error ? err.message : String(err))
      };
    }
    
    // Get invoice
    let invoiceData;
    try {
      const invoiceResponse = await fetch(callbackUrl.toString());
      invoiceData = await invoiceResponse.json();
      console.log('[sendZap] invoiceData:', invoiceData);
    } catch (err) {
      return {
        success: false,
        message: 'Failed to fetch invoice: ' + (err instanceof Error ? err.message : String(err))
      };
    }

    if (!invoiceData.pr) {
      return { 
        success: false, 
        message: 'Failed to get lightning invoice: ' + JSON.stringify(invoiceData) 
      };
    }

    // Return the payment request for the UI to handle
    return { 
      success: true, 
      message: invoiceData.pr 
    };

  } catch (error) {
    console.error('Error sending zap:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, message: error instanceof Error ? error.message : 'Failed to send zap' };
  }
}

// Subscribe to zaps in a group
export function subscribeToGroupZaps(
  groupId: string,
  callback: (event: NostrToolsEvent) => void
) {
  const sub = pool.sub(RELAYS, [
    {
      kinds: [9735], // Zap receipts
      '#g': [groupId] // Filter by group
    }
  ]);

  sub.on('event', (event: NostrToolsEvent) => {
    if (!verifyEvent(event)) return;
    callback(event);
  });

  return () => {
    sub.unsub();
  };
}

export async function publishLocation(location: UserLocation): Promise<void> {
  let pubkey: string;
  let event: NostrToolsEvent;

  if (window.nostr) {
    // NIP-07: get pubkey and sign event
    pubkey = await window.nostr.getPublicKey();
    event = {
      kind: 30023,
      pubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['g', DEFAULT_GROUP_ID],
      ],
      content: JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        lastUpdated: location.lastUpdated,
      }),
      id: '',
      sig: '',
    };
    event.id = getEventHash(event);
    const signed = await window.nostr.signEvent(event);
    event.sig = signed.sig;
  } else {
    // nsec/hex: use private key from localStorage
    const privateKey = localStorage.getItem('btcmaps-private-key');
    if (!privateKey) {
      throw new Error('No private key found');
    }
    pubkey = getPublicKey(privateKey);
    event = {
      kind: 30023,
      pubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['g', DEFAULT_GROUP_ID],
      ],
      content: JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        lastUpdated: location.lastUpdated,
      }),
      id: '',
      sig: '',
    };
    event.id = getEventHash(event);
    event.sig = signEvent(event, privateKey);
  }

  // Publish to all relays
  const promises = RELAYS.map(async (relay) => {
    try {
      const ws = new WebSocket(relay);
      return new Promise<void>((resolve, reject) => {
        ws.onopen = () => {
          ws.send(JSON.stringify(['EVENT', event]));
          setTimeout(() => {
            ws.close();
            resolve();
          }, 1000);
        };
        ws.onerror = (error) => {
          console.error(`Failed to publish to ${relay}:`, error);
          ws.close();
          reject(error);
        };
      });
    } catch (error) {
      console.error(`Failed to connect to ${relay}:`, error);
      return Promise.reject(error);
    }
  });

  await Promise.allSettled(promises);
}

// Fetch all zap events (kind 9735) for a given pubkey from all relays
export async function fetchAllZapsForPubkey(pubkey: string): Promise<NostrToolsEvent[]> {
  const filter: Filter = {
    kinds: [9735],
    '#p': [pubkey],
    limit: 100,
  };
  try {
    const events = await pool.list(RELAYS, [filter]);
    // Optionally sort by created_at descending
    return events.sort((a, b) => b.created_at - a.created_at);
  } catch (error) {
    console.error('Error fetching zap events:', error);
    return [];
  }
}

export const DEFAULT_GROUP_ID = 'btcradar-default';
export const LOCATION_KIND = 30023;

// Subscribe to all BTCradar location events (kind 30023, group tag)
export function subscribeToAllLocations(callback: (location: UserLocation) => void) {
  const filter: Filter = {
    kinds: [LOCATION_KIND],
    '#g': [DEFAULT_GROUP_ID],
    // Optionally, add a time window
  };
  const sub = pool.sub(RELAYS, [filter]);
  sub.on('event', (event: NostrToolsEvent) => {
    try {
      const content = JSON.parse(event.content);
      callback({
        pubkey: event.pubkey,
        latitude: content.latitude,
        longitude: content.longitude,
        accuracy: content.accuracy,
        lastUpdated: content.lastUpdated,
      });
    } catch {
      // ignore
    }
  });
  return () => sub.unsub();
}