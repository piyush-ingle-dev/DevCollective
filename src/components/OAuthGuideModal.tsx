import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, Check, Copy, X } from 'lucide-react';

export const OAuthGuideModal: React.FC = () => {
  const { showOAuthModal, setShowOAuthModal, oauthProviderToSimulate, oauthInfo } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!showOAuthModal) return null;

  const providerName = oauthProviderToSimulate === 'google' ? 'Google' : oauthProviderToSimulate === 'github' ? 'GitHub' : 'OAuth';
  const callbackUrl = oauthInfo
    ? oauthProviderToSimulate === 'google'
      ? oauthInfo.googleCallbackUrl
      : oauthInfo.githubCallbackUrl
    : `${window.location.origin}/api/auth/${oauthProviderToSimulate || 'google'}/callback`;

  const envVarNames = oauthProviderToSimulate === 'google'
    ? ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
    : ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'];

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="bg-surface-container border-2 border-outline-variant rounded-2xl max-w-xl w-full p-6 md:p-8 shadow-2xl relative overflow-hidden animate-fade-in">
        <button
          onClick={() => setShowOAuthModal(false)}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-white p-2 rounded-full hover:bg-surface-container-high transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-primary">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="font-label-mono text-xs uppercase tracking-widest text-primary">
              {providerName} Sign-In Setup
            </span>
            <h3 className="font-headline-md text-2xl font-bold text-white">
              Not connected yet
            </h3>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant mb-5">
          {providerName} sign-in isn't configured on this server yet. Add real credentials to enable it, students can then sign in with one click.
        </p>

        <div className="border-t border-outline-variant/40 pt-4 space-y-3">
          <h4 className="font-label-mono text-xs uppercase font-bold text-on-surface-variant flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <span>Setup steps:</span>
          </h4>

          <p className="text-xs text-on-surface-variant">
            1. Copy this exact redirect URI into your {providerName} app settings:
          </p>
          <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5">
            <input
              type="text"
              readOnly
              value={callbackUrl}
              className="bg-transparent text-xs text-secondary font-label-mono w-full outline-none"
            />
            <button
              onClick={() => handleCopy(callbackUrl, 'callback')}
              className="px-3 py-1 bg-surface-container-high border border-outline-variant hover:border-primary rounded-lg text-xs font-bold text-white flex items-center gap-1 transition-colors"
            >
              {copiedField === 'callback' ? <Check className="w-3.5 h-3.5 text-tertiary" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === 'callback' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="text-[11px] text-outline font-label-mono space-y-1">
            <p>2. Open {oauthProviderToSimulate === 'google' ? 'Google Cloud Console → APIs & Services → Credentials' : 'GitHub → Settings → Developer settings → OAuth Apps'}</p>
            <p>3. Create an OAuth Client (Web application) and paste the redirect URI above</p>
            <p>4. Copy the Client ID and Client Secret into your project's .env file as {envVarNames[0]} and {envVarNames[1]}</p>
            <p>5. Restart the server, this button will then redirect for a real sign-in</p>
          </div>
        </div>
      </div>
    </div>
  );
};
