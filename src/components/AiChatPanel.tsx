import React, { useEffect, useRef, useState } from 'react';
import { Send, Loader2, ImagePlus, Mic, Square, X, Trash2, AlertCircle } from 'lucide-react';
import { postJson, fileToChatImage, loadJson, saveJson, ChatImagePayload } from '../lib/aiClient';

export interface PanelMessage { role: 'user' | 'model'; text: string; image?: string }

// Renders **bold** and "- " bullets so AI answers look clean.
export function renderFormattedText(text: string): React.ReactNode {
  const inline = (line: string, k: string) => line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={`${k}-${i}`} className="font-bold">{part.slice(2, -2)}</strong>
      : <React.Fragment key={`${k}-${i}`}>{part}</React.Fragment>);
  return text.split('\n').map((line, i) => {
    const t = line.trim();
    const b = t.match(/^[*-]\s+(.*)$/);
    const n = t.match(/^(\d+)[.)]\s+(.*)$/);
    if (b) return <div key={i} className="flex gap-2 pl-0.5"><span className="shrink-0">•</span><span>{inline(b[1], `l${i}`)}</span></div>;
    if (n) return <div key={i} className="flex gap-2 pl-0.5"><span className="shrink-0 font-bold">{n[1]}.</span><span>{inline(n[2], `l${i}`)}</span></div>;
    if (!t) return <div key={i} className="h-1.5" />;
    return <div key={i}>{inline(line, `l${i}`)}</div>;
  });
}

interface Props {
  storageKey: string | null;          // chats are saved under this key, so they survive refresh and tab changes
  welcome: string;
  endpoint: string;
  buildContext?: () => Record<string, unknown>;
  placeholder?: string;
  suggestions?: string[];
  onData?: (data: any) => void;       // lets a page react to extra data from the server (like a project plan)
  heightClass?: string;
  storage?: 'local' | 'session';      // 'session' clears when the browser tab is closed
}

export const AiChatPanel: React.FC<Props> = ({ storageKey, welcome, endpoint, buildContext, placeholder = 'Type your message...', suggestions, onData, heightClass = 'h-full', storage: storageProp = 'local' }) => {
  const storage: 'local' | 'session' = storageProp === 'session' ? 'session' : 'local';
  const welcomeMsg: PanelMessage = { role: 'model', text: welcome };
  const [messages, setMessagesState] = useState<PanelMessage[]>(() => { const saved = loadJson<PanelMessage[]>(storageKey, [], storage); return saved.length ? saved : [welcomeMsg]; });
  const [input, setInput] = useState('');
  const [image, setImage] = useState<ChatImagePayload | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recogRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const keyRef = useRef(storageKey);
  keyRef.current = storageKey;

  // Every change is written to storage right away (never from an effect), so reopening a page can never wipe a saved chat.
  const setMessages = (updater: (prev: PanelMessage[]) => PanelMessage[]) => {
    setMessagesState((prev) => { const next = updater(prev); saveJson(keyRef.current, next.slice(-60), storage); return next; });
  };

  // If the signed-in account changes, load that account's chat
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const saved = loadJson<PanelMessage[]>(storageKey, [], storage);
    setMessagesState(saved.length ? saved : [welcomeMsg]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, sending]);
  useEffect(() => () => { try { recogRef.current?.stop(); } catch { /* ignore */ } }, []);

  const growInput = () => { const el = inputRef.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 140)}px`; };
  useEffect(growInput, [input]);

  const send = async (presetText?: string) => {
    const text = (presetText ?? input).trim();
    if ((!text && !image) || sending) return;
    const userMsg: PanelMessage = { role: 'user', text: text || '(sent an image)', image: image?.preview };
    const history = messages.map((m) => ({ role: m.role, text: m.image ? `${m.text}\n[the user attached an image]` : m.text }));
    const sentImage = image;
    setMessages((prev) => [...prev, userMsg]);
    setInput(''); setImage(null); setError(null); setSending(true);
    try {
      const data = await postJson<{ reply: string }>(endpoint, {
        message: text, history,
        image: sentImage ? { mimeType: sentImage.mimeType, data: sentImage.data } : undefined,
        context: buildContext?.(),
      });
      setMessages((prev) => [...prev, { role: 'model', text: data.reply }]);
      onData?.(data);
    } catch (e: any) { setError(e.message || 'Something went wrong.'); }
    finally { setSending(false); }
  };

  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    try { setImage(await fileToChatImage(file)); setError(null); } catch (err: any) { setError(err.message); }
  };

  const onPaste = async (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items as DataTransferItemList).find((i: DataTransferItem) => i.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (file) { e.preventDefault(); try { setImage(await fileToChatImage(file)); } catch (err: any) { setError(err.message); } }
  };

  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError('Voice input is not supported in this browser. Please use Chrome or Edge.'); return; }
    if (listening) { recogRef.current?.stop(); return; }
    const r = new SR(); r.lang = 'en-IN'; r.interimResults = true; r.continuous = false;
    const base = input ? `${input} ` : '';
    r.onresult = (ev: any) => { setInput(base + Array.from(ev.results).map((x: any) => x[0].transcript).join('')); };
    r.onerror = () => { setListening(false); setError('Could not use the microphone. Check the browser permission.'); };
    r.onend = () => setListening(false);
    recogRef.current = r; setListening(true); r.start();
  };

  const clearChat = () => { setMessages(() => [welcomeMsg]); setError(null); };

  return (
    <div className={`flex flex-col min-h-0 ${heightClass}`}>
      <div ref={scrollRef} data-lenis-prevent style={{ overscrollBehavior: 'contain' }} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed space-y-0.5 break-words ${m.role === 'user' ? 'bg-primary-container text-on-primary rounded-br-sm border border-outline-variant/60' : 'bg-surface-container-low border border-outline-variant/50 text-on-surface rounded-bl-sm'}`}>
              {m.image && <img src={m.image} alt="attached" className="mb-2 max-h-40 rounded-lg border border-outline-variant/60" />}
              {renderFormattedText(m.text)}
            </div>
          </div>
        ))}
        {sending && <div className="flex justify-start"><div className="bg-surface-container-low border border-outline-variant/50 px-3.5 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs text-on-surface-variant">Thinking...</span></div></div>}
        {error && <div className="flex items-start gap-2 bg-error-container border border-outline-variant text-on-error px-3.5 py-2.5 rounded-xl text-xs"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
      </div>

      {suggestions && messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {suggestions.map((s) => <button key={s} type="button" disabled={sending} onClick={() => send(s)} className="px-3 py-1.5 rounded-lg text-xs font-label-mono border border-outline-variant/60 bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:border-primary disabled:opacity-50">{s}</button>)}
        </div>
      )}

      {image && (
        <div className="px-4 pb-2"><div className="relative inline-block"><img src={image.preview} alt="to send" className="h-16 rounded-lg border border-outline-variant" /><button type="button" onClick={() => setImage(null)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center" aria-label="Remove image"><X className="w-3 h-3" /></button></div></div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-end gap-2 p-3 border-t-2 border-outline-variant bg-surface-container-low shrink-0">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
        <button type="button" onClick={() => fileRef.current?.click()} title="Attach an image" aria-label="Attach an image" className="w-9 h-9 shrink-0 rounded-full border border-outline-variant/60 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center"><ImagePlus className="w-4 h-4" /></button>
        <button type="button" onClick={toggleMic} title={listening ? 'Stop listening' : 'Speak your message'} aria-label="Voice input" className={`w-9 h-9 shrink-0 rounded-full border border-outline-variant/60 flex items-center justify-center ${listening ? 'bg-error-container text-on-error animate-pulse' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}`}>{listening ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-4 h-4" />}</button>
        <textarea ref={inputRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)} onPaste={onPaste}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
          placeholder={placeholder} aria-label="Message" style={{ overscrollBehavior: 'contain' }}
          className="flex-1 min-w-0 resize-none bg-surface-container-lowest border-2 border-outline-variant rounded-2xl px-4 py-2.5 text-sm leading-5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary max-h-36" />
        <button type="submit" disabled={sending || (!input.trim() && !image)} aria-label="Send" className="w-10 h-10 shrink-0 bg-primary-container text-on-primary border border-outline-variant rounded-full flex items-center justify-center hover:brightness-95 active:scale-95 transition-all disabled:opacity-50"><Send className="w-4 h-4" /></button>
        <button type="button" onClick={clearChat} title="Clear this chat" aria-label="Clear chat" className="w-9 h-9 shrink-0 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
      </form>
    </div>
  );
};
