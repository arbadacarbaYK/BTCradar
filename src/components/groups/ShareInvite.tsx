import React, { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { generateGroupInviteLink } from '../../utils/groups';
import { useNotificationStore } from '../../store/notificationStore';

interface ShareInviteProps {
  groupId: string;
}

export function ShareInvite({ groupId }: ShareInviteProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { addNotification } = useNotificationStore();

  const handleShare = async () => {
    const inviteLink = generateGroupInviteLink(groupId);

    // Try native share if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Bitcoin Conference Group',
          text: 'Join my group on BTCMaps to share location during the conference!',
          url: inviteLink
        });
        addNotification('Invite link shared!', 'success');
      } catch (error) {
        console.error('Error sharing:', error);
        // Fall back to copy if share was cancelled or failed
        handleCopy();
      }
    } else {
      // Fall back to copy if share is not available
      handleCopy();
    }
  };

  const handleCopy = async () => {
    const inviteLink = generateGroupInviteLink(groupId);
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      addNotification('Invite link copied to clipboard!', 'success');
      
      // Reset copy state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      addNotification('Failed to copy invite link', 'error');
    }
  };

  return (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        onClick={handleShare}
        leftIcon={<Share2 className="h-4 w-4" />}
      >
        Share Invite
      </Button>
      
      <Button
        variant="outline"
        onClick={handleCopy}
        leftIcon={
          isCopied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )
        }
      >
        {isCopied ? 'Copied!' : 'Copy Link'}
      </Button>
    </div>
  );
} 