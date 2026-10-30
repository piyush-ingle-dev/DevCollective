import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AiChatPanel } from './AiChatPanel';

interface Props { roadmap: any }

// Personalized study chatbot that lives inside the Roadmap page once a roadmap exists.
export const RoadmapStudyBuddy: React.FC<Props> = ({ roadmap }) => {
  const { user } = useAuth();
  const buildContext = () => ({
    profile: user ? { name: user.name, branch: user.branch, academicYear: user.academicYear, skills: (user as any).skills, rep: user.rep, level: user.level } : undefined,
    roadmap,
  });
  const first = roadmap?.levels?.[0]?.title;
  return (
    <div className="bg-surface-container border-2 border-outline-variant rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-outline-variant bg-surface-container-low">
        <h3 className="font-headline-md text-lg font-bold text-on-surface">Study Buddy</h3>
        <p className="text-xs text-on-surface-variant">Ask doubts about {roadmap?.roadmapTitle}. Send a screenshot of your code or error and it will look at it. Your chat is saved.</p>
      </div>
      <AiChatPanel
        heightClass="h-[30rem]"
        storageKey={user && roadmap?.roadmapTitle ? `devcollective_studybuddy_${user.id}_${String(roadmap.roadmapTitle).slice(0, 40)}` : null}
        welcome={`Hi${user?.name ? ` ${user.name.split(' ')[0]}` : ''}! I am your Study Buddy for ${roadmap?.roadmapTitle || 'your roadmap'}. Ask me anything about what you are learning, or tell me where you are stuck.`}
        endpoint="/api/ai/study-buddy"
        buildContext={buildContext}
        placeholder="Ask a doubt about your roadmap..."
        suggestions={[first ? `Explain Level 1 (${first}) in simple words` : 'Where should I start?', 'What should I study this week?', 'Give me a small exercise to practice']}
      />
    </div>
  );
};
