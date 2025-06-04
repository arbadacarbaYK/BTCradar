import { 
  SimplePool, 
  getEventHash, 
  signEvent, 
  validateEvent,
  nip19,
  type Event as NostrToolsEvent,
  type Filter
} from 'nostr-tools';
import { ConferenceGroup, NostrEvent } from '../types/index';
import { DEFAULT_RELAYS } from './nostr';

const GROUP_KIND = 30000; // Custom kind for conference groups
const MEMBERSHIP_KIND = 30001; // Custom kind for group memberships

// Verify an event
function verifyEvent(event: NostrToolsEvent): boolean {
  return validateEvent(event);
}

// Generate an invite link for a group
export function generateGroupInviteLink(groupId: string): string {
  // Create a shareable link with the encoded group ID
  const encodedData = nip19.noteEncode(groupId);
  return `${window.location.origin}/join/${encodedData}`;
}

// Parse an invite link and extract the group ID
export function parseGroupInviteLink(inviteLink: string): string | null {
  try {
    // Extract the encoded part from the URL
    const encodedData = inviteLink.split('/join/')[1];
    if (!encodedData) return null;

    // Decode the group ID
    const { type, data } = nip19.decode(encodedData);
    if (type === 'note') {
      return data as string;
    }
    return null;
  } catch (error) {
    console.error('Error parsing invite link:', error);
    return null;
  }
}

// Create or update a conference group
export async function publishConferenceGroup(
  group: Omit<ConferenceGroup, 'id'>,
  privateKey: string | null
): Promise<string | null> {
  try {
    const content = JSON.stringify(group);
    const tags = [
      ['t', 'conference'],
      ['t', 'btcmaps'],
      ...group.tags.map(tag => ['t', tag])
    ];

    const event: NostrEvent = {
      kind: GROUP_KIND,
      pubkey: group.organizerPubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
      id: '',
      sig: ''
    };

    event.id = getEventHash(event);

    // Try NIP-07 first
    // @ts-ignore - window.nostr is provided by NIP-07 extension
    if (typeof window !== 'undefined' && window.nostr) {
      try {
        // @ts-ignore
        const signedEvent = await window.nostr.signEvent({
          kind: event.kind,
          created_at: event.created_at,
          tags: event.tags,
          content: event.content,
          pubkey: event.pubkey
        });

        if (verifyEvent(signedEvent)) {
          const pool = new SimplePool();
          const pubs = pool.publish(DEFAULT_RELAYS, signedEvent);
          await Promise.all(pubs);
          return signedEvent.id;
        }
      } catch (e) {
        console.error('NIP-07 signing failed, falling back to private key:', e);
      }
    }

    // Fallback to private key signing
    if (privateKey) {
      event.sig = signEvent(event, privateKey);
      if (verifyEvent(event)) {
        const pool = new SimplePool();
        const pubs = pool.publish(DEFAULT_RELAYS, event);
        await Promise.all(pubs);
        return event.id;
      }
    }

    return null;
  } catch (error) {
    console.error('Error publishing conference group:', error);
    return null;
  }
}

// Join a conference group with optional invite
export async function joinConferenceGroup(
  groupId: string,
  userPubkey: string,
  privateKey: string | null,
  inviteLink?: string
): Promise<boolean> {
  try {
    // Verify the invite link if provided
    if (inviteLink) {
      const parsedGroupId = parseGroupInviteLink(inviteLink);
      if (!parsedGroupId || parsedGroupId !== groupId) {
        console.error('Invalid invite link');
        return false;
      }
    }

    const content = JSON.stringify({
      action: 'join',
      timestamp: Math.floor(Date.now() / 1000),
      inviteLink: inviteLink ? true : undefined
    });

    const tags = [
      ['e', groupId], // Reference to the group event
      ['p', userPubkey] // The joining member
    ];

    const event: NostrEvent = {
      kind: MEMBERSHIP_KIND,
      pubkey: userPubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
      id: '',
      sig: ''
    };

    event.id = getEventHash(event);

    // Try NIP-07 first
    // @ts-ignore - window.nostr is provided by NIP-07 extension
    if (typeof window !== 'undefined' && window.nostr) {
      try {
        // @ts-ignore
        const signedEvent = await window.nostr.signEvent({
          kind: event.kind,
          created_at: event.created_at,
          tags: event.tags,
          content: event.content,
          pubkey: event.pubkey
        });

        if (verifyEvent(signedEvent)) {
          const pool = new SimplePool();
          const pubs = pool.publish(DEFAULT_RELAYS, signedEvent);
          await Promise.all(pubs);
          return true;
        }
      } catch (e) {
        console.error('NIP-07 signing failed, falling back to private key:', e);
      }
    }

    // Fallback to private key signing
    if (privateKey) {
      event.sig = signEvent(event, privateKey);
      if (verifyEvent(event)) {
        const pool = new SimplePool();
        const pubs = pool.publish(DEFAULT_RELAYS, event);
        await Promise.all(pubs);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error joining conference group:', error);
    return false;
  }
}

// Subscribe to conference group updates
export function subscribeToConferenceGroups(
  callback: (group: ConferenceGroup) => void
) {
  const pool = new SimplePool();
  const sub = pool.sub(DEFAULT_RELAYS, [
    {
      kinds: [GROUP_KIND],
      '#t': ['conference', 'btcmaps']
    }
  ]);

  sub.on('event', (event) => {
    if (verifyEvent(event)) {
      try {
        const groupData = JSON.parse(event.content);
        callback({
          id: event.id,
          ...groupData
        });
      } catch (error) {
        console.error('Error parsing group data:', error);
      }
    }
  });

  return () => {
    sub.unsub();
  };
}

// Subscribe to group membership updates
export function subscribeToGroupMemberships(
  groupId: string,
  callback: (membership: { pubkey: string; joinedAt: number }) => void
) {
  const pool = new SimplePool();
  const sub = pool.sub(DEFAULT_RELAYS, [
    {
      kinds: [MEMBERSHIP_KIND],
      '#e': [groupId]
    }
  ]);

  sub.on('event', (event) => {
    if (verifyEvent(event)) {
      try {
        const data = JSON.parse(event.content);
        if (data.action === 'join') {
          callback({
            pubkey: event.pubkey,
            joinedAt: data.timestamp
          });
        }
      } catch (error) {
        console.error('Error parsing membership data:', error);
      }
    }
  });

  return () => {
    sub.unsub();
  };
} 