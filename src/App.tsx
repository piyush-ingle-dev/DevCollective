/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { SocialProvider } from './context/SocialContext';
import { SocialProfileOverlay } from './components/SocialProfileOverlay';
import { SocialProfileMessagingAction } from './components/SocialProfileMessagingAction';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { OAuthGuideModal } from './components/OAuthGuideModal';
import { ChatWidget } from './components/ChatWidget';
import { ResumeUploadPromptModal } from './components/ResumeUploadPromptModal';
import { MotionSystem } from './components/MotionSystem';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingEventsSection } from './components/LandingEventsSection';
import { usePlatformAccess } from './hooks/usePlatformAccess';
import { useAdminAccess } from './hooks/useAdminAccess';
import './styles/profile-setup.css';
import './styles/login.css';
import './styles/login-modern.css';
import './styles/profile-setup-theme.css';
import './styles/workspace-pastel.css';
import './styles/dark-theme.css';
import './styles/workspace-controls.css';
import './styles/dashboard-ux.css';
import './styles/community-category-theme.css';
import './styles/rep-reward.css';
import './styles/social-profile.css';
import './styles/level0-theme.css';
import './styles/level0-heading.css';

const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const FacultyRegisterPage = lazy(() => import('./pages/FacultyRegisterPage').then((module) => ({ default: module.FacultyRegisterPage })));
const ProfileSetupPage = lazy(() => import('./pages/ProfileSetupPage').then((module) => ({ default: module.ProfileSetupPage })));
const ChoosePathPage = lazy(() => import('./pages/ChoosePathPage').then((module) => ({ default: module.ChoosePathPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const CommunityPage = lazy(() => import('./pages/CommunityRefinedPage').then((module) => ({ default: module.CommunityRefinedPage })));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage').then((module) => ({ default: module.RoadmapPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then((module) => ({ default: module.LeaderboardPage })));
const MentorDirectoryPage = lazy(() => import('./pages/MentorDirectoryPage').then((module) => ({ default: module.MentorDirectoryPage })));
const FacultyProfilePage = lazy(() => import('./pages/FacultyProfilePage').then((module) => ({ default: module.FacultyProfilePage })));
const StudentProfilePage = lazy(() => import('./pages/StudentProfilePage').then((module) => ({ default: module.StudentProfilePage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));
const Level0Page = lazy(() => import('./pages/Level0Page').then((module) => ({ default: module.Level0Page })));
const ProjectGeneratorPage = lazy(() => import('./pages/ProjectGeneratorPage').then((module) => ({ default: module.ProjectGeneratorPage })));
const CRTPage = lazy(() => import('./pages/CRTPage').then((module) => ({ default: module.CRTPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then((module) => ({ default: module.EventsPage })));

const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] bg-background text-on-background flex items-center justify-center p-6">
    <div className="flex items-center gap-3 border-2 border-outline-variant bg-surface px-5 py-4 dc-hard-shadow-sm">
      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="font-label-mono text-[10px] uppercase tracking-wider">Loading module...</span>
    </div>
  </div>
);

const RepRewardToast: React.FC = () => {
  const { user, activeTab } = useAuth();
  const previousRepRef = React.useRef<number | null>(null);
  const [reward, setReward] = React.useState<{ amount: number; id: number } | null>(null);

  useEffect(() => {
    if (!user) { previousRepRef.current = null; setReward(null); return; }
    const previousRep = previousRepRef.current;
    previousRepRef.current = user.rep;
    if (previousRep !== null && user.rep > previousRep && activeTab !== 'dashboard') setReward({ amount: user.rep - previousRep, id: Date.now() });
  }, [user, activeTab]);

  useEffect(() => {
    if (!reward) return;
    const timer = window.setTimeout(() => setReward(null), 3000);
    return () => window.clearTimeout(timer);
  }, [reward]);

  if (!reward) return null;
  return <div className="dc-rep-reward" key={reward.id} role="status" aria-live="polite"><span className="dc-rep-reward-particle" aria-hidden="true" /><span className="dc-rep-reward-particle" aria-hidden="true" /><span className="dc-rep-reward-particle" aria-hidden="true" /><span className="dc-rep-reward-particle" aria-hidden="true" /><span className="dc-rep-reward-particle" aria-hidden="true" /><span className="dc-rep-reward-particle" aria-hidden="true" /><div className="dc-rep-reward-card"><span className="dc-rep-reward-kicker">REPUTATION UPDATED</span><div className="dc-rep-reward-amount"><span>+{reward.amount}</span> REP</div><span className="dc-rep-reward-caption">CONTRIBUTION LOGGED</span></div></div>;
};

const MainContent: React.FC = () => {
  const { user, loadingAuth, activeTab, setActiveTab } = useAuth();
  const publicTabs = ['landing', 'login', 'register', 'faculty-register'];
  const protectedTabs = ['dashboard', 'community', 'roadmap', 'leaderboard', 'mentors', 'faculty-profile', 'profile', 'admin', 'level-0', 'events', 'project-generator', 'crt'];
  const isProtected = protectedTabs.includes(activeTab);
  const needsAuthHydration = !publicTabs.includes(activeTab);
  const platformAccess = usePlatformAccess(isProtected && user?.role !== 'faculty');
  const adminAccess = useAdminAccess();
  const wasAuthenticatedRef = React.useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeTab === 'landing' && params.get('faculty-register') === '1') setActiveTab('faculty-register');
  }, [activeTab, setActiveTab]);

  useEffect(() => {
    if (loadingAuth) return;
    const isAuthenticated = Boolean(user);
    if (!wasAuthenticatedRef.current && isAuthenticated && activeTab === 'landing') setActiveTab('profile');
    wasAuthenticatedRef.current = isAuthenticated;
  }, [user, loadingAuth, activeTab, setActiveTab]);

  if (loadingAuth && needsAuthHydration) return <div className="dc-app-shell min-h-screen bg-background text-on-background flex flex-col items-center justify-center p-6 space-y-4"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /><p className="font-label-mono text-sm text-on-surface-variant">Verifying DevCollective session...</p></div>;

  if (isProtected && !user) return <div className="dc-app-shell min-h-screen bg-background text-on-background"><Navbar /><div className="max-w-md mx-auto mt-12 p-6 bg-surface-container border-2 border-outline-variant rounded-xl text-center space-y-4"><h2 className="font-headline-md text-2xl font-bold">Authentication Required</h2><p className="text-sm text-on-surface-variant">Please log in with your email and password to access this page.</p><button onClick={() => setActiveTab('login')} className="w-full py-3 bg-primary text-on-primary font-bold border-2 border-outline-variant dc-hard-shadow-sm">Go to Login</button></div></div>;

  if (isProtected && user?.role === 'faculty' && user.accountStatus !== 'active') return <div className="dc-app-shell min-h-screen bg-background text-on-background"><Navbar /><main className="max-w-xl mx-auto mt-16 p-8 bg-surface border-2 border-outline-variant dc-hard-shadow text-center"><div className="dc-mono text-[9px] uppercase tracking-[0.18em] text-on-surface-variant">FACULTY / ACCESS PENDING</div><h2 className="dc-display text-4xl mt-3">{user.accountStatus === 'suspended' ? 'ACCESS SUSPENDED.' : 'AWAITING APPROVAL.'}</h2><p className="text-sm text-on-surface-variant mt-4">{user.accountStatus === 'suspended' ? 'Your faculty access is currently suspended. Contact a DevCollective administrator.' : 'Your invited email is verified and your faculty profile is submitted. An administrator must approve the account before faculty workspace access is enabled.'}</p><button onClick={() => setActiveTab('landing')} className="mt-6 px-6 py-3 bg-primary text-on-primary border-2 border-outline-variant font-bold uppercase dc-hard-shadow-sm">Return Home</button></main></div>;

  if (isProtected && !platformAccess.checked) return <div className="dc-app-shell min-h-screen bg-background text-on-background flex items-center justify-center p-6"><div className="flex items-center gap-3 border-2 border-outline-variant bg-surface px-5 py-4 dc-hard-shadow-sm"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="font-label-mono text-[10px] uppercase tracking-wider">Checking college access...</span></div></div>;

  if (isProtected && !platformAccess.allowed) return <div className="dc-app-shell min-h-screen bg-background text-on-background"><Navbar /><div className="max-w-xl mx-auto mt-12 p-8 bg-surface border-2 border-outline-variant dc-hard-shadow text-center space-y-5"><div className="inline-flex px-3 py-1 bg-dc-pink border-2 border-outline-variant font-label-mono text-[9px] uppercase">ACCESS / RESTRICTED</div><h2 className="dc-display text-4xl">COLLEGE IDENTITY REQUIRED.</h2><p className="text-sm leading-relaxed text-on-surface-variant">{platformAccess.error || 'DevCollective is limited to official college accounts.'}</p><p className="text-xs text-on-surface-variant break-all">Detected account: <strong>{platformAccess.email || 'unknown'}</strong></p><button onClick={() => void platformAccess.rejectAndSignOut()} className="w-full py-3 bg-primary text-on-primary font-bold border-2 border-outline-variant dc-hard-shadow-sm">SIGN OUT</button></div></div>;

  if (activeTab === 'admin' && !adminAccess.isAdmin) {
    return <div className="dc-app-shell min-h-screen bg-background text-on-background flex flex-col md:flex-row"><Sidebar /><div className="flex-1 flex flex-col min-w-0"><Navbar /><main className="flex-1 p-6 md:p-10 min-w-0"><div className="max-w-xl mx-auto p-8 bg-surface-container border-2 border-outline-variant rounded-xl text-center space-y-4 dc-hard-shadow-sm"><div className="w-16 h-16 bg-dc-pink border-2 border-outline-variant flex items-center justify-center mx-auto font-bold text-xl">403</div><h2 className="font-headline-md text-2xl font-bold">Access Denied</h2><p className="text-sm text-on-surface-variant">The Admin portal is restricted to users with verified DevCollective administrator access.</p><button onClick={() => setActiveTab('dashboard')} className="px-6 py-3 bg-surface border-2 border-outline-variant font-bold dc-hard-shadow-sm">Return to Dashboard</button></div></main></div></div>;
  }

  const isFullLayout = ['landing', 'login', 'register', 'faculty-register', 'profile-setup', 'choose-path'].includes(activeTab);
  return <div className="dc-app-shell min-h-screen bg-background text-on-background flex flex-col md:flex-row"><MotionSystem /><RepRewardToast />{!isFullLayout && <Sidebar />}<div className="flex-1 flex flex-col min-w-0"><Navbar /><main className={`flex-1 min-w-0 dc-page-${activeTab} ${isFullLayout ? 'w-full' : 'p-4 sm:p-8 lg:p-10'}`}><Suspense fallback={<PageLoadingFallback />}><ErrorBoundary>{activeTab === 'landing' && <><LandingPage /><LandingEventsSection /></>}{activeTab === 'login' && <LoginPage />}{activeTab === 'register' && <RegisterPage />}{activeTab === 'faculty-register' && <FacultyRegisterPage />}{activeTab === 'profile-setup' && <ProfileSetupPage />}{activeTab === 'choose-path' && <ChoosePathPage />}{activeTab === 'dashboard' && <DashboardPage />}{activeTab === 'community' && <CommunityPage />}{activeTab === 'roadmap' && <RoadmapPage />}{activeTab === 'project-generator' && <ProjectGeneratorPage />}{activeTab === 'crt' && <CRTPage />}{activeTab === 'leaderboard' && <LeaderboardPage />}{activeTab === 'mentors' && <MentorDirectoryPage />}{activeTab === 'faculty-profile' && <FacultyProfilePage />}{activeTab === 'profile' && <StudentProfilePage />}{activeTab === 'admin' && <AdminPage />}{activeTab === 'level-0' && <Level0Page />}{activeTab === 'events' && <EventsPage />}</ErrorBoundary></Suspense></main></div><OAuthGuideModal />{user && <ChatWidget />}{user && <ResumeUploadPromptModal />}<SocialProfileOverlay /><SocialProfileMessagingAction /></div>;
};

export default function App() { return <AuthProvider><NotificationProvider><SocialProvider><MainContent /></SocialProvider></NotificationProvider></AuthProvider>; }
