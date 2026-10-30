import React, { useEffect, useState } from 'react';
import { Calendar, MessageSquare, Search, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth, } from '../context/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/react';
import { FacultyProfile, Mentor } from '../types';
import { openMessagingForUser } from '../components/MessagingOverlay';
import { DcButton } from '../components/ui/DcButton';
import { DcCard } from '../components/ui/DcCard';
import { DcEmptyState } from '../components/ui/DcEmptyState';
import { DcSectionHeader } from '../components/ui/DcSectionHeader';

export const MentorDirectoryPage: React.FC = () => {
  const { mentors, user, setActiveTab } = useAuth();
  const { getToken } = useClerkAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [activeMentor, setActiveMentor] = useState<Mentor | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [faculty, setFaculty] = useState<FacultyProfile[]>([]);
  const [facultyLoading, setFacultyLoading] = useState(false);

  useEffect(() => {
    if (selectedRole !== 'FACULTY' && selectedRole !== 'ALL') return;
    let cancelled = false;
    const loadFaculty = async () => {
      setFacultyLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const response = await fetch('/api/faculty/directory', { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not load faculty directory.');
        if (!cancelled) setFaculty(Array.isArray(data.profiles) ? data.profiles : []);
      } catch (error) {
        console.error('Could not load faculty directory:', error);
        if (!cancelled) setFaculty([]);
      } finally { if (!cancelled) setFacultyLoading(false); }
    };
    void loadFaculty();
    return () => { cancelled = true; };
  }, [getToken, selectedRole]);

  const query = searchQuery.trim().toLowerCase();
  const filteredMentors = mentors.filter((mentor) => {
    if (selectedRole === 'FACULTY') return false;
    const roleMatch = selectedRole === 'ALL' || mentor.roleType === selectedRole;
    return roleMatch && (!query || mentor.name.toLowerCase().includes(query) || mentor.college.toLowerCase().includes(query) || mentor.skills.some((skill) => skill.toLowerCase().includes(query)));
  });
  const filteredFaculty = faculty.filter((item) => !query || [item.name, item.designation, item.department, item.college, ...item.subjects, ...item.expertise, ...item.mentoringAreas].some((value) => value.toLowerCase().includes(query)));

  const book = () => { setBookingConfirmed(true); setTimeout(() => { setBookingConfirmed(false); setActiveMentor(null); }, 1200); };
  const openFaculty = (id: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('faculty', id);
    window.history.pushState({}, '', window.location.pathname + '?' + params.toString());
    setActiveTab('faculty-profile');
  };

  return <div className="space-y-8 pb-16">
    <DcSectionHeader className="border-b-2 border-outline-variant pb-7">
      <div><p className="font-label-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">MENTORS / LIVE DATABASE</p><h2 className="dc-display text-5xl sm:text-6xl mt-2">MENTORS.</h2><p className="mt-4 text-sm text-on-surface-variant max-w-xl">Find approved senior mentors and verified faculty profiles from the live DevCollective database.</p></div>
      <div className="relative w-full lg:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search mentors or faculty..." className="w-full border-2 border-outline-variant bg-surface py-3 pl-10 pr-4 text-xs font-label-mono" /></div>
    </DcSectionHeader>

    <DcCard shadow="sm" className="p-5"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><p className="font-label-mono text-[10px] uppercase text-on-surface-variant">YOUR ACCESS</p><p className="font-label-mono text-sm uppercase mt-1">LEVEL {user?.level ?? 1} · {user?.rep ?? 0} REP</p></div><div className="font-label-mono text-[10px] uppercase text-on-surface-variant">Mentoring · messaging · faculty access</div></div></DcCard>

    <div className="flex flex-wrap gap-2">{['ALL', 'SENIOR', 'FACULTY'].map((role) => <DcButton key={role} type="button" onClick={() => setSelectedRole(role)} variant={selectedRole === role ? 'primary' : 'secondary'} className="px-3 py-2">{role}</DcButton>)}</div>

    {selectedRole === 'FACULTY' ? <section>
      {facultyLoading ? <DcEmptyState title="LOADING FACULTY." description="Fetching approved faculty profiles from the live database." /> : filteredFaculty.length === 0 ? <DcEmptyState title="NO FACULTY YET." description="There are currently no approved faculty profiles available in the database." /> :
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{filteredFaculty.map((item) => <DcCard key={item.id} shadow="md" interactive className="p-6">
        <div className="flex items-start justify-between gap-3 mb-5"><div className="flex items-center gap-3 min-w-0"><div className="w-14 h-14 shrink-0 border-2 border-outline-variant bg-dc-lavender flex items-center justify-center font-bold overflow-hidden">{item.avatar ? <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" /> : item.name.slice(0,1).toUpperCase()}</div><div className="min-w-0"><h3 className="font-bold text-lg truncate">{item.name}</h3><p className="font-label-mono text-[9px] uppercase text-on-surface-variant truncate">{item.designation}</p><span className="mt-2 inline-flex items-center gap-1.5 border-2 border-outline-variant bg-dc-mint px-2 py-1 font-label-mono text-[9px] uppercase font-bold"><ShieldCheck className="w-3.5 h-3.5" /> Verified Faculty</span></div></div><span className="border-2 border-outline-variant bg-dc-blue px-2 py-1 font-label-mono text-[9px] uppercase">{item.availabilityStatus}</span></div>
        <p className="text-xs text-on-surface-variant leading-relaxed min-h-10">{item.bio || 'No faculty bio provided.'}</p><p className="font-label-mono text-[10px] uppercase text-on-surface-variant mt-4">{item.department || 'Department not provided'} · {item.college}</p>
        <div className="flex flex-wrap gap-2 mt-4">{[...item.expertise, ...item.mentoringAreas].slice(0, 6).map((skill) => <span key={skill} className="bg-dc-mint border-2 border-outline-variant px-2 py-1 font-label-mono text-[9px] uppercase">{skill}</span>)}</div>
        <div className="grid grid-cols-2 gap-3 border-y-2 border-outline-variant my-5 py-3"><div><span className="font-label-mono text-[9px] uppercase text-on-surface-variant block">SUBJECTS</span><strong>{item.subjects.length || 0}</strong></div><div><span className="font-label-mono text-[9px] uppercase text-on-surface-variant block">EXPERIENCE</span><strong>{item.yearsExperience == null ? '—' : `${item.yearsExperience}y`}</strong></div></div>
        <div className="grid grid-cols-2 gap-2"><button onClick={() => openFaculty(item.id)} className="border-2 border-outline-variant bg-primary text-on-primary py-3 font-label-mono text-[10px] uppercase font-bold flex items-center justify-center gap-2"><UserRound className="w-4 h-4" /> View Profile</button><button onClick={() => openMessagingForUser(item.id)} className="border-2 border-outline-variant bg-dc-blue py-3 font-label-mono text-[10px] uppercase font-bold flex items-center justify-center gap-2"><MessageSquare className="w-4 h-4" /> Message</button></div>
      </DcCard>)}</div>}
    </section> : <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {filteredMentors.length === 0 ? <div className="md:col-span-2 xl:col-span-3"><DcEmptyState title="NO MENTORS YET." description="There are currently no mentor profiles available in the database." /></div> : filteredMentors.map((mentor) => <DcCard key={mentor.id} shadow="md" interactive className="p-6"><div className="flex items-start justify-between gap-3 mb-5"><div className="flex items-center gap-3"><div className="w-14 h-14 border-2 border-outline-variant bg-dc-yellow flex items-center justify-center font-bold overflow-hidden">{mentor.avatar ? <img src={mentor.avatar} alt={mentor.name} className="w-full h-full object-cover" /> : mentor.name.slice(0,1)}</div><div><h3 className="font-bold text-lg">{mentor.name}</h3><p className="font-label-mono text-[9px] uppercase text-on-surface-variant">{mentor.title}</p>{mentor.roleType === 'SENIOR' && <span className="mt-2 inline-flex items-center gap-1.5 border-2 border-outline-variant bg-dc-mint px-2 py-1 font-label-mono text-[9px] uppercase font-bold"><ShieldCheck className="w-3.5 h-3.5" /> Verified Mentor</span>}</div></div><span className="border-2 border-outline-variant bg-dc-blue px-2 py-1 font-label-mono text-[9px]">{mentor.roleType}</span></div><p className="text-xs text-on-surface-variant leading-relaxed min-h-10">{mentor.bio || 'No bio provided.'}</p><p className="font-label-mono text-[10px] uppercase text-on-surface-variant mt-4">{mentor.college || 'College not provided'}</p><div className="flex flex-wrap gap-2 mt-4">{mentor.skills.length ? mentor.skills.map((skill) => <span key={skill} className="bg-dc-mint border-2 border-outline-variant px-2 py-1 font-label-mono text-[9px] uppercase">{skill}</span>) : <span className="font-label-mono text-[9px] text-on-surface-variant">NO SKILLS LISTED</span>}</div><div className="grid grid-cols-2 gap-3 border-y-2 border-outline-variant my-5 py-3"><div><span className="font-label-mono text-[9px] uppercase text-on-surface-variant block">LEVEL</span><strong>{mentor.level}</strong></div><div><span className="font-label-mono text-[9px] uppercase text-on-surface-variant block">REP</span><strong>{mentor.rep}</strong></div></div><div className="grid grid-cols-2 gap-2"><button onClick={() => setActiveMentor(mentor)} className="border-2 border-outline-variant bg-primary text-on-primary py-3 font-label-mono text-[10px] uppercase font-bold flex items-center justify-center gap-2"><Calendar className="w-4 h-4" /> Book</button><button onClick={() => openMessagingForUser(mentor.id)} className="border-2 border-outline-variant bg-dc-blue py-3 font-label-mono text-[10px] uppercase font-bold flex items-center justify-center gap-2"><MessageSquare className="w-4 h-4" /> Message</button></div></DcCard>)}
    </section>}

    {activeMentor && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"><div className="bg-surface border-2 border-outline-variant p-6 max-w-md w-full dc-shadow-lg relative"><button type="button" onClick={() => setActiveMentor(null)} className="absolute top-3 right-3" aria-label="Close mentor session dialog">×</button><p className="font-label-mono text-[10px] uppercase text-on-surface-variant">MENTOR / SESSION</p><h3 className="dc-display text-4xl mt-2">{activeMentor.name}.</h3><p className="text-sm text-on-surface-variant mt-3">{activeMentor.availability}</p><input placeholder="What do you want help with?" className="w-full border-2 border-outline-variant bg-surface p-3 text-sm mt-5" /><button onClick={book} className="w-full mt-5 border-2 border-outline-variant bg-dc-mint py-3 font-label-mono text-[10px] uppercase font-bold dc-shadow-sm">{bookingConfirmed ? 'REQUEST SENT' : 'REQUEST SESSION'}</button></div></div>}
  </div>;
};
