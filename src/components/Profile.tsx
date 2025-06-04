import React from 'react';
import { useUserStore } from '../store/userStore';
import { nip19 } from 'nostr-tools';

export function Profile() {
  const { pubkey, name, displayName, picture, about, nip05, isLoggedIn } = useUserStore();
  const [npub, setNpub] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (pubkey) {
      try {
        setNpub(nip19.npubEncode(pubkey));
      } catch {
        setNpub(null);
      }
    }
  }, [pubkey]);

  if (!isLoggedIn || !pubkey) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">
          Please log in to view your profile
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      {picture && (
        <img src={picture} alt={displayName || name || 'Profile'} className="w-24 h-24 rounded-full mb-4 border-4 border-[#F7931A]" />
      )}
      <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">{displayName || name || npub || pubkey}</div>
      {npub && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2" title={pubkey}>{npub}</div>
      )}
      {nip05 && (
        <div className="text-xs text-blue-500 mb-2">{nip05}</div>
      )}
      {about && (
        <div className="text-xs text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-line">{about}</div>
      )}
    </div>
  );
} 