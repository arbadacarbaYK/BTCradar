import React from 'react';
import { NostrProfile, ConferenceGroup } from '../types/index';
import { ZapButton } from './ZapButton';

interface GroupMemberListProps {
  members: NostrProfile[];
  group: ConferenceGroup;
  currentUserPubkey: string;
}

export const GroupMemberList: React.FC<GroupMemberListProps> = ({
  members,
  group,
  currentUserPubkey
}) => {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Group Members
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          {members.length} members in this group
        </p>
      </div>
      <div className="border-t border-gray-200">
        <ul role="list" className="divide-y divide-gray-200">
          {members.map((member) => (
            <li key={member.pubkey} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {member.picture && (
                    <img
                      className="h-10 w-10 rounded-full"
                      src={member.picture}
                      alt={member.name || member.pubkey}
                    />
                  )}
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {member.name || `nostr:${member.pubkey.slice(0, 6)}`}
                    </div>
                    {member.nip05 && (
                      <div className="text-sm text-gray-500">
                        ✓ {member.nip05}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {member.pubkey !== currentUserPubkey && (
                    <ZapButton
                      recipientPubkey={member.pubkey}
                      recipientName={member.name}
                      group={group}
                    />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}; 