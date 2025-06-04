import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, Link as LinkIcon } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { parseGroupInviteLink, joinConferenceGroup } from '../utils/groups';
import { Button } from '../components/ui/Button';
import { useNotificationStore } from '../store/notificationStore';

export function JoinGroupPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { isLoggedIn } = useUserStore();
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      addNotification('Please log in to join the group', 'warning');
      navigate('/login');
      return;
    }

    if (inviteCode) {
      const inviteLink = `${window.location.origin}/join/${inviteCode}`;
      const parsedGroupId = parseGroupInviteLink(inviteLink);
      if (parsedGroupId) {
        setGroupId(parsedGroupId);
      } else {
        addNotification('Invalid invite link', 'error');
        navigate('/');
      }
    }
  }, [inviteCode, isLoggedIn, navigate, addNotification]);

  const handleJoinGroup = async () => {
    if (!user || !groupId) return;

    setIsLoading(true);
    try {
      const inviteLink = `${window.location.origin}/join/${inviteCode}`;
      const success = await joinConferenceGroup(
        groupId,
        user.pubkey,
        // @ts-ignore - window.nostr is provided by NIP-07 extension
        window.nostr ? null : localStorage.getItem('btcmaps-private-key'),
        inviteLink
      );

      if (success) {
        addNotification('Successfully joined the group!', 'success');
        navigate('/map');
      } else {
        addNotification('Failed to join the group', 'error');
      }
    } catch (error) {
      console.error('Error joining group:', error);
      addNotification('Error joining the group', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Users className="h-12 w-12 text-[#F7931A]" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Join Conference Group
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            You've been invited to join a Bitcoin conference group
          </p>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 py-8 px-4 shadow-lg rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <LinkIcon className="h-16 w-16 text-[#F7931A] animate-pulse" />
            </div>
            
            <Button
              variant="primary"
              fullWidth
              onClick={handleJoinGroup}
              isLoading={isLoading}
            >
              Join Group
            </Button>

            <Button
              variant="outline"
              fullWidth
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 