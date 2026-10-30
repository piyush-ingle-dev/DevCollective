import React, { useState, useRef } from 'react';
import { useUser } from '@clerk/react';
import { useAuth } from '../context/AuthContext';
import { Camera, Check, X, ArrowLeft, UploadCloud, Sparkles, Loader2, AlertTriangle, ImagePlus } from 'lucide-react';

interface ExtractedResumeData { branch: string; academicYear: string; bio: string; skills: string[]; githubUrl: string; linkedinUrl: string; confidence?: string; }

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const ProfileSetupPage: React.FC = () => {
  const { user, updateProfile, setActiveTab } = useAuth();
  const { user: clerkUser, isLoaded: clerkUserLoaded } = useUser();
  const [branch, setBranch] = useState(user?.branch || '');
  const [academicYear, setAcademicYear] = useState(user?.academicYear || '');
  const [githubUrl, setGithubUrl] = useState(user?.githubUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || '');
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [bio, setBio] = useState(user?.bio || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [appliedFromResume, setAppliedFromResume] = useState(false);
  const [resumeNote, setResumeNote] = useState<string | null>(null);

  const currentAvatar = avatarPreview || user?.avatar || clerkUser?.imageUrl || '';

  const handleProfilePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      setAvatarError('Use a JPG, PNG, or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setAvatarError('Profile photos must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }
    if (!clerkUserLoaded || !clerkUser) {
      setAvatarError('Your account is still loading. Please try again in a moment.');
      e.target.value = '';
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setIsUploadingAvatar(true);

    try {
      await clerkUser.setProfileImage({ file });
      await clerkUser.reload();
      const imageUrl = clerkUser.imageUrl;
      if (!imageUrl) throw new Error('Clerk did not return the uploaded profile image.');
      setAvatarPreview(imageUrl);
      await updateProfile({ avatar: imageUrl });
      setIsSaved(false);
    } catch (err: any) {
      URL.revokeObjectURL(localPreview);
      setAvatarPreview(null);
      setAvatarError(err?.message || 'We could not upload your profile photo. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleResumeSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setResumeError('Please upload a PDF resume.'); return; }
    setResumeFileName(file.name); setResumeError(null); setAppliedFromResume(false); setIsParsingResume(true);
    try {
      const token = localStorage.getItem('devcollective_token');
      const formData = new FormData(); formData.append('resume', file);
      const res = await fetch('/api/resume/parse', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: formData });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Failed to parse resume.');
      const extracted: ExtractedResumeData = data.extracted;
      if (extracted.branch) setBranch(extracted.branch); if (extracted.academicYear) setAcademicYear(extracted.academicYear); if (extracted.bio) setBio(extracted.bio.slice(0, 250)); if (extracted.githubUrl) setGithubUrl(extracted.githubUrl); if (extracted.linkedinUrl) setLinkedinUrl(extracted.linkedinUrl); if (extracted.skills?.length) setSkills(Array.from(new Set(extracted.skills)));
      setResumeNote(extracted.confidence || null); setAppliedFromResume(true);
    } catch (err: any) { setResumeError(err.message || 'Something went wrong reading that resume.'); }
    finally { setIsParsingResume(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleAddSkill = (e: React.KeyboardEvent) => { if (e.key !== 'Enter') return; e.preventDefault(); const skill = newSkillInput.trim(); if (skill && !skills.includes(skill)) { setSkills([...skills, skill]); setNewSkillInput(''); } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateProfile({ branch, academicYear, githubUrl, linkedinUrl, skills, bio });
    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setActiveTab(user?.hasCompletedOnboarding ? 'profile' : 'choose-path'), 600);
  };

  const handleSkip = () => setActiveTab(user?.hasCompletedOnboarding ? 'profile' : 'choose-path');

  return <div className="profile-setup-page min-h-screen bg-background text-on-background flex flex-col pt-20">
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center h-20 px-6 md:px-10 bg-background/80 backdrop-blur-xl border-b-2 border-outline-variant">
      <div className="flex items-center gap-6"><span className="font-label-mono text-xs font-bold tracking-[0.16em]">DEV_COLLECTIVE</span><button onClick={() => setActiveTab('profile')} className="hidden sm:flex items-center gap-2 font-label-mono text-xs uppercase text-on-surface-variant"><ArrowLeft className="w-4 h-4" /> Profile</button></div>
    </nav>
    <main className="flex-grow p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-3xl mx-auto space-y-8">
        <div className="flex justify-between items-end"><div><h2 className="dc-display text-5xl">PROFILE SETUP.</h2><p className="font-label-mono text-xs text-on-surface-variant uppercase mt-2">STEP 2 OF 3</p></div><div className="w-32 h-2 bg-surface-container-high border border-outline-variant"><div className="h-full bg-primary w-[65%]" /></div></div>
        <div className="bg-surface border-2 border-outline-variant p-6 sm:p-10 shadow-[7px_7px_0_#171717]">
          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="flex flex-col items-center gap-4">
              <div className="profile-photo-frame w-44 h-44 p-2 flex items-center justify-center overflow-hidden">
                <div className="profile-photo-inner w-full h-full flex items-center justify-center overflow-hidden rounded-full">
                  {currentAvatar ? <img src={currentAvatar} alt={user?.name ? `${user.name} profile` : 'Profile'} className="w-full h-full object-cover" /> : <Camera className="w-10 h-10 text-on-surface-variant" />}
                </div>
              </div>
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProfilePhotoSelect} className="hidden" id="profile-photo-input" />
              <button type="button" onClick={() => photoInputRef.current?.click()} disabled={isUploadingAvatar} className="profile-photo-button inline-flex items-center gap-2 px-4 py-2.5 font-label-mono text-[10px] uppercase tracking-[0.12em] disabled:opacity-50">
                {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                {isUploadingAvatar ? 'Uploading photo...' : currentAvatar ? 'Change profile photo' : 'Add profile photo'}
              </button>
              <p className="font-label-mono text-[9px] uppercase tracking-[0.12em] text-on-surface-variant">JPG / PNG / WEBP · MAX 5 MB</p>
              {avatarError && <p className="text-xs text-error flex items-center gap-2 max-w-sm text-center"><AlertTriangle className="w-4 h-4 shrink-0" />{avatarError}</p>}
            </div>

            <div><label className="font-label-mono text-xs uppercase text-on-surface-variant flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-primary" /> Auto-fill from Resume</label><input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleResumeSelect} className="hidden" id="resume-upload-input" /><label htmlFor="resume-upload-input" className="flex items-center justify-between gap-4 p-5 border-2 border-dashed border-outline-variant cursor-pointer hover:bg-dc-blue"><div className="flex items-center gap-3 min-w-0">{isParsingResume ? <Loader2 className="w-5 h-5 animate-spin" /> : appliedFromResume ? <Check className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}<div className="min-w-0"><p className="text-sm truncate">{isParsingResume ? 'Reading your resume...' : resumeFileName || 'Upload your resume (PDF)'}</p><p className="text-[11px] text-on-surface-variant">AI only extracts information actually present in your resume.</p></div></div><span className="font-label-mono text-[10px] uppercase text-primary">{resumeFileName ? 'Replace' : 'Choose file'}</span></label>{resumeError && <p className="text-xs text-error mt-2 flex gap-2"><AlertTriangle className="w-4 h-4" />{resumeError}</p>}{resumeNote && !resumeError && <p className="text-[11px] text-on-surface-variant mt-2">{resumeNote}</p>}</div>

            <div className="grid sm:grid-cols-2 gap-5"><label className="space-y-2"><span className="font-label-mono text-xs uppercase text-on-surface-variant">Branch of Study</span><select value={branch} onChange={(e) => setBranch(e.target.value)} required className="w-full bg-surface border-2 border-outline-variant p-3.5 text-sm"><option value="" disabled>Select branch</option><option>Computer Science</option><option>Information Technology</option><option>Data Science</option><option>Artificial Intelligence</option><option>Software Engineering</option></select></label><label className="space-y-2"><span className="font-label-mono text-xs uppercase text-on-surface-variant">Academic Year</span><select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} required className="w-full bg-surface border-2 border-outline-variant p-3.5 text-sm"><option value="" disabled>Select year</option><option>First Year</option><option>Second Year</option><option>Third Year</option><option>Final Year</option><option>Post-Graduate</option></select></label></div>

            <div className="space-y-3"><label className="font-label-mono text-xs uppercase text-on-surface-variant">External Profiles</label><input type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="GitHub URL (optional)" className="w-full bg-surface border-2 border-outline-variant p-3.5 text-sm" /><input type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="LinkedIn URL (optional)" className="w-full bg-surface border-2 border-outline-variant p-3.5 text-sm" /></div>

            <div className="space-y-2"><label className="font-label-mono text-xs uppercase text-on-surface-variant">Skills & Tech Stack</label><div className="flex flex-wrap gap-2 p-3 bg-surface border-2 border-outline-variant min-h-[56px] items-center">{skills.map((skill) => <span key={skill} className="flex items-center gap-1.5 bg-dc-blue border-2 border-outline-variant px-2.5 py-1 font-label-mono text-[10px] uppercase">{skill}<button type="button" onClick={() => setSkills(skills.filter((item) => item !== skill))}><X className="w-3 h-3" /></button></span>)}<input value={newSkillInput} onChange={(e) => setNewSkillInput(e.target.value)} onKeyDown={handleAddSkill} placeholder="Add skill + Enter" className="bg-transparent border-none outline-none text-xs p-1 flex-1 min-w-[120px]" /></div></div>

            <div className="space-y-2"><div className="flex justify-between"><label className="font-label-mono text-xs uppercase text-on-surface-variant">Tell us about yourself</label><span className="font-label-mono text-[10px] text-on-surface-variant">{bio.length}/250</span></div><textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 250))} rows={4} placeholder="Your bio (optional)" className="w-full bg-surface border-2 border-outline-variant p-3.5 text-sm resize-none" /></div>

            <div className="flex gap-3 pt-2"><button type="submit" disabled={isSaving} className="flex-1 bg-primary text-on-primary border-2 border-outline-variant shadow-[4px_4px_0_#171717] py-4 font-label-mono text-xs uppercase font-bold">{isSaved ? 'Saved' : isSaving ? 'Saving...' : user?.hasCompletedOnboarding ? 'Save Profile' : 'Continue to Learning Path'}</button><button type="button" onClick={handleSkip} className="px-6 border-2 border-outline-variant py-4 font-label-mono text-xs uppercase">{user?.hasCompletedOnboarding ? 'Back to Profile' : 'Skip for now'}</button></div>
          </form>
        </div>
      </div>
    </main>
  </div>;
};
