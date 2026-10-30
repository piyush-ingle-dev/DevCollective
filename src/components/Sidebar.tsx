import React from 'react';
import { useAuth, PageTab } from '../context/AuthContext';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { LayoutDashboard, Users, Map, Trophy, UserCheck, User, ShieldCheck, PlusCircle, Settings, HelpCircle, Terminal, PanelLeftClose, PanelLeftOpen, BookOpen, CalendarDays, ChevronRight, Rocket, Briefcase } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, user, sidebarCollapsed, toggleSidebar } = useAuth();
  const { isAdmin } = useAdminAccess();

  const navItems: { id: PageTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
    { id: 'community', label: 'Community', icon: <Users className="h-[18px] w-[18px]" /> },
    { id: 'events', label: 'Events', icon: <CalendarDays className="h-[18px] w-[18px]" /> },
    { id: 'roadmap', label: 'Roadmaps', icon: <Map className="h-[18px] w-[18px]" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="h-[18px] w-[18px]" /> },
    { id: 'mentors', label: 'Mentors', icon: <UserCheck className="h-[18px] w-[18px]" /> },
    { id: 'project-generator' as PageTab, label: 'Project Generator', icon: <Rocket className="h-[18px] w-[18px]" /> },
    { id: 'crt' as PageTab, label: 'CRT', icon: <Briefcase className="h-[18px] w-[18px]" /> },
    { id: 'profile', label: 'Profile', icon: <User className="h-[18px] w-[18px]" /> },
    ...(isAdmin ? [{ id: 'admin' as PageTab, label: 'Admin Terminal', icon: <ShieldCheck className="h-[18px] w-[18px]" /> }] : []),
  ];

  const levelItems: { id: PageTab; label: string; icon: React.ReactNode }[] = [{ id: 'level-0' as PageTab, label: 'Level 0', icon: <BookOpen className="h-[18px] w-[18px]" /> }];
  const primary = navItems.slice(0, 3);
  const secondary = navItems.slice(3);

  const renderNavItem = (item: { id: PageTab; label: string; icon: React.ReactNode }) => {
    const isActive = activeTab === item.id;
    return <button key={item.id} onClick={() => setActiveTab(item.id)} title={sidebarCollapsed ? item.label : undefined} aria-current={isActive ? 'page' : undefined} className={['group relative w-full flex items-center rounded-lg transition-all duration-200','font-label-mono text-[11px] uppercase tracking-[0.08em]',sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5 text-left',isActive ? 'bg-primary/[0.10] text-primary' : 'text-on-surface-variant hover:bg-surface-container-highest/70 hover:text-on-surface'].join(' ')}>
      {isActive && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" aria-hidden="true" />}
      <span className={['flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',isActive ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-high/70 text-on-surface-variant group-hover:bg-surface-container-highest group-hover:text-on-surface'].join(' ')}>{item.icon}</span>
      {!sidebarCollapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      {!sidebarCollapsed && isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />}
    </button>;
  };

  const renderGroup = (label: string, items: { id: PageTab; label: string; icon: React.ReactNode }[]) => <section className="space-y-1.5" aria-label={label}>
    {!sidebarCollapsed && <div className="px-2 pb-2 pt-4"><p className="font-label-mono text-[9px] font-bold uppercase tracking-[0.2em] text-outline">{label}</p></div>}
    {items.map(renderNavItem)}
  </section>;

  return <aside data-lenis-prevent-wheel className={['sticky top-0 z-30 hidden h-screen shrink-0 flex-col overflow-hidden md:flex','bg-surface/95 backdrop-blur-sm border-r border-outline-variant/70','transition-[width] duration-300 ease-out',sidebarCollapsed ? 'w-[76px]' : 'w-[264px]'].join(' ')}>
    <div className="shrink-0 px-3 pb-4 pt-4"><div className={['flex items-center',sidebarCollapsed ? 'justify-center' : 'gap-2'].join(' ')}>
      <button onClick={() => setActiveTab(user ? 'dashboard' : 'landing')} title="DevCollective — Build. Scale. Lead." className={['group flex min-w-0 items-center rounded-xl text-left transition-colors',sidebarCollapsed ? 'justify-center' : 'flex-1 gap-3 px-2 py-2','hover:bg-surface-container-high/70'].join(' ')}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container text-white shadow-[0_4px_12px_rgba(0,0,0,0.16)] transition-transform duration-200 group-hover:-translate-y-0.5"><Terminal className="h-[22px] w-[22px]" /></span>
        {!sidebarCollapsed && <span className="min-w-0 overflow-hidden"><span className="block truncate font-headline-md text-[17px] font-black leading-none tracking-[-0.04em] text-primary">DevCollective</span><span className="mt-1 block truncate font-label-mono text-[8px] uppercase tracking-[0.18em] text-outline">Build. Scale. Lead.</span></span>}
      </button>
      {!sidebarCollapsed && <button onClick={toggleSidebar} title="Collapse sidebar" aria-label="Collapse sidebar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant/60 text-on-surface-variant transition-colors hover:border-primary/50 hover:bg-surface-container-high hover:text-primary"><PanelLeftClose className="h-4 w-4" /></button>}
    </div>
    {sidebarCollapsed && <button onClick={toggleSidebar} title="Expand sidebar" aria-label="Expand sidebar" className="mt-3 flex h-8 w-full items-center justify-center rounded-lg border border-outline-variant/60 text-on-surface-variant transition-colors hover:border-primary/50 hover:bg-surface-container-high hover:text-primary"><PanelLeftOpen className="h-4 w-4" /></button>}
    </div>

    <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4" aria-label="Main navigation"><div className="space-y-1">{renderGroup('Workspace', primary)}{renderGroup('Progress', levelItems)}{renderGroup('Connect', secondary)}</div></nav>

    <div className="shrink-0 border-t border-outline-variant/70 bg-surface/95 px-3 pb-3 pt-3">
      <button onClick={() => setActiveTab('community')} title={sidebarCollapsed ? 'Post Project' : undefined} className={['group mb-3 flex w-full items-center justify-center rounded-lg bg-primary-container text-white','font-label-mono text-[10px] font-bold uppercase tracking-[0.1em]','transition-all duration-200 hover:brightness-110 active:translate-y-px','shadow-[3px_3px_0_0_#27272A]',sidebarCollapsed ? 'h-10 px-2' : 'h-10 gap-2 px-3'].join(' ')}><PlusCircle className="h-4 w-4 shrink-0 transition-transform group-hover:rotate-90" />{!sidebarCollapsed && <span>Post Project</span>}</button>
      <div className="space-y-0.5">
        <button onClick={() => setActiveTab('profile-setup')} title={sidebarCollapsed ? 'Profile Settings' : undefined} className={['flex w-full items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface','font-label-mono text-[10px] uppercase tracking-[0.08em]',sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-2.5 py-2'].join(' ')}><Settings className="h-4 w-4 shrink-0" />{!sidebarCollapsed && <span className="truncate">Profile Settings</span>}</button>
        <button onClick={() => setActiveTab('choose-path')} title={sidebarCollapsed ? 'Learning Paths' : undefined} className={['flex w-full items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface','font-label-mono text-[10px] uppercase tracking-[0.08em]',sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-2.5 py-2'].join(' ')}><HelpCircle className="h-4 w-4 shrink-0" />{!sidebarCollapsed && <span className="truncate">Learning Paths</span>}</button>
      </div>
      {user && <button onClick={() => setActiveTab('profile')} title={sidebarCollapsed ? `${user.name} (${user.rep.toLocaleString()} REP)` : undefined} className={['mt-2.5 flex w-full items-center rounded-lg border border-outline-variant/50 bg-surface-container-low p-2 transition-all hover:border-primary/50 hover:bg-surface-container',sidebarCollapsed ? 'justify-center' : 'gap-2.5'].join(' ')}><img src={user.avatar} alt={user.name} className="h-8 w-8 shrink-0 rounded-full border border-primary/70 object-cover" />{!sidebarCollapsed && <span className="min-w-0 flex-1 text-left"><span className="block truncate text-xs font-bold text-on-surface">{user.name}</span><span className="block truncate font-label-mono text-[9px] uppercase tracking-wider text-primary">{user.rep.toLocaleString()} REP</span></span>}</button>}
    </div>
  </aside>;
};
