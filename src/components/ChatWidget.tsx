import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AiChatPanel } from './AiChatPanel';
import { loadJson, saveJson } from '../lib/aiClient';

const WELCOME = "Hi, I'm the DevCollective assistant. Ask me about the platform, your roadmap, mentors or REP points. If you are stuck on something, send a screenshot.";

export const ChatWidget: React.FC = () => {
  const { user } = useAuth();
  // The window stays open while you move around the site. Only the close button shuts it.
  const [isOpen, setIsOpenState] = useState<boolean>(() => loadJson<boolean>('devcollective_assistant_open', false, 'session'));
  const setIsOpen = (next: boolean) => { setIsOpenState(next); saveJson('devcollective_assistant_open', next, 'session'); };

  const buildContext = () => ({ profile: user ? { name: user.name, branch: user.branch, academicYear: user.academicYear, skills: (user as any).skills, rep: user.rep, level: user.level } : undefined });

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-20 right-6 z-[90] w-14 h-14 rounded-full bg-primary-container text-on-primary border-2 border-outline-variant shadow-2xl flex items-center justify-center hover:brightness-95 active:scale-95 transition-all" title={isOpen ? 'Close assistant' : 'Open assistant'} aria-label={isOpen ? 'Close assistant' : 'Open assistant'}>
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
      {/* Always mounted, only hidden when closed, so the conversation is never reset by closing it */}
      <div data-lenis-prevent style={{ overscrollBehavior: 'contain' }} className={`${isOpen ? 'flex' : 'hidden'} fixed bottom-36 right-6 z-[90] w-[calc(100vw-3rem)] max-w-sm h-[32rem] max-h-[70vh] bg-surface-container border-2 border-outline-variant rounded-2xl shadow-2xl flex-col overflow-hidden`}>
        <div className="px-4 py-3.5 border-b-2 border-outline-variant bg-surface-container-low shrink-0">
          <p className="text-sm font-bold text-on-surface">DevCollective assistant</p>
          <p className="text-xs text-on-surface-variant">Ask in text, voice or with a photo. Shift+Enter adds a new line.</p>
        </div>
        {/* session storage: this chat clears when the browser tab is closed */}
        <AiChatPanel storage="session" storageKey={user ? `devcollective_assistant_chat_${user.id}` : null} welcome={WELCOME} endpoint="/api/chat" buildContext={buildContext} placeholder="Ask about DevCollective" />
      </div>
    </>
  );
};
