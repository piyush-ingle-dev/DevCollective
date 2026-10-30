import type { Express, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { clerkClient } from '@clerk/express';
import { supabaseAdmin } from './supabase';
import { requireAdmin, normalizeEmail } from './adminRoutes';

const COLLEGE = 'GHRCEMN';

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const makeToken = () => crypto.randomBytes(32).toString('hex');

async function sendInviteEmail(email: string, inviteUrl: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) return false;
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME || 'DevCollective' },
      to: [{ email }],
      subject: 'DevCollective faculty invitation',
      htmlContent: '<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>DevCollective Faculty Invitation</h2><p>You have been invited to join DevCollective as faculty.</p><p><a href="' + inviteUrl + '">Accept faculty invitation</a></p><p>This invitation expires in 7 days.</p></div>',
    }),
  });
  return response.ok;
}

const facultyEmailAllowed = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));

const clampArray = (value: unknown, max = 30) =>
  Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, max) : [];

const toFacultyDirectoryProfile = (profile: any, faculty: any) => ({
  id: profile.clerk_user_id,
  name: profile.name || 'Faculty',
  email: profile.email || '',
  phone: faculty.phone || '',
  avatar: profile.avatar || '',
  college: profile.college || COLLEGE,
  designation: faculty.designation || 'Faculty',
  department: faculty.department || '',
  employeeId: faculty.employee_id || '',
  subjects: Array.isArray(faculty.subjects) ? faculty.subjects : [],
  expertise: Array.isArray(faculty.expertise) ? faculty.expertise : [],
  yearsExperience: faculty.years_experience == null ? null : Number(faculty.years_experience),
  mentoringAreas: Array.isArray(faculty.mentoring_areas) ? faculty.mentoring_areas : [],
  bio: faculty.bio || profile.bio || '',
  availabilityStatus: faculty.availability_status || 'available',
  availabilityNote: faculty.availability_note || '',
  verified: faculty.approval_status === 'approved' && profile.account_status === 'active',
  joinedAt: faculty.approved_at || faculty.created_at,
});

async function writeFacultyAudit(facultyClerkUserId: string | null, actorClerkUserId: string, action: string, details: Record<string, unknown> = {}) {
  if (!supabaseAdmin) return;
  const { error } = await supabaseAdmin.from('devcollective_faculty_audit_log').insert({
    faculty_clerk_user_id: facultyClerkUserId,
    actor_clerk_user_id: actorClerkUserId,
    action,
    details,
  });
  if (error) console.error('[faculty] audit write failed:', error);
}

export function registerFacultyRoutes(app: Express, requireAuth: (req: Request, res: Response, next: NextFunction) => void) {
  app.get('/api/faculty/invitations/:token', async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase is not configured.' });
    const token = String(req.params.token || '');
    if (!token) return res.status(400).json({ error: 'Invitation token is required.' });
    const { data, error } = await supabaseAdmin.from('devcollective_faculty_invitations').select('email,college,expires_at,status').eq('token_hash', hashToken(token)).eq('status', 'pending').gt('expires_at', new Date().toISOString()).maybeSingle();
    if (error) return res.status(500).json({ error: 'Could not validate the faculty invitation.' });
    if (!data) return res.status(404).json({ error: 'This faculty invitation is invalid or expired.' });
    return res.json({ email: data.email, college: data.college, expiresAt: data.expires_at });
  });

  app.post('/api/admin/faculty-invitations', requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const actorId = (req as any).authUserId as string;
      const email = normalizeEmail(String(req.body?.email || ''));
      const college = String(req.body?.college || COLLEGE).trim().slice(0, 120);
      if (!facultyEmailAllowed(email)) return res.status(400).json({ error: 'Use a valid email address.' });

      const { count: recentInvites, error: rateError } = await supabaseAdmin
        .from('devcollective_faculty_audit_log')
        .select('id', { count: 'exact', head: true })
        .eq('actor_clerk_user_id', actorId)
        .eq('action', 'invite_created')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
      if (rateError) throw rateError;
      if ((recentInvites || 0) >= 20) return res.status(429).json({ error: 'Invitation rate limit reached. Try again later.' });

      const { data: existingPending } = await supabaseAdmin.from('devcollective_faculty_invitations').select('id').eq('status', 'pending').ilike('email', email).maybeSingle();
      if (existingPending) return res.status(409).json({ error: 'A pending invitation already exists for this email address.' });

      const token = makeToken();
      const { data, error } = await supabaseAdmin.from('devcollective_faculty_invitations').insert({
        email, college, invited_by: actorId, token_hash: hashToken(token),
      }).select('id,email,college,expires_at,status,created_at').single();
      if (error) throw error;
      const inviteUrl = getInviteUrl(req, token);
      const emailSent = await sendInviteEmail(email, inviteUrl);
      await writeFacultyAudit(null, actorId, 'invite_created', { invitationId: data.id, email });
      return res.status(201).json({ success: true, invitation: data, inviteUrl, emailSent });
    } catch (error: any) {
      console.error('[faculty] invitation creation failed:', error);
      return res.status(500).json({ error: error.message || 'Could not create faculty invitation.' });
    }
  });

  app.get('/api/admin/faculty-invitations', requireAuth, requireAdmin, async (_req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase is not configured.' });
    await supabaseAdmin.from('devcollective_faculty_invitations').update({ status: 'expired' }).eq('status', 'pending').lte('expires_at', new Date().toISOString());
    const { data, error } = await supabaseAdmin.from('devcollective_faculty_invitations').select('id,email,college,status,expires_at,created_at,accepted_at,invited_by').order('created_at', { ascending: false }).limit(100);
    if (error) {
      console.error('[faculty] load invitations failed:', error);
      return res.status(500).json({ error: error.message || 'Could not load faculty invitations.' });
    }
    return res.json({ invitations: data || [] });
  });

  app.post('/api/admin/faculty-invitations/:id/revoke', requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const actorId = (req as any).authUserId as string;
      const invitationId = String(req.params.id);
      const { data, error } = await supabaseAdmin.from('devcollective_faculty_invitations').update({ status: 'revoked' }).eq('id', invitationId).eq('status', 'pending').select('id,email').maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Pending invitation not found.' });
      await writeFacultyAudit(null, actorId, 'invite_revoked', { invitationId, email: data.email });
      return res.json({ success: true });
    } catch (error: any) {
      console.error('[faculty] invitation revoke failed:', error);
      return res.status(500).json({ error: error.message || 'Could not revoke invitation.' });
    }
  });

  app.post('/api/admin/faculty-invitations/:id/resend', requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const actorId = (req as any).authUserId as string;
      const invitationId = String(req.params.id);
      const { data: oldInvite, error: oldError } = await supabaseAdmin.from('devcollective_faculty_invitations').select('id,email,college,status').eq('id', invitationId).maybeSingle();
      if (oldError) throw oldError;
      if (!oldInvite) return res.status(404).json({ error: 'Invitation not found.' });
      if (oldInvite.status !== 'pending') return res.status(409).json({ error: 'Only pending invitations can be resent.' });

      const { error: revokeError } = await supabaseAdmin.from('devcollective_faculty_invitations').update({ status: 'revoked' }).eq('id', invitationId);
      if (revokeError) throw revokeError;

      const token = makeToken();
      const { data: replacement, error: insertError } = await supabaseAdmin.from('devcollective_faculty_invitations').insert({
        email: oldInvite.email, college: oldInvite.college, invited_by: actorId, token_hash: hashToken(token),
      }).select('id,email,college,expires_at,status,created_at').single();
      if (insertError) throw insertError;

      const inviteUrl = getInviteUrl(req, token);
      const emailSent = await sendInviteEmail(oldInvite.email, inviteUrl);
      await writeFacultyAudit(null, actorId, 'invite_resent', { previousInvitationId: invitationId, invitationId: replacement.id, email: oldInvite.email });
      return res.json({ success: true, invitation: replacement, inviteUrl, emailSent });
    } catch (error: any) {
      console.error('[faculty] invitation resend failed:', error);
      return res.status(500).json({ error: error.message || 'Could not resend invitation.' });
    }
  });

  app.post('/api/auth/faculty/register', requireAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const userId = (req as any).authUserId as string;
      const clerkUser = await clerkClient.users.getUser(userId);
      const email = normalizeEmail(clerkUser.emailAddresses?.find((item: any) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress || '');
      if (!email || !facultyEmailAllowed(email)) return res.status(403).json({ error: 'Your Clerk account must use a valid email address.' });
      if (clerkUser.primaryEmailAddress?.verification?.status !== 'verified') return res.status(403).json({ error: 'Verify the invited email before submitting faculty access.' });

      const inviteToken = String(req.body?.inviteToken || '');
      const { data: invitation } = await supabaseAdmin.from('devcollective_faculty_invitations').select('*').eq('token_hash', hashToken(inviteToken)).eq('status', 'pending').gt('expires_at', new Date().toISOString()).maybeSingle();
      if (!invitation) return res.status(400).json({ error: 'This faculty invitation is invalid or expired.' });
      if (normalizeEmail(invitation.email) !== email) return res.status(403).json({ error: 'This invitation is assigned to a different email address.' });

      const required = ['name','employeeId','department','designation'];
      for (const field of required) if (!String(req.body?.[field] || '').trim()) return res.status(400).json({ error: 'Complete all required faculty profile fields.' });

      const { data: existing } = await supabaseAdmin.from('devcollective_faculty_profiles').select('clerk_user_id').eq('clerk_user_id', userId).maybeSingle();
      if (existing) return res.status(409).json({ error: 'Faculty profile already exists for this account.' });

      const { error: profileError } = await supabaseAdmin.from('devcollective_profiles').upsert({
        clerk_user_id: userId, name: String(req.body.name).trim().slice(0, 150), email, role: 'faculty',
        college: invitation.college || COLLEGE, branch: 'Faculty', academic_year: 'Faculty',
        avatar: clerkUser.imageUrl || '', bio: String(req.body.bio || '').trim().slice(0, 4000),
        auth_provider: 'clerk', has_completed_onboarding: true, account_status: 'pending',
      }, { onConflict: 'clerk_user_id' });
      if (profileError) throw profileError;

      const { error: facultyError } = await supabaseAdmin.from('devcollective_faculty_profiles').insert({
        clerk_user_id: userId, employee_id: String(req.body.employeeId).trim().slice(0, 100),
        department: String(req.body.department).trim().slice(0, 200), designation: String(req.body.designation).trim().slice(0, 200),
        phone: String(req.body.phone || '').trim().slice(0, 40),
        subjects: clampArray(req.body.subjects), expertise: clampArray(req.body.expertise),
        years_experience: Number.isFinite(Number(req.body.yearsExperience)) ? Math.max(0, Math.min(60, Number(req.body.yearsExperience))) : null,
        mentoring_areas: clampArray(req.body.mentoringAreas),
        bio: String(req.body.bio || '').trim().slice(0, 4000),
        approval_status: 'pending', availability_status: 'available', availability_note: '',
      });
      if (facultyError) throw facultyError;

      const { error: inviteError } = await supabaseAdmin.from('devcollective_faculty_invitations').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', invitation.id);
      if (inviteError) throw inviteError;

      await writeFacultyAudit(userId, userId, 'registration_submitted', { invitationId: invitation.id });
      return res.status(201).json({ success: true, message: 'Faculty registration submitted. Your account is pending admin approval.' });
    } catch (error: any) {
      console.error('[faculty] registration failed:', error);
      return res.status(500).json({ error: error.message || 'Could not submit faculty registration.' });
    }
  });

  app.get('/api/faculty/directory', requireAuth, async (_req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const { data: facultyRows, error: facultyError } = await supabaseAdmin.from('devcollective_faculty_profiles')
        .select('*').eq('approval_status', 'approved').order('department', { ascending: true }).order('designation', { ascending: true });
      if (facultyError) throw facultyError;
      const ids = (facultyRows || []).map((row: any) => row.clerk_user_id);
      if (!ids.length) return res.json({ profiles: [] });
      const { data: profiles, error: profileError } = await supabaseAdmin.from('devcollective_profiles')
        .select('clerk_user_id,name,email,college,avatar,bio,role,account_status').in('clerk_user_id', ids).eq('role', 'faculty').eq('account_status', 'active');
      if (profileError) throw profileError;
      const map = new Map((profiles || []).map((p: any) => [p.clerk_user_id, p]));
      return res.json({ profiles: (facultyRows || []).filter((f: any) => map.has(f.clerk_user_id)).map((f: any) => toFacultyDirectoryProfile(map.get(f.clerk_user_id), f)) });
    } catch (error: any) {
      console.error('[faculty] directory load failed:', error);
      return res.status(500).json({ error: error.message || 'Could not load faculty directory.' });
    }
  });

  app.get('/api/faculty/:clerkUserId', requireAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const requesterId = (req as any).authUserId as string;
      const clerkUserId = String(req.params.clerkUserId);
      const [{ data: profile, error: profileError }, { data: faculty, error: facultyError }] = await Promise.all([
        supabaseAdmin.from('devcollective_profiles').select('clerk_user_id,name,email,college,avatar,bio,role,account_status').eq('clerk_user_id', clerkUserId).maybeSingle(),
        supabaseAdmin.from('devcollective_faculty_profiles').select('*').eq('clerk_user_id', clerkUserId).maybeSingle(),
      ]);
      if (profileError) throw profileError;
      if (facultyError) throw facultyError;
      if (!profile || !faculty || profile.role !== 'faculty') return res.status(404).json({ error: 'Faculty profile not found.' });
      const isSelf = requesterId === clerkUserId;
      const isVisible = faculty.approval_status === 'approved' && profile.account_status === 'active';
      if (!isSelf && !isVisible) return res.status(404).json({ error: 'Faculty profile not found.' });
      return res.json({ profile: toFacultyDirectoryProfile(profile, faculty) });
    } catch (error: any) {
      console.error('[faculty] profile load failed:', error);
      return res.status(500).json({ error: error.message || 'Could not load faculty profile.' });
    }
  });

  app.put('/api/faculty/me', requireAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const userId = (req as any).authUserId as string;
      const { data: profile } = await supabaseAdmin.from('devcollective_profiles').select('role,account_status').eq('clerk_user_id', userId).maybeSingle();
      if (!profile || profile.role !== 'faculty' || profile.account_status !== 'active') return res.status(403).json({ error: 'Active faculty access required.' });
      const updates = {
        designation: String(req.body?.designation || '').trim().slice(0, 200),
        department: String(req.body?.department || '').trim().slice(0, 200),
        phone: String(req.body?.phone || '').trim().slice(0, 40),
        subjects: clampArray(req.body?.subjects),
        expertise: clampArray(req.body?.expertise),
        years_experience: req.body?.yearsExperience === '' || req.body?.yearsExperience == null ? null : Math.max(0, Math.min(60, Number(req.body.yearsExperience) || 0)),
        mentoring_areas: clampArray(req.body?.mentoringAreas),
        bio: String(req.body?.bio || '').trim().slice(0, 4000),
        availability_status: ['available','busy','offline'].includes(req.body?.availabilityStatus) ? req.body.availabilityStatus : 'available',
        availability_note: String(req.body?.availabilityNote || '').trim().slice(0, 240),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabaseAdmin.from('devcollective_faculty_profiles').update(updates).eq('clerk_user_id', userId).select('*').single();
      if (error) throw error;
      if (profile.account_status === 'active') await writeFacultyAudit(userId, userId, 'profile_updated', { availabilityStatus: updates.availability_status });
      return res.json({ success: true, faculty: data });
    } catch (error: any) {
      console.error('[faculty] profile update failed:', error);
      return res.status(500).json({ error: error.message || 'Could not update faculty profile.' });
    }
  });

  app.post('/api/faculty/:clerkUserId/mentoring-requests', requireAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const studentId = (req as any).authUserId as string;
      const facultyId = String(req.params.clerkUserId);
      const topic = String(req.body?.topic || '').trim().slice(0, 160);
      const message = String(req.body?.message || '').trim().slice(0, 2000);
      if (!topic || !message) return res.status(400).json({ error: 'Topic and message are required.' });
      if (facultyId === studentId) return res.status(400).json({ error: 'You cannot request mentoring from yourself.' });

      const [{ data: student }, { data: faculty }] = await Promise.all([
        supabaseAdmin.from('devcollective_profiles').select('role,account_status').eq('clerk_user_id', studentId).maybeSingle(),
        supabaseAdmin.from('devcollective_profiles').select('role,account_status').eq('clerk_user_id', facultyId).maybeSingle(),
      ]);
      if (!student || student.account_status !== 'active') return res.status(403).json({ error: 'Active account required.' });
      if (student.role === 'faculty') return res.status(403).json({ error: 'Faculty accounts cannot send student mentoring requests.' });
      if (!faculty || faculty.role !== 'faculty' || faculty.account_status !== 'active') return res.status(404).json({ error: 'Faculty member is not available.' });

      const { data: facultyRecord } = await supabaseAdmin.from('devcollective_faculty_profiles').select('approval_status').eq('clerk_user_id', facultyId).maybeSingle();
      if (!facultyRecord || facultyRecord.approval_status !== 'approved') return res.status(404).json({ error: 'Faculty member is not available.' });

      const { data: duplicate } = await supabaseAdmin.from('devcollective_faculty_mentoring_requests')
        .select('id,status').eq('faculty_clerk_user_id', facultyId).eq('student_clerk_user_id', studentId).eq('status', 'pending').maybeSingle();
      if (duplicate) return res.status(409).json({ error: 'You already have a pending mentoring request with this faculty member.' });

      const { data, error } = await supabaseAdmin.from('devcollective_faculty_mentoring_requests')
        .insert({ faculty_clerk_user_id: facultyId, student_clerk_user_id: studentId, topic, message }).select('*').single();
      if (error) throw error;
      await writeFacultyAudit(facultyId, studentId, 'mentoring_request_created', { requestId: data.id, topic });
      return res.status(201).json({ request: data });
    } catch (error: any) {
      console.error('[faculty] mentoring request failed:', error);
      return res.status(500).json({ error: error.message || 'Could not send mentoring request.' });
    }
  });

  app.get('/api/faculty/mentoring-requests', requireAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const userId = (req as any).authUserId as string;
      const mode = req.query.mode === 'sent' ? 'sent' : 'received';
      const column = mode === 'sent' ? 'student_clerk_user_id' : 'faculty_clerk_user_id';
      const { data: requests, error } = await supabaseAdmin.from('devcollective_faculty_mentoring_requests')
        .select('*').eq(column, userId).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      const ids = Array.from(new Set((requests || []).map((item: any) => mode === 'sent' ? item.faculty_clerk_user_id : item.student_clerk_user_id)));
      const { data: profiles } = ids.length ? await supabaseAdmin.from('devcollective_profiles').select('clerk_user_id,name,email,avatar,role,college,branch').in('clerk_user_id', ids) : { data: [] };
      const profileMap = new Map((profiles || []).map((profile: any) => [profile.clerk_user_id, profile]));
      return res.json({ requests: (requests || []).map((request: any) => ({ ...request, participant: profileMap.get(mode === 'sent' ? request.faculty_clerk_user_id : request.student_clerk_user_id) || null })) });
    } catch (error: any) {
      console.error('[faculty] mentoring requests load failed:', error);
      return res.status(500).json({ error: error.message || 'Could not load mentoring requests.' });
    }
  });

  app.post('/api/faculty/mentoring-requests/:requestId/decision', requireAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const facultyId = (req as any).authUserId as string;
      const decision = req.body?.decision === 'accept' ? 'accepted' : req.body?.decision === 'decline' ? 'declined' : '';
      if (!decision) return res.status(400).json({ error: 'Decision must be accept or decline.' });
      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin.from('devcollective_faculty_mentoring_requests')
        .update({ status: decision, updated_at: now, responded_at: now })
        .eq('id', String(req.params.requestId)).eq('faculty_clerk_user_id', facultyId).eq('status', 'pending').select('*').single();
      if (error || !data) return res.status(404).json({ error: 'Pending mentoring request not found.' });
      await writeFacultyAudit(facultyId, facultyId, decision === 'accepted' ? 'mentoring_request_accepted' : 'mentoring_request_declined', { requestId: data.id });
      return res.json({ request: data });
    } catch (error: any) {
      console.error('[faculty] mentoring decision failed:', error);
      return res.status(500).json({ error: error.message || 'Could not update mentoring request.' });
    }
  });

  app.post('/api/faculty/mentoring-requests/:requestId/cancel', requireAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const studentId = (req as any).authUserId as string;
      const { data, error } = await supabaseAdmin.from('devcollective_faculty_mentoring_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', String(req.params.requestId)).eq('student_clerk_user_id', studentId).eq('status', 'pending').select('*').single();
      if (error || !data) return res.status(404).json({ error: 'Pending mentoring request not found.' });
      await writeFacultyAudit(data.faculty_clerk_user_id, studentId, 'mentoring_request_cancelled', { requestId: data.id });
      return res.json({ request: data });
    } catch (error: any) {
      console.error('[faculty] mentoring cancellation failed:', error);
      return res.status(500).json({ error: error.message || 'Could not cancel mentoring request.' });
    }
  });

  app.get('/api/admin/faculty', requireAuth, requireAdmin, async (_req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase is not configured.' });
    const { data, error } = await supabaseAdmin.from('devcollective_faculty_profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('[faculty] load profiles failed:', error);
      return res.status(500).json({ error: error.message || 'Could not load faculty profiles.' });
    }
    const ids = (data || []).map((row: any) => row.clerk_user_id);
    const { data: profiles, error: profileError } = ids.length
      ? await supabaseAdmin.from('devcollective_profiles').select('clerk_user_id,name,email,college,avatar,role,account_status').in('clerk_user_id', ids)
      : { data: [], error: null };
    if (profileError) return res.status(500).json({ error: profileError.message || 'Could not load faculty identities.' });
    const profileMap = new Map((profiles || []).map((p: any) => [p.clerk_user_id, p]));
    return res.json({ profiles: (data || []).map((row: any) => ({ ...row, profile: profileMap.get(row.clerk_user_id) || null })) });
  });

  app.post('/api/admin/faculty/:clerkUserId/decision', requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const clerkUserId = String(req.params.clerkUserId);
      const actorId = (req as any).authUserId as string;
      const requested = String(req.body?.decision || '');
      const now = new Date().toISOString();
      let facultyStatus = '';
      let accountStatus = '';
      if (requested === 'approve') { facultyStatus = 'approved'; accountStatus = 'active'; }
      else if (requested === 'reject') { facultyStatus = 'rejected'; accountStatus = 'suspended'; }
      else if (requested === 'suspend') { facultyStatus = 'suspended'; accountStatus = 'suspended'; }
      else if (requested === 'reinstate') { facultyStatus = 'approved'; accountStatus = 'active'; }
      else return res.status(400).json({ error: 'Decision must be approve, reject, suspend, or reinstate.' });

      const { data: current } = await supabaseAdmin.from('devcollective_faculty_profiles').select('approval_status').eq('clerk_user_id', clerkUserId).maybeSingle();
      if (!current) return res.status(404).json({ error: 'Faculty profile not found.' });

      const allowed = requested === 'approve' ? ['pending'] : requested === 'reject' ? ['pending'] : requested === 'suspend' ? ['approved'] : ['suspended'];
      if (!allowed.includes(current.approval_status)) return res.status(409).json({ error: 'Faculty profile is not in a state that supports this action.' });

      const { data: faculty, error: profileError } = await supabaseAdmin.from('devcollective_faculty_profiles')
        .update({ approval_status: facultyStatus, approved_by: actorId, approved_at: now, updated_at: now }).eq('clerk_user_id', clerkUserId).select('*').single();
      if (profileError) throw profileError;
      const { error: accountError } = await supabaseAdmin.from('devcollective_profiles').update({ account_status: accountStatus }).eq('clerk_user_id', clerkUserId);
      if (accountError) throw accountError;
      await writeFacultyAudit(clerkUserId, actorId, requested, { from: current.approval_status, to: facultyStatus });
      return res.json({ success: true, decision: requested, profile: faculty });
    } catch (error: any) {
      console.error('[faculty] approval failed:', error);
      return res.status(500).json({ error: error.message || 'Could not update faculty approval.' });
    }
  });

  app.get('/api/admin/faculty-audit/:clerkUserId', requireAuth, requireAdmin, async (req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase is not configured.' });
    const { data, error } = await supabaseAdmin.from('devcollective_faculty_audit_log').select('*').eq('faculty_clerk_user_id', String(req.params.clerkUserId)).order('created_at', { ascending: false }).limit(100);
    if (error) return res.status(500).json({ error: error.message || 'Could not load faculty audit history.' });
    return res.json({ events: data || [] });
  });
}


function getInviteUrl(req: Request, token: string) {
  const base = process.env.APP_URL || 'http://' + (req.headers.host || 'localhost:3000');
  return base.replace(/\/$/, '') + '/?faculty-register=1&invite=' + encodeURIComponent(token);
}
