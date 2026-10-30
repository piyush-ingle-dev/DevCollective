import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useUser } from '@clerk/react';
import { useSocial } from '../context/SocialContext';
import { openMessagingForUser } from './MessagingOverlay';

/**
 * Connects the existing social-profile overlay to the separate messaging UI.
 * Keeping this bridge outside SocialProfileOverlay avoids changing its existing
 * follow/connection behaviour while giving every viewed member a Message action.
 */
export const SocialProfileMessagingAction: React.FC = () => {
  const { user } = useUser();
  const { viewedProfileId, closeProfile } = useSocial();

  if (!viewedProfileId || viewedProfileId === user?.id) return null;

  const handleMessage = () => {
    openMessagingForUser(viewedProfileId);
    closeProfile();
  };

  return (
    <button
      type="button"
      onClick={handleMessage}
      className="fixed top-5 right-20 sm:top-6 sm:right-24 z-[90] inline-flex items-center gap-2 px-4 py-3 bg-dc-blue border-2 border-outline-variant font-label-mono text-[10px] uppercase font-bold shadow-[4px_4px_0_#171717] hover:-translate-y-0.5 transition-transform"
      aria-label="Message this member"
    >
      <MessageCircle className="w-4 h-4" />
      Message
    </button>
  );
};
