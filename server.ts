import dns from 'node:dns';
import net from 'node:net';
dns.setDefaultResultOrder('ipv4first');
try { net.setDefaultAutoSelectFamily(true); net.setDefaultAutoSelectFamilyAttemptTimeout(1000); } catch { /* older Node */ }
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';
import { clerkClient, clerkMiddleware, getAuth } from '@clerk/express';
import { supabaseAdmin } from './server/supabase';
import { registerLearningProgressRoutes } from './server/learningProgress';
import { getPlatformIdentity, registerAdminRoutes } from './server/adminRoutes';
import { registerFacultyRoutes } from './server/facultyRoutes';

dotenv.config();
const app = express(); const PORT = 3000; const AI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
// Tried in order when the main model is overloaded (503/429). Override with GEMINI_FALLBACK_MODELS=a,b,c
const AI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.5-flash,gemini-2.5-flash,gemini-3.1-flash-lite').split(',').map((m) => m.trim()).filter(Boolean);
app.use(clerkMiddleware()); app.use(express.json({ limit: '12mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => { if (file.mimetype === 'application/pdf') cb(null, true); else cb(new Error('Only PDF files are supported.')); } });
function getAppBaseUrl(req: express.Request): string { return process.env.APP_URL || `http://${req.headers.host || 'localhost:3000'}`; }
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) { const { isAuthenticated, userId } = getAuth(req); if (!isAuthenticated || !userId) return res.status(401).json({ error: 'Not authenticated.' }); (req as any).authUserId = userId; next(); }
registerLearningProgressRoutes(app, requireAuth);
registerAdminRoutes(app, requireAuth);
registerFacultyRoutes(app, requireAuth);
function friendlyAiError(err: any): string { const rawMessage: string = err?.message || ''; const causeCode = String(err?.cause?.code || ''); if (/fetch failed|ENOTFOUND|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|UND_ERR/i.test(rawMessage + ' ' + causeCode)) return 'The server could not connect to Google AI. Check your internet, turn off any VPN or proxy, and try again. (Network error' + (causeCode ? ': ' + causeCode : '') + ')'; if (rawMessage.includes('API key not valid') || rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('403')) return 'The AI service is not configured correctly on this server (invalid API key). Please let the site admin know.'; if (rawMessage.includes('429') || rawMessage.toLowerCase().includes('quota') || rawMessage.toLowerCase().includes('rate limit')) return 'The AI service is getting a lot of requests right now (or the account is out of quota). Please try again shortly.'; if (rawMessage.includes('503') || rawMessage.toLowerCase().includes('unavailable') || rawMessage.toLowerCase().includes('overloaded') || rawMessage.toLowerCase().includes('high demand')) return "Google's AI model is temporarily overloaded from high demand right now. This usually clears up within a minute or two, please try again shortly."; if (rawMessage.includes('500') || rawMessage.toLowerCase().includes('internal error')) return 'The AI service hit an internal error on its end. Please try again in a moment.'; const looksLikeRawJson = rawMessage.trim().startsWith('{') || rawMessage.trim().startsWith('['); return !rawMessage || looksLikeRawJson ? 'Something went wrong reaching the AI service. Please try again in a moment.' : rawMessage; }

const isRetryableAiError = (err: any) => { const m = String(err?.message || '').toLowerCase(); return m.includes('503') || m.includes('429') || m.includes('overloaded') || m.includes('unavailable') || m.includes('high demand') || m.includes('resource_exhausted') || m.includes('deadline'); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Retries the main model with short backoff, then walks the fallback models. Only retryable errors trigger a retry.
async function generateWithFallback(ai: GoogleGenAI, params: { contents: any; config?: any }) {
  const models = [AI_MODEL, ...AI_FALLBACK_MODELS.filter((m) => m !== AI_MODEL)];
  let lastErr: any;
  for (let i = 0; i < models.length; i++) {
    const attempts = i === 0 ? 2 : 1;
    for (let a = 0; a < attempts; a++) {
      try { return await ai.models.generateContent({ model: models[i], ...params }); }
      catch (err: any) { lastErr = err; console.warn(`[ai] ${models[i]} failed (attempt ${a + 1}):`, String(err?.message || err).slice(0, 160), err?.cause?.code || err?.cause?.message || ''); if (/fetch failed|ENOTFOUND|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN/i.test(String(err?.message || '') + String(err?.cause?.code || ''))) throw err; if (!isRetryableAiError(err)) throw err; if (a < attempts - 1) await sleep(1200); }
    }
  }
  throw lastErr;
}
function getGeminiClient(): GoogleGenAI | null { const apiKey = process.env.GEMINI_API_KEY; return apiKey ? new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } }) : null; }
function emptyProfile(userId: string, clerkUser: any, pending: any = {}) { const email = clerkUser.emailAddresses?.find((e: any) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || ''; const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || email.split('@')[0] || 'Developer'; return { clerk_user_id: userId, name: pending.name || name, email, role: pending.role || 'student', college: pending.college || '', branch: pending.branch || '', academic_year: pending.academicYear || '', avatar: clerkUser.imageUrl || '', bio: '', rep: 0, level: 1, streak_days: 0, github_url: '', linkedin_url: '', skills: [], selected_domains: [], auth_provider: 'clerk', has_completed_onboarding: false, created_at: new Date().toISOString() }; }
function toUserProfile(row: any) { return row ? { id: row.clerk_user_id, name: row.name, email: row.email, role: row.role, college: row.college, branch: row.branch, academicYear: row.academic_year, avatar: row.avatar, bio: row.bio, rep: row.rep, level: row.level, streakDays: row.streak_days, githubUrl: row.github_url, linkedinUrl: row.linkedin_url, skills: row.skills || [], selectedDomains: row.selected_domains || [], authProvider: 'clerk', createdAt: row.created_at, accountStatus: row.account_status || 'active', hasCompletedOnboarding: row.has_completed_onboarding ?? false } : null; }
async function getOrCreateProfile(userId: string, pending: any = {}) { if (!supabaseAdmin) throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY on the server.'); const { data: existing, error: selectError } = await supabaseAdmin.from('devcollective_profiles').select('*').eq('clerk_user_id', userId).maybeSingle(); if (selectError) throw selectError; if (existing) return existing; const clerkUser = await clerkClient.users.getUser(userId); const profile = emptyProfile(userId, clerkUser, pending); const { data, error } = await supabaseAdmin.from('devcollective_profiles').insert(profile).select('*').single(); if (error) throw error; return data; }
async function syncAdminProfileRole(userId: string, profile: any) { if (!supabaseAdmin) return profile; const identity = await getPlatformIdentity(userId); if (!identity.isAdmin || profile.role === 'admin') return profile; const { data, error } = await supabaseAdmin.from('devcollective_profiles').update({ role: 'admin' }).eq('clerk_user_id', userId).select('*').single(); if (error) throw error; return data; }
function toMentorProfile(row: any) { return { id: row.clerk_user_id, name: row.name, title: row.role === 'faculty' ? 'Faculty Mentor' : 'Mentor', college: row.college || '', avatar: row.avatar || '', roleType: row.role === 'faculty' ? 'FACULTY' : 'SENIOR', skills: Array.isArray(row.skills) ? row.skills : [], level: Number(row.level) || 1, rep: Number(row.rep) || 0, bio: row.bio || '', availability: 'Not specified', isBusy: false, rating: 0, studentsHelped: 0 }; }
async function loadCommunityPosts(userId: string) {
  if (!supabaseAdmin) throw new Error('Supabase is not configured.');
  const { data: posts, error: postsError } = await supabaseAdmin.from('devcollective_posts').select('id,author_clerk_user_id,category,title,content,image_url,created_at,updated_at').order('created_at', { ascending: false }).limit(100);
  if (postsError) throw postsError;
  if (!posts?.length) return [];
  const authorIds = Array.from(new Set(posts.map((post: any) => post.author_clerk_user_id)));
  const { data: profiles, error: profilesError } = await supabaseAdmin.from('devcollective_profiles').select('clerk_user_id,name,college,avatar,role,rep,academic_year,level').in('clerk_user_id', authorIds);
  if (profilesError) throw profilesError;
  const profileMap = new Map((profiles || []).map((profile: any) => [profile.clerk_user_id, profile]));
  const postIds = posts.map((post: any) => post.id);
  const { data: likes, error: likesError } = await supabaseAdmin.from('devcollective_post_likes').select('post_id,user_clerk_user_id').in('post_id', postIds);
  if (likesError) throw likesError;
  const likeCount = new Map<string, number>();
  const likedByUser = new Set<string>();
  for (const like of likes || []) {
    likeCount.set(like.post_id, (likeCount.get(like.post_id) || 0) + 1);
    if (like.user_clerk_user_id === userId) likedByUser.add(like.post_id);
  }
  return posts.map((post: any) => {
    const author = profileMap.get(post.author_clerk_user_id) || {};
    return {
      id: post.id,
      authorId: post.author_clerk_user_id,
      authorName: author.name || 'Developer',
      authorCollege: author.college || '',
      authorAvatar: author.avatar || '',
      authorRole: author.role || 'student',
      authorRep: Number(author.rep) || 0,
      authorAcademicYear: author.academic_year || '',
      authorLevel: Number(author.level) || 1,
      category: post.category,
      title: post.title || undefined,
      content: post.content,
      imageUrl: post.image_url || undefined,
      likes: likeCount.get(post.id) || 0,
      commentsCount: 0,
      createdAt: post.created_at,
      likedByMe: likedByUser.has(post.id),
    };
  });
}
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/auth/info', (req, res) => res.json({ appUrl: getAppBaseUrl(req), authType: 'clerk', googleConfigured: true, githubConfigured: true, googleCallbackUrl: '', githubCallbackUrl: '', message: 'Clerk authentication active; Supabase stores application profiles.' }));
app.get('/api/auth/me', requireAuth, async (req, res) => { try { let user = await getOrCreateProfile((req as any).authUserId); user = await syncAdminProfileRole((req as any).authUserId, user); return res.json({ user: toUserProfile(user) }); } catch (err: any) { console.error('Error loading Clerk/Supabase profile:', err); return res.status(500).json({ error: err.message || 'Could not load your profile.' }); } });
app.post('/api/auth/sync', requireAuth, async (req, res) => { try { let user = await getOrCreateProfile((req as any).authUserId, req.body || {}); user = await syncAdminProfileRole((req as any).authUserId, user); return res.json({ user: toUserProfile(user) }); } catch (err: any) { console.error('Error syncing Clerk profile to Supabase:', err); return res.status(500).json({ error: err.message || 'Could not sync your profile.' }); } });
app.get('/api/mentors', requireAuth, async (_req, res) => { try { if (!supabaseAdmin) throw new Error('Supabase is not configured.'); const { data, error } = await supabaseAdmin.from('devcollective_profiles').select('clerk_user_id,name,email,role,college,avatar,bio,rep,level,skills').in('role', ['mentor','faculty']).order('name', { ascending: true }); if (error) throw error; return res.json({ mentors: (data || []).map(toMentorProfile) }); } catch (err: any) { console.error('Error loading mentors from Supabase:', err); return res.status(500).json({ error: err.message || 'Could not load mentors.' }); } });
app.get('/api/community/overview', requireAuth, async (_req, res) => { try {
  if (!supabaseAdmin) throw new Error('Supabase is not configured.');
  const [{ count: memberCount, error: memberError }, { data: posts, error: postError }, { data: profiles, error: profileError }, { data: comments, error: commentError }] = await Promise.all([
    supabaseAdmin.from('devcollective_profiles').select('clerk_user_id', { count: 'exact', head: true }),
    supabaseAdmin.from('devcollective_posts').select('id,author_clerk_user_id,category,title,content,created_at').order('created_at', { ascending: false }).limit(500),
    supabaseAdmin.from('devcollective_profiles').select('clerk_user_id,name,avatar,rep,level,academic_year,role,college,branch').order('rep', { ascending: false }).limit(10),
    supabaseAdmin.from('devcollective_post_comments').select('id,author_clerk_user_id,created_at').order('created_at', { ascending: false }).limit(1000),
  ]);
  if (memberError) throw memberError;
  if (postError) throw postError;
  if (profileError) throw profileError;
  if (commentError) throw commentError;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const activeIds = new Set<string>();
  for (const post of posts || []) if (new Date(post.created_at) >= today) activeIds.add(post.author_clerk_user_id);
  for (const comment of comments || []) if (new Date(comment.created_at) >= today) activeIds.add(comment.author_clerk_user_id);
  const tagCounts = new Map<string, number>();
  for (const post of posts || []) {
    const text = `${post.title || ''} ${post.content || ''}`;
    for (const match of text.matchAll(/#[a-zA-Z0-9_-]+/g)) {
      const tag = match[0].toLowerCase();
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  if (tagCounts.size === 0) { const inferred = [['#dsa', /dsa|data structure|algorithm/i], ['#web-dev', /web|frontend|backend|full.?stack|node|react/i], ['#system-design', /system design|architecture|scalability|websocket/i], ['#react', /react|next\.js|nextjs/i], ['#career', /career|placement|internship|resume/i], ['#project', /project|build|app|devcollective/i], ['#ai', /ai|gemini|llm|model/i], ['#help', /help|issue|problem|stuck|question/i]] as const; for (const post of posts || []) { const text = `${post.title || ''} ${post.content || ''}`; for (const [tag, pattern] of inferred) if (pattern.test(text)) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1); } } const popularTags = Array.from(tagCounts.entries()).sort((a,b) => b[1] - a[1]).slice(0, 8).map(([tag,count]) => ({ tag, count }));
  const topContributors = (profiles || []).slice(0, 5).map((profile: any) => ({
    id: profile.clerk_user_id, name: profile.name || 'Developer', avatar: profile.avatar || '',
    rep: Number(profile.rep) || 0, level: Number(profile.level) || 1,
    academicYear: profile.academic_year || '', college: profile.college || '', branch: profile.branch || '',
  }));
  return res.json({
    stats: { members: Number(memberCount) || 0, posts: (posts || []).length, projects: (posts || []).filter((post: any) => post.category === 'Projects').length, activeToday: activeIds.size },
    popularTags, topContributors,
  });
} catch (err: any) { console.error('Error loading community overview:', err); return res.status(500).json({ error: err.message || 'Could not load community overview.' }); } });

app.get('/api/community/posts', requireAuth, async (req, res) => { try { const posts = await loadCommunityPosts((req as any).authUserId); return res.json({ posts }); } catch (err: any) { console.error('Error loading community posts:', err); return res.status(500).json({ error: err.message || 'Could not load community posts.' }); } });
app.post('/api/community/posts', requireAuth, async (req, res) => { try { if (!supabaseAdmin) throw new Error('Supabase is not configured.'); const userId = (req as any).authUserId as string; const category = String(req.body?.category || 'General'); const allowedCategories = new Set(['Build in Public','Questions','Projects','Hackathons','AI','Android','General']); const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 160) : ''; const content = typeof req.body?.content === 'string' ? req.body.content.trim().slice(0, 5000) : ''; if (!allowedCategories.has(category)) return res.status(400).json({ error: 'Invalid post category.' }); if (!content) return res.status(400).json({ error: 'Post content is required.' }); const { data, error } = await supabaseAdmin.from('devcollective_posts').insert({ author_clerk_user_id: userId, category, title: title || null, content }).select('id,author_clerk_user_id,category,title,content,image_url,created_at,updated_at').single(); if (error) throw error; const posts = await loadCommunityPosts(userId); const created = posts.find((post: any) => post.id === data.id) || null; return res.status(201).json({ success: true, post: created }); } catch (err: any) { console.error('Error creating community post:', err); return res.status(500).json({ error: err.message || 'Could not create community post.' }); } });
app.post('/api/community/posts/:postId/like', requireAuth, async (req, res) => { try { if (!supabaseAdmin) throw new Error('Supabase is not configured.'); const userId = (req as any).authUserId as string; const postId = req.params.postId; const { data: existing, error: lookupError } = await supabaseAdmin.from('devcollective_post_likes').select('post_id').eq('post_id', postId).eq('user_clerk_user_id', userId).maybeSingle(); if (lookupError) throw lookupError; if (existing) { const { error } = await supabaseAdmin.from('devcollective_post_likes').delete().eq('post_id', postId).eq('user_clerk_user_id', userId); if (error) throw error; } else { const { error } = await supabaseAdmin.from('devcollective_post_likes').insert({ post_id: postId, user_clerk_user_id: userId }); if (error) throw error; } const { count, error: countError } = await supabaseAdmin.from('devcollective_post_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId); if (countError) throw countError; return res.json({ success: true, likedByMe: !existing, likes: count || 0 }); } catch (err: any) { console.error('Error toggling community post like:', err); return res.status(500).json({ error: err.message || 'Could not update post like.' }); } });
app.get('/api/auth/profile-by-email', async (req, res) => { try { if (!supabaseAdmin) throw new Error('Supabase is not configured.'); const email = String(req.query.email || '').trim().toLowerCase(); if (!email) return res.status(400).json({ error: 'Email is required.' }); const { data, error } = await supabaseAdmin.from('devcollective_profiles').select('clerk_user_id').ilike('email', email).maybeSingle(); if (error) throw error; return res.json({ exists: Boolean(data) }); } catch (err: any) { console.error('Error checking Supabase profile:', err); return res.status(500).json({ error: err.message || 'Could not check your profile.' }); } });
app.patch('/api/users/profile', requireAuth, async (req, res) => { try { if (!supabaseAdmin) throw new Error('Supabase is not configured.'); const userId = (req as any).authUserId as string; const allowedFields = ['branch', 'academicYear', 'githubUrl', 'linkedinUrl', 'skills', 'bio', 'selectedDomains', 'avatar', 'college', 'name', 'rep', 'hasCompletedOnboarding']; const updates: Record<string, any> = {}; for (const field of allowedFields) if (field in req.body) updates[field] = req.body[field]; const dbUpdates: Record<string, any> = {}; if ('branch' in updates) dbUpdates.branch = updates.branch; if ('academicYear' in updates) dbUpdates.academic_year = updates.academicYear; if ('githubUrl' in updates) dbUpdates.github_url = updates.githubUrl; if ('linkedinUrl' in updates) dbUpdates.linkedin_url = updates.linkedinUrl; if ('skills' in updates) dbUpdates.skills = updates.skills; if ('bio' in updates) dbUpdates.bio = updates.bio; if ('selectedDomains' in updates) dbUpdates.selected_domains = updates.selectedDomains; if ('avatar' in updates) dbUpdates.avatar = updates.avatar; if ('college' in updates) dbUpdates.college = updates.college; if ('name' in updates) dbUpdates.name = updates.name; if ('hasCompletedOnboarding' in updates) dbUpdates.has_completed_onboarding = Boolean(updates.hasCompletedOnboarding); if ('rep' in updates) { dbUpdates.rep = updates.rep; dbUpdates.level = Math.max(1, Math.floor((Number(updates.rep) || 0) / 150) + 1); } const { data, error } = await supabaseAdmin.from('devcollective_profiles').update(dbUpdates).eq('clerk_user_id', userId).select('*').single(); if (error) throw error; return res.json({ success: true, user: toUserProfile(data) }); } catch (err: any) { console.error('Error updating Supabase profile:', err); return res.status(500).json({ error: err.message || 'Failed to update profile.' }); } });

const ROADMAP_JSON_SCHEMA = { type: Type.OBJECT, properties: { roadmapTitle: { type: Type.STRING }, overview: { type: Type.STRING }, targetRole: { type: Type.STRING }, estimatedWeeksTotal: { type: Type.INTEGER }, recommendedPrerequisites: { type: Type.ARRAY, items: { type: Type.STRING } }, levels: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { levelNumber: { type: Type.INTEGER }, title: { type: Type.STRING }, description: { type: Type.STRING }, estimatedWeeks: { type: Type.INTEGER }, topics: { type: Type.ARRAY, items: { type: Type.STRING } }, capstoneProject: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, keySkills: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['title', 'description', 'keySkills'] }, learningResources: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, type: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['title', 'type', 'description'] } } }, required: ['levelNumber', 'title', 'description', 'estimatedWeeks', 'topics', 'capstoneProject', 'learningResources'] } } }, required: ['roadmapTitle', 'overview', 'targetRole', 'estimatedWeeksTotal', 'levels'] };
const ROADMAP_MENTOR_SYSTEM_PROMPT = `You are an expert tech career mentor and roadmap architect for college engineering students on DevCollective. Your job is to have a short, natural conversation with the student to understand: (1) which technology or field they're interested in, (2) their current skill level (beginner, intermediate, or advanced), and (3) what they already know. Ask ONE short question at a time. Once you have enough information, usually after 2 to 4 exchanges, call finalize_roadmap with a complete, realistic, progressive roadmap. If they're a true beginner, start with real fundamentals and never skip ahead. Use plain, encouraging language and concrete topics, capstones, and learning resources.`;
const finalizeRoadmapFunctionDeclaration = { name: 'finalize_roadmap', description: "Generate the student's complete personalized learning roadmap once enough information is known.", parameters: ROADMAP_JSON_SCHEMA as any };
app.post('/api/ai/roadmap-chat', async (req, res) => { try { const { message, history } = req.body as { message: string; history?: { role: 'user' | 'model'; text: string }[] }; if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required.' }); const ai = getGeminiClient(); if (!ai) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server. Please add it to your environment variables.' }); const contents = [...(history || []).slice(-16).map((h) => ({ role: h.role, parts: [{ text: h.text }] })), { role: 'user', parts: [{ text: message }] }]; const response = await generateWithFallback(ai, { contents, config: { systemInstruction: ROADMAP_MENTOR_SYSTEM_PROMPT, tools: [{ functionDeclarations: [finalizeRoadmapFunctionDeclaration] }] } }); const functionCalls = response.functionCalls; if (functionCalls?.length && functionCalls[0].name === 'finalize_roadmap') return res.json({ success: true, type: 'roadmap', roadmap: functionCalls[0].args }); return res.json({ success: true, type: 'question', message: response.text || "Could you tell me a bit more about what you're interested in?" }); } catch (err: any) { console.error('Error in /api/ai/roadmap-chat:', err); return res.status(500).json({ error: friendlyAiError(err) }); } });
app.post('/api/resume/parse', requireAuth, upload.single('resume'), async (req, res) => { try { if (!req.file) return res.status(400).json({ error: 'No resume file uploaded.' }); const ai = getGeminiClient(); if (!ai) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server. Please add it to your environment variables.' }); const { PDFParse } = await import('pdf-parse'); const parser = new PDFParse({ data: req.file.buffer }); const textResult = await parser.getText(); await parser.destroy(); const resumeText = textResult.text.slice(0, 15000); if (!resumeText.trim()) return res.status(422).json({ error: 'Could not extract any text from this PDF. Try a text-based PDF, not a scanned image.' }); const prompt = `Here is the raw extracted text from a student's resume:\n\n"""\n${resumeText}\n"""\n\nRead it carefully and extract structured profile data for a college developer platform. Only include information actually present or strongly implied. Do not invent information.`; const response = await generateWithFallback(ai, { contents: prompt, config: { systemInstruction: 'You are a resume parser for a student developer platform. Extract accurate, grounded structured data only. Never fabricate skills, links, or achievements.', responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { branch: { type: Type.STRING }, academicYear: { type: Type.STRING }, bio: { type: Type.STRING }, skills: { type: Type.ARRAY, items: { type: Type.STRING } }, githubUrl: { type: Type.STRING }, linkedinUrl: { type: Type.STRING }, confidence: { type: Type.STRING } }, required: ['branch', 'academicYear', 'bio', 'skills', 'githubUrl', 'linkedinUrl'] } } }); const parsed = JSON.parse(response.text || '{}'); return res.json({ success: true, extracted: parsed }); } catch (err: any) { console.error('Error parsing resume:', err); return res.status(500).json({ error: friendlyAiError(err) }); } });

// ---------------------------------------------------------------------------
// AI assistants: platform chatbot, roadmap study buddy, project generator agent
// All three share the same helpers (retry + fallback models, image input, history cleanup).
// ---------------------------------------------------------------------------
type ChatTurn = { role: 'user' | 'model'; text: string };
type ChatImage = { mimeType: string; data: string };

function cleanHistory(history: any): ChatTurn[] {
  const turns: ChatTurn[] = (Array.isArray(history) ? history : [])
    .filter((h: any) => h && (h.role === 'user' || h.role === 'model') && typeof h.text === 'string' && h.text.trim())
    .map((h: any) => ({ role: h.role, text: String(h.text).slice(0, 4000) }));
  while (turns.length && turns[0].role === 'model') turns.shift(); // Gemini wants the first turn from the user
  const merged: ChatTurn[] = [];
  for (const t of turns) { const last = merged[merged.length - 1]; if (last && last.role === t.role) last.text += `\n${t.text}`; else merged.push({ ...t }); }
  return merged.slice(-16);
}
function cleanImage(img: any): ChatImage | null {
  if (!img || typeof img.data !== 'string' || typeof img.mimeType !== 'string') return null;
  if (!/^image\/(png|jpe?g|webp|gif)$/i.test(img.mimeType)) return null;
  if (img.data.length > 7_000_000) return null; // roughly 5 MB of image after base64
  return { mimeType: img.mimeType, data: img.data.replace(/^data:[^;]+;base64,/, '') };
}
function buildContents(history: any, message: string, image: ChatImage | null) {
  const parts: any[] = [{ text: message }];
  if (image) parts.unshift({ inlineData: { mimeType: image.mimeType, data: image.data } });
  return [...cleanHistory(history).map((h) => ({ role: h.role, parts: [{ text: h.text }] })), { role: 'user', parts }];
}
function clip(value: any, max = 600): string { return String(value ?? '').slice(0, max); }
function describeLearner(ctx: any, facts: any): string {
  const p = ctx?.profile || {};
  const lines = [
    p.name && `Name: ${clip(p.name, 80)}`,
    (p.branch || facts?.branch) && `Branch: ${clip(p.branch || facts?.branch, 80)}`,
    (p.academicYear || facts?.academic_year) && `Academic year: ${clip(p.academicYear || facts?.academic_year, 40)}`,
    Array.isArray(p.skills) && p.skills.length && `Skills: ${p.skills.slice(0, 20).map((s: any) => clip(s, 40)).join(', ')}`,
    (p.rep ?? facts?.rep) !== undefined && `REP points: ${Number(p.rep ?? facts?.rep) || 0}`,
    (p.level ?? facts?.level) !== undefined && `Platform level: ${Number(p.level ?? facts?.level) || 1}`,
  ].filter(Boolean);
  const r = ctx?.roadmap;
  if (r?.roadmapTitle) {
    lines.push(`Chosen roadmap: ${clip(r.roadmapTitle, 120)} (target role: ${clip(r.targetRole, 80)}, ${Number(r.estimatedWeeksTotal) || '?'} weeks)`);
    if (Array.isArray(r.levels)) lines.push('Roadmap levels: ' + r.levels.slice(0, 8).map((l: any) => `L${l.levelNumber} ${clip(l.title, 60)} [${(l.topics || []).slice(0, 6).map((t: any) => clip(t, 40)).join(', ')}]`).join(' | '));
  }
  if (ctx?.project?.title) lines.push(`Current project: ${clip(ctx.project.title, 120)}; completed phases: ${Number(ctx.project.completedPhases) || 0} of ${Number(ctx.project.totalPhases) || '?'}`);
  return lines.length ? lines.join('\n') : 'No learner details are available yet.';
}
async function loadLearnerFacts(req: express.Request): Promise<any> {
  try { const { userId } = getAuth(req); if (!userId || !supabaseAdmin) return null; const { data } = await supabaseAdmin.from('devcollective_profiles').select('rep, level, branch, academic_year').eq('clerk_user_id', userId).maybeSingle(); return data || null; } catch { return null; }
}
const STYLE_RULES = `Style rules: write like a friendly senior who explains things simply. Short paragraphs, plain words, no buzzwords. Use **bold** for key terms and "- " bullets for lists. Never use em dashes. If the person sends an image, look at it carefully and answer based on what you see (errors, code, diagrams, screenshots).`;

const PLATFORM_ASSISTANT_PROMPT = `You are the DevCollective Assistant, the helper inside DevCollective, a college-only platform for engineering students. The platform has: a Dashboard, Community (posts and replies), Events, Roadmaps (an AI Roadmap Mentor builds a personalized learning plan), Level 0 (foundation learning), a Leaderboard ranked by REP points, a Mentor Directory (seniors who guide juniors), a Project Generator (a game-style project builder), CRT (placement training, coming soon), and Profile (resume upload auto-fills the profile).
Answer questions about the platform, courses, learning paths, careers, and study problems. Answer exactly what was asked first, then add one short helpful next step. If you do not know a platform detail, say so instead of guessing. ${STYLE_RULES}`;

const STUDY_BUDDY_PROMPT = `You are the Study Buddy for one learner on DevCollective. They are following a personalized roadmap and you help them while they learn it. Explain concepts at their level, give small examples, suggest what to study next from THEIR roadmap, help debug, and keep them motivated. Prefer to teach with tiny exercises instead of long lectures. If a question is outside their roadmap, still help, then connect it back to the roadmap. ${STYLE_RULES}`;

const PROJECT_AGENT_PROMPT = `You are the Project Generator Agent on DevCollective. You help a student build a real, job-worthy project in a game-like way. You can see the learner details below.
How you work:
1. If the learner asks for ideas, suggest 3 ideas, each with a one-line pitch, why recruiters care about it right now, and a difficulty tag. Make the FIRST one a beginner-friendly warm-up. The others should be unique and modern for the learner's domain (for example AI agents, RAG apps, computer vision, real-time systems, cloud and DevOps automation), inspired by real problem statements like Smart India Hackathon, IEEE and open civic problems. Avoid overused ideas such as calculators, library management, or basic to-do apps.
2. When they pick an idea, ask at most 3 short questions only if you really need them (skills, time per week, tools). Use the learner details to avoid asking things you already know.
3. When you have enough, call the create_project_plan function. The plan has a title, a plain-language problem statement, who it helps, the expected result, a suggested tech stack, an architecture summary, and 4 to 5 phases. Phase 1 must be small and quick to finish (a "quick first win"). Each phase has a goal, 3 to 5 concrete tasks, a "you will learn" line, a checkpoint question to prove they understood, and a REP reward (50 to 150 REP points).
4. After the plan exists, act as a coach. Explain the current phase, answer questions, and celebrate wins. Keep it fun, like a game quest, but never childish. Always call the reward REP points, never XP.
Always keep things easy to understand. Never overwhelm the learner with more than one phase at a time. ${STYLE_RULES}`;

const PROJECT_REVIEW_PROMPT = `You are a kind but honest senior engineer reviewing a student's project on DevCollective. Use the description, the repository details if provided, and any screenshot. Respond in this exact structure using markdown:
**What I understood** (2 to 3 lines on what the project does and how it seems to be built)
**What is good** (2 to 4 bullets)
**What to improve** (3 to 6 bullets, most important first, each with a concrete how-to)
**Missing pieces recruiters look for** (bullets, for example tests, README, deployment link, error handling, security, architecture diagram)
**Next 3 actions** (numbered, each doable in under a day)
**Score** (one line like "Project strength: 6/10" plus one sentence why)
Be specific, never vague. If information is missing, say what you could not see instead of guessing. ${STYLE_RULES}`;

const createProjectPlanDeclaration = {
  name: 'create_project_plan',
  description: 'Create the full game-style project plan once the learner has chosen an idea and you have enough information.',
  parameters: { type: Type.OBJECT, properties: {
    title: { type: Type.STRING }, tagline: { type: Type.STRING },
    problemStatement: { type: Type.STRING, description: 'Plain-language explanation of the real-world problem.' },
    whoItHelps: { type: Type.STRING }, expectedOutput: { type: Type.STRING },
    difficulty: { type: Type.STRING }, whyRecruitersCare: { type: Type.STRING },
    techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
    architecture: { type: Type.STRING, description: 'Short system architecture summary, one line per component.' },
    phases: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
      title: { type: Type.STRING }, goal: { type: Type.STRING },
      tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
      youWillLearn: { type: Type.STRING }, checkpoint: { type: Type.STRING },
      xp: { type: Type.INTEGER, description: 'REP points awarded for finishing this phase (50 to 150).' },
    }, required: ['title', 'goal', 'tasks', 'youWillLearn', 'checkpoint', 'xp'] } },
  }, required: ['title', 'problemStatement', 'expectedOutput', 'techStack', 'architecture', 'phases'] } as any,
};

async function fetchRepoSummary(url: string): Promise<string> {
  try {
    const m = String(url || '').match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git|\/|$)/i);
    if (!m) return '';
    const [, owner, repo] = m;
    const headers = { 'User-Agent': 'devcollective', Accept: 'application/vnd.github+json' };
    const meta: any = await (await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers })).json();
    const tree: any = await (await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers })).json();
    let readme = '';
    try { readme = (await (await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers: { ...headers, Accept: 'application/vnd.github.raw+json' } })).text()).slice(0, 4000); } catch {}
    const files = Array.isArray(tree) ? tree.map((f: any) => `${f.type === 'dir' ? '[dir] ' : ''}${f.name}`).slice(0, 40).join(', ') : '';
    return `GitHub repo ${owner}/${repo}: ${meta?.description || 'no description'}; main language: ${meta?.language || 'unknown'}; stars: ${meta?.stargazers_count ?? 0}; last push: ${meta?.pushed_at || 'unknown'}.\nTop-level files: ${files}\nREADME excerpt:\n${readme || '(no README found)'}`;
  } catch { return ''; }
}

async function runChat(req: express.Request, res: express.Response, system: string, opts: { tools?: any[]; useFacts?: boolean; extraContext?: string } = {}) {
  try {
    const { message, history, image, context } = req.body || {};
    const text = typeof message === 'string' ? message.trim() : '';
    const img = cleanImage(image);
    if (!text && !img) return res.status(400).json({ error: 'Message is required.' });
    const ai = getGeminiClient();
    if (!ai) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server. Please add it to your environment variables.' });
    const facts = opts.useFacts === false ? null : await loadLearnerFacts(req);
    const systemInstruction = `${system}\n\nLEARNER DETAILS:\n${describeLearner(context, facts)}${opts.extraContext ? `\n\n${opts.extraContext}` : ''}`;
    const response = await generateWithFallback(ai, { contents: buildContents(history, text || 'Please look at the attached image and help me.', img), config: { systemInstruction, ...(opts.tools ? { tools: [{ functionDeclarations: opts.tools }] } : {}) } });
    const call = response.functionCalls?.[0];
    if (call?.name === 'create_project_plan') return res.json({ success: true, reply: `Your quest is ready: "${(call.args as any)?.title}". Check the project board and start with Phase 1.`, plan: call.args });
    return res.json({ success: true, reply: response.text || "I could not come up with an answer. Could you rephrase that?" });
  } catch (err: any) { console.error('AI chat error:', err); return res.status(500).json({ error: friendlyAiError(err) }); }
}

app.post('/api/chat', (req, res) => runChat(req, res, PLATFORM_ASSISTANT_PROMPT));
app.post('/api/ai/study-buddy', (req, res) => runChat(req, res, STUDY_BUDDY_PROMPT));
app.post('/api/ai/project-chat', (req, res) => runChat(req, res, PROJECT_AGENT_PROMPT, { tools: [createProjectPlanDeclaration] }));
app.post('/api/ai/project-review', async (req, res) => {
  const repo = await fetchRepoSummary(String(req.body?.repoUrl || ''));
  const plan = req.body?.context?.plan;
  const extra = [repo && `REPOSITORY DETAILS:\n${repo}`, plan?.title && `The learner's planned project was "${clip(plan.title, 120)}" with phases: ${(plan.phases || []).map((p: any) => clip(p.title, 60)).join(' > ')}`].filter(Boolean).join('\n\n');
  return runChat(req, res, PROJECT_REVIEW_PROMPT, { extraContext: extra });
});

// ---------------------------------------------------------------------------
// CRT (campus recruitment training): aptitude questions and interview practice
// ---------------------------------------------------------------------------
type AptQ = { category: 'Quantitative' | 'Logical' | 'Verbal'; question: string; options: string[]; answerIndex: number; explanation: string };
const APTITUDE_BANK: AptQ[] = [
  { category: 'Quantitative', question: 'A train 120 m long runs at 54 km/h. How long does it take to pass a pole?', options: ['6 s', '8 s', '9 s', '10 s'], answerIndex: 1, explanation: '54 km/h is 15 m/s. Time = 120 / 15 = 8 seconds.' },
  { category: 'Quantitative', question: 'If 20% of a number is 50, what is the number?', options: ['200', '250', '300', '350'], answerIndex: 1, explanation: '20% of x = 50, so x = 50 / 0.2 = 250.' },
  { category: 'Quantitative', question: 'A can finish a job in 10 days and B in 15 days. Working together, how many days do they need?', options: ['5', '6', '7.5', '8'], answerIndex: 1, explanation: 'Their daily work is 1/10 + 1/15 = 1/6, so they need 6 days.' },
  { category: 'Quantitative', question: 'What is the simple interest on Rs 5000 at 8% per year for 3 years?', options: ['Rs 1000', 'Rs 1200', 'Rs 1250', 'Rs 1400'], answerIndex: 1, explanation: 'SI = 5000 x 8 x 3 / 100 = 1200.' },
  { category: 'Quantitative', question: 'What is the average of the first five multiples of 3?', options: ['8', '9', '10', '12'], answerIndex: 1, explanation: '3, 6, 9, 12, 15 add up to 45. 45 / 5 = 9.' },
  { category: 'Logical', question: 'Find the next number: 2, 6, 12, 20, 30, ?', options: ['40', '42', '44', '48'], answerIndex: 1, explanation: 'The gaps grow by 2 each time (4, 6, 8, 10, 12). 30 + 12 = 42.' },
  { category: 'Logical', question: 'If CAT = 24 using the sum of letter positions (C=3, A=1, T=20), what is DOG?', options: ['24', '26', '28', '30'], answerIndex: 1, explanation: 'D=4, O=15, G=7. 4 + 15 + 7 = 26.' },
  { category: 'Logical', question: 'A man points to a photo and says, "His mother is the only daughter of my mother." Who is in the photo?', options: ['His son', 'His nephew', 'His brother', 'His cousin'], answerIndex: 1, explanation: 'The only daughter of his mother is his sister, so the boy in the photo is his sister\'s son: his nephew.' },
  { category: 'Logical', question: 'All roses are flowers. Some flowers fade quickly. Which conclusion definitely follows?', options: ['Some roses fade quickly', 'All flowers are roses', 'Some flowers are roses', 'No rose fades quickly'], answerIndex: 2, explanation: 'If every rose is a flower, then at least some flowers are roses. The other statements are not guaranteed.' },
  { category: 'Logical', question: 'Which one is the odd one out? 8, 27, 64, 100, 125', options: ['8', '27', '100', '125'], answerIndex: 2, explanation: 'All others are perfect cubes (2, 3, 4, 5 cubed). 100 is not.' },
  { category: 'Verbal', question: 'Choose the word closest in meaning to "candid".', options: ['Secretive', 'Frank', 'Hostile', 'Careless'], answerIndex: 1, explanation: 'Candid means open and honest, which is the same as frank.' },
  { category: 'Verbal', question: 'Fill in the blank: She has been working here ___ 2019.', options: ['for', 'since', 'from', 'by'], answerIndex: 1, explanation: 'Use "since" with a starting point in time (2019).' },
  { category: 'Verbal', question: 'Choose the correct sentence.', options: ['Neither of the boys were present.', 'Neither of the boys was present.', 'Neither of the boys are present.', 'Neither of the boys have been present.'], answerIndex: 1, explanation: '"Neither" is singular, so it takes "was".' },
  { category: 'Verbal', question: 'Choose the word opposite in meaning to "scarce".', options: ['Rare', 'Limited', 'Abundant', 'Tiny'], answerIndex: 2, explanation: 'Scarce means in short supply. The opposite is abundant.' },
  { category: 'Verbal', question: 'What does the idiom "to burn the midnight oil" mean?', options: ['To waste fuel', 'To work late into the night', 'To start a fire', 'To wake up early'], answerIndex: 1, explanation: 'It means working or studying until very late at night.' },
];
function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function parseJsonLoose(text: string): any {
  const t = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch { const m = t.match(/[\[{][\s\S]*[\]}]/); if (m) return JSON.parse(m[0]); throw new Error('The AI answer was not valid JSON.'); }
}
function validAptQ(q: any): q is AptQ {
  return q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4 && q.options.every((o: any) => typeof o === 'string')
    && Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < 4 && typeof q.explanation === 'string' && ['Quantitative', 'Logical', 'Verbal'].includes(q.category);
}

app.post('/api/crt/aptitude', async (_req, res) => {
  // The built-in bank is the safe fallback, so the test always works even if the AI is busy.
  const fallback = () => res.json({ success: true, source: 'builtin', questions: shuffle(APTITUDE_BANK).slice(0, 15) });
  try {
    const ai = getGeminiClient();
    if (!ai) return fallback();
    const response = await generateWithFallback(ai, {
      contents: [{ role: 'user', parts: [{ text: 'Create 15 fresh multiple-choice aptitude questions for Indian campus placement tests (like TCS, Infosys, Wipro). Exactly 5 Quantitative (percentages, time and work, speed and distance, ratio, interest), 5 Logical (series, coding-decoding, blood relations, syllogisms, puzzles), 5 Verbal (grammar, synonyms, antonyms, sentence correction). Medium difficulty. Each question has exactly 4 options, the zero-based answerIndex of the correct option, and a one or two sentence explanation. Double check every answer is correct. Return only a JSON array of objects with keys category, question, options, answerIndex, explanation.' }] }],
      config: { responseMimeType: 'application/json', temperature: 0.8 },
    });
    const list = parseJsonLoose(response.text || '');
    const good = (Array.isArray(list) ? list : []).filter(validAptQ);
    if (good.length < 10) return fallback();
    return res.json({ success: true, source: 'ai', questions: good.slice(0, 15) });
  } catch (err) { console.warn('[crt] aptitude generation failed, using built-in bank:', String((err as any)?.message || err).slice(0, 120)); return fallback(); }
});

const HR_FALLBACK = ['Tell me about yourself.', 'What are your strengths and one weakness you are working on?', 'Describe a time you worked in a team and faced a disagreement. What did you do?', 'Why should we hire you?', 'Where do you see yourself in five years?', 'Tell me about a project you are proud of and what you learned from it.'];

app.post('/api/crt/interview', async (req, res) => {
  try {
    const { type, mode, domain, level, question, answer, asked, spokenStats } = req.body || {};
    const kind = type === 'technical' ? 'technical' : 'hr';
    const dom = clip(domain, 80) || 'general software engineering';
    const ai = getGeminiClient();
    if (mode === 'question') {
      const prior: string[] = (Array.isArray(asked) ? asked : []).map((q: any) => clip(q, 300)).slice(0, 10);
      if (!ai) return res.json({ success: true, question: kind === 'hr' ? (HR_FALLBACK.find((q) => !prior.includes(q)) || HR_FALLBACK[0]) : `Explain a core concept of ${dom} in simple words.` });
      const prompt = kind === 'hr'
        ? `You are an HR interviewer for a campus hiring drive for fresher engineers. Ask ONE interview question. Questions so far: ${prior.length ? prior.map((q, i) => `${i + 1}. ${q}`).join(' | ') : 'none'}. Move through: introduction, strengths and weaknesses, teamwork, a challenge, motivation, and career goals. Do not repeat a question. Return only the question text, one or two sentences, no numbering.`
        : `You are a technical interviewer for a fresher role in ${dom}. The candidate is at ${clip(level, 40) || 'beginner to intermediate'} level. Ask ONE technical question that a fresher can answer in 3 to 6 sentences (concept, small scenario or debugging idea, not a long coding task). Questions so far: ${prior.length ? prior.map((q, i) => `${i + 1}. ${q}`).join(' | ') : 'none'}. Start easier and get slightly harder. Do not repeat. Return only the question text, no numbering.`;
      const r = await generateWithFallback(ai, { contents: [{ role: 'user', parts: [{ text: prompt }] }] });
      return res.json({ success: true, question: (r.text || '').trim().replace(/^["']|["']$/g, '') || HR_FALLBACK[0] });
    }
    if (mode === 'evaluate') {
      const q = clip(question, 500), a = clip(answer, 4000);
      if (!a.trim()) return res.status(400).json({ error: 'Please give an answer first.' });
      if (!ai) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      const stats = spokenStats ? `Spoken delivery: ${Number(spokenStats.wordsPerMinute) || 0} words per minute, ${Number(spokenStats.fillerCount) || 0} filler words.` : '';
      const prompt = `You are a fair, encouraging ${kind === 'hr' ? 'HR' : `technical (${dom})`} interviewer scoring a fresher's answer.\nQuestion: ${q}\nAnswer: ${a}\n${stats}\nReturn JSON with keys: score (number 0 to 10, one decimal), verdict (one short sentence), strengths (array of 1 to 3 short strings), improvements (array of 2 to 4 short, concrete strings), betterAnswer (a model answer of 3 to 5 sentences in simple words${kind === 'technical' ? ', technically correct' : ', first person'}). Be honest: short or vague answers must score low. Never use em dashes.`;
      const r = await generateWithFallback(ai, { contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { responseMimeType: 'application/json', temperature: 0.4 } });
      const out = parseJsonLoose(r.text || '');
      return res.json({ success: true, evaluation: { score: Math.max(0, Math.min(10, Number(out.score) || 0)), verdict: clip(out.verdict, 300), strengths: (Array.isArray(out.strengths) ? out.strengths : []).map((x: any) => clip(x, 300)).slice(0, 4), improvements: (Array.isArray(out.improvements) ? out.improvements : []).map((x: any) => clip(x, 300)).slice(0, 5), betterAnswer: clip(out.betterAnswer, 1500) } });
    }
    return res.status(400).json({ error: 'Unknown mode.' });
  } catch (err: any) { console.error('CRT interview error:', err); return res.status(500).json({ error: friendlyAiError(err) }); }
});

// Any unknown /api route must answer with JSON, never with the website HTML.
app.use('/api', (_req, res) => res.status(404).json({ error: 'This API route does not exist.' }));

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.listen(PORT, () => console.log(`DevCollective server running on http://localhost:${PORT}`));
}
startServer();
