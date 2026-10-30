import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, UploadCloud, Check, Loader2, AlertTriangle, X } from 'lucide-react';

interface ExtractedResumeData {
  branch: string;
  academicYear: string;
  bio: string;
  skills: string[];
  githubUrl: string;
  linkedinUrl: string;
  confidence?: string;
}

export const ResumeUploadPromptModal: React.FC = () => {
  const { showResumePrompt, dismissResumePrompt, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!showResumePrompt) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF resume.');
      return;
    }

    setFileName(file.name);
    setError(null);
    setIsParsing(true);

    try {
      const token = localStorage.getItem('devcollective_token');
      const formData = new FormData();
      formData.append('resume', file);

      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to read that resume.');
      }

      const extracted: ExtractedResumeData = data.extracted;
      await updateProfile({
        branch: extracted.branch || undefined,
        academicYear: extracted.academicYear || undefined,
        bio: extracted.bio || undefined,
        skills: extracted.skills?.length ? extracted.skills : undefined,
        githubUrl: extracted.githubUrl || undefined,
        linkedinUrl: extracted.linkedinUrl || undefined,
      });

      setSuccess(true);
      setTimeout(() => dismissResumePrompt(), 1400);
    } catch (err: any) {
      setError(err.message || 'Something went wrong reading that resume.');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="bg-surface-container border-2 border-primary/40 rounded-2xl max-w-md w-full p-7 sm:p-8 shadow-2xl relative overflow-hidden animate-fade-in">
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={dismissResumePrompt}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-white p-2 rounded-full hover:bg-surface-container-high transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 space-y-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg">
            <Sparkles className="w-6 h-6" />
          </div>

          <div>
            <h3 className="font-headline-md text-2xl font-bold text-white mb-1.5">
              Welcome to DevCollective!
            </h3>
            <p className="text-sm text-on-surface-variant">
              Upload your resume and we'll auto-fill your profile, skills, bio, and links, in seconds. You can skip this and do it later from your Profile.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="resume-prompt-upload-input"
          />
          <label
            htmlFor="resume-prompt-upload-input"
            className={`flex items-center justify-between gap-3 w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              success
                ? 'border-tertiary/50 bg-tertiary-container/10'
                : 'border-outline-variant hover:border-primary bg-surface-container-lowest'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {isParsing ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
              ) : success ? (
                <Check className="w-5 h-5 text-tertiary shrink-0" />
              ) : (
                <UploadCloud className="w-5 h-5 text-on-surface-variant shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-white truncate">
                  {isParsing ? 'Reading your resume...' : success ? 'Profile updated!' : fileName || 'Upload your resume (PDF)'}
                </p>
                {!success && (
                  <p className="text-[11px] text-on-surface-variant">
                    AI will read it and fill in your skills, bio, and links.
                  </p>
                )}
              </div>
            </div>
            {!success && (
              <span className="font-label-mono text-[10px] uppercase text-primary shrink-0">
                Choose file
              </span>
            )}
          </label>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-error">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </p>
          )}

          <button
            onClick={dismissResumePrompt}
            disabled={isParsing}
            className="w-full text-center font-label-mono text-xs uppercase text-on-surface-variant hover:text-white transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};
