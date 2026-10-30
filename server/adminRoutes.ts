import type { Express, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { clerkClient } from '@clerk/express';
import { supabaseAdmin } from './supabase';

const COLLEGE_EMAIL_DOMAIN = (process.env.COLLEGE_EMAIL_DOMAIN || 'ghrietn.raisoni.net').toLowerCase();
const COLLEGE_EMAIL_PATTERN = new RegExp(`^[a-z0-9]+(?:[._-][a-z0-9]+)+\\.cse@${COLLEGE_EMAIL_DOMAIN.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i');
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || 'raat131221@gmail.com,kanojiyapk524@gmail.com')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const RESUME_BUCKET = 'mentor-resumes';
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')),
});

const emailFromClerkUser = (user: any) =>
  user?.emailAddresses?.find((email: any) => email.id === user.primaryEmailAddressId)?.emailAddress ||
  user?.emailAddresses?.[0]?.emailAddress ||
  '';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const isCollegeEmail = (email: string) => COLLEGE_EMAIL_PATTERN.test(normalizeEmail(email));
export const isOfficialCollegeEmail = (email: string) => normalizeEmail(email).endsWith('@' + COLLEGE_EMAIL_DOMAIN);
export const isAdminEmail = (email: string) => ADMIN_EMAILS.has(normalizeEmail(email));
export const isAllowedPlatformEmail = (email: string) => isCollegeEmail(email) || isOfficialCollegeEmail(email) || isAdminEmail(email);

const getClerkUser = async (userId: string) => clerkClient.users.getUser(userId);

export async function getPlatformIdentity(userId: string) {
  const clerkUser = await getClerkUser(userId);
  const email = normalizeEmail(emailFromClerkUser(clerkUser));
  return { clerkUser, email, isCollege: isCollegeEmail(email), isAdmin: isAdminEmail(email) };
}

export const requirePlatformAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authUserId = (req as any).authUserId as string | undefined;
  if (!authUserId) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const identity = await getPlatformIdentity(authUserId);
    if (!isAllowedPlatformEmail(identity.email)) {
      const { data: facultyProfile, error: facultyLookupError } = await supabaseAdmin
        .from('devcollective_profiles')
        .select('role,account_status')
        .eq('clerk_user_id', authUserId)
        .maybeSingle();
      if (facultyLookupError) throw facultyLookupError;
      const isActiveFaculty = facultyProfile?.role === 'faculty' && facultyProfile?.account_status === 'active';
      if (!isActiveFaculty) {
        return res.status(403).json({ error: `Use your official college email in the format firstname.surname.cse@${COLLEGE_EMAIL_DOMAIN}.` });
      }
    }
    (req as any).platformIdentity = identity;
    return next();
  } catch (error: any) {
    console.error('[access-control] identity lookup failed:', error);
    return res.status(503).json({ error: 'Could not verify account identity right now.' });
  }
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const authUserId = (req as any).authUserId as string | undefined;
  if (!authUserId) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const identity = await getPlatformIdentity(authUserId);
    if (!identity.isAdmin) return res.status(403).json({ error: 'Administrator access is required.' });
    (req as any).platformIdentity = identity;
    return next();
  } catch (error: any) {
    console.error('[admin] identity lookup failed:', error);
    return res.status(503).json({ error: 'Could not verify administrator access right now.' });
  }
};

async function ensureResumeBucket() {
  if (!supabaseAdmin) throw new Error('Supabase is not configured.');
  const { error } = await supabaseAdmin.storage.createBucket(RESUME_BUCKET, { public: false, fileSizeLimit: `${MAX_RESUME_BYTES}` });
  if (error && !/already exists|duplicate/i.test(error.message || '')) throw error;
}

async function sendBrevoEmail(payload: Record<string, unknown>) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'DevCollective';
  if (!apiKey || !senderEmail) return;
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender: { email: senderEmail, name: senderName }, ...payload }),
  });
  if (!response.ok) console.error('[admin] Brevo notification failed:', response.status, await response.text());
}

export function registerAdminRoutes(app: Express, requireAuth: (req: Request, res: Response, next: NextFunction) => void) {
  app.get('/api/access/me', requireAuth, requirePlatformAuth, async (req, res) => {
    const identity = (req as any).platformIdentity;
    return res.json({ allowed: true, isCollege: identity.isCollege, isAdmin: identity.isAdmin, email: identity.email, collegeDomain: COLLEGE_EMAIL_DOMAIN });
  });

  app.post('/api/mentor/applications', requireAuth, requirePlatformAuth, upload.single('resume'), async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const identity = (req as any).platformIdentity;
      if (!identity.isCollege) return res.status(403).json({ error: `Mentor applications require your official college email ending in @${COLLEGE_EMAIL_DOMAIN}.` });
      if (req.file && req.file.mimetype !== 'application/pdf' && !req.file.originalname.toLowerCase().endsWith('.pdf')) return res.status(400).json({ error: 'Resume must be a PDF.' });
      if (!req.file) return res.status(400).json({ error: 'A PDF resume is required.' });

      const userId = (req as any).authUserId as string;
      const contactEmail = normalizeEmail(String(req.body?.email || identity.email));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return res.status(400).json({ error: 'Please provide a valid contact email.' });

      const fields = {
        applicant_clerk_user_id: userId,
        applicant_email: contactEmail,
        applicant_name: String(req.body?.name || '').trim().slice(0, 150),
        college: String(req.body?.college || '').trim().slice(0, 250),
        branch: String(req.body?.branch || '').trim().slice(0, 150),
        skills: String(req.body?.skills || '').trim().slice(0, 5000),
        experience: String(req.body?.experience || '').trim().slice(0, 5000),
        motivation: String(req.body?.message || '').trim().slice(0, 5000),
        resume_file_name: req.file.originalname.slice(0, 255),
      };
      if (Object.values(fields).some((value) => !value)) return res.status(400).json({ error: 'Every mentor application field is required.' });

      const { data: existing } = await supabaseAdmin.from('devcollective_mentor_applications').select('id,status').eq('applicant_clerk_user_id', userId).eq('status', 'pending').maybeSingle();
      if (existing) return res.status(409).json({ error: 'You already have a mentor application under review.' });

      await ensureResumeBucket();
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${userId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabaseAdmin.storage.from(RESUME_BUCKET).upload(storagePath, req.file.buffer, { contentType: 'application/pdf', upsert: false });
      if (uploadError) throw uploadError;

      const { data: application, error } = await supabaseAdmin.from('devcollective_mentor_applications').insert({ ...fields, resume_storage_path: storagePath }).select('id,applicant_email,applicant_name,college,branch,skills,experience,motivation,resume_file_name,status,created_at').single();
      if (error) throw error;

      const html = `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#171717"><h1>New DevCollective Mentor Application</h1><p><strong>Name:</strong> ${fields.applicant_name}</p><p><strong>Contact Email:</strong> ${fields.applicant_email}</p><p><strong>Verified College Account:</strong> ${identity.email}</p><p><strong>College:</strong> ${fields.college}</p><p><strong>Branch:</strong> ${fields.branch}</p><h2>Skills</h2><p>${fields.skills}</p><h2>Experience</h2><p>${fields.experience}</p><h2>Motivation</h2><p>${fields.motivation}</p><p><strong>Resume:</strong> ${fields.resume_file_name}</p></div>`;
      const bytes = req.file.buffer.toString('base64');
      await sendBrevoEmail({ to: [{ email: process.env.MENTOR_APPLICATION_EMAIL || 'devcollective0@gmail.com' }], replyTo: { email: contactEmail }, subject: `Mentor Application — ${fields.applicant_name}`, htmlContent: html, attachment: [{ name: fields.resume_file_name, content: bytes }] });
      await sendBrevoEmail({ to: [{ email: contactEmail }], subject: 'DevCollective Mentor Application Received', htmlContent: `<div style="font-family:Arial,sans-serif"><h1>Application received.</h1><p>Hi ${fields.applicant_name},</p><p>Your DevCollective mentor application is now under review. The developer/admin team will contact you after verification.</p><p>— DevCollective</p></div>` });
      return res.status(201).json({ success: true, application });
    } catch (error: any) {
      console.error('[mentor] application submission failed:', error);
      return res.status(500).json({ error: 'We could not submit your mentor application right now. Please try again.' });
    }
  });

  app.get('/api/admin/me', requireAuth, requireAdmin, async (req, res) => {
    const identity = (req as any).platformIdentity;
    return res.json({ isAdmin: true, email: identity.email, role: 'admin' });
  });

  app.get('/api/admin/overview', requireAuth, requireAdmin, async (_req, res) => {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase is not configured.' });
    const count = async (table: string, filter?: (query: any) => any) => {
      let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
      if (filter) query = filter(query);
      const result = await query;
      if (result.error) throw result.error;
      return result.count || 0;
    };
    try {
      const [students, mentors, faculty, admins, posts, pending, reports, live] = await Promise.all([
        count('devcollective_profiles', (q) => q.eq('role', 'student')),
        count('devcollective_profiles', (q) => q.eq('role', 'mentor')),
        count('devcollective_profiles', (q) => q.eq('role', 'faculty')),
        count('devcollective_profiles', (q) => q.eq('role', 'admin')),
        count('devcollective_posts'),
        count('devcollective_mentor_applications', (q) => q.eq('status', 'pending')),
        count('devcollective_user_reports'),
        count('devcollective_user_presence'),
      ]);
      return res.json({ students, mentors, faculty, admins, posts, pendingApplications: pending, reports, liveUsers: live });
    } catch (error: any) {
      console.error('[admin] overview failed:', error);
      return res.status(500).json({ error: 'Could not load admin overview.' });
    }
  });

  app.get('/api/admin/applications', requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const status = ['pending', 'approved', 'rejected'].includes(String(req.query.status)) ? String(req.query.status) : 'pending';
      const { data, error } = await supabaseAdmin.from('devcollective_mentor_applications').select('*').eq('status', status).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return res.json({ applications: data || [] });
    } catch (error: any) {
      console.error('[admin] applications failed:', error);
      return res.status(500).json({ error: 'Could not load mentor applications.' });
    }
  });

  app.get('/api/admin/applications/:id/resume', requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const { data: application, error } = await supabaseAdmin.from('devcollective_mentor_applications').select('resume_storage_path,resume_file_name').eq('id', req.params.id).single();
      if (error || !application?.resume_storage_path) return res.status(404).json({ error: 'Resume not found.' });
      const { data: signed, error: signedError } = await supabaseAdmin.storage.from(RESUME_BUCKET).createSignedUrl(application.resume_storage_path, 10 * 60);
      if (signedError || !signed?.signedUrl) return res.status(500).json({ error: 'Could not create resume access link.' });
      return res.json({ url: signed.signedUrl, fileName: application.resume_file_name });
    } catch (error: any) {
      console.error('[admin] resume link failed:', error);
      return res.status(500).json({ error: 'Could not access the resume.' });
    }
  });

  app.post('/api/admin/applications/:id/review', requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase is not configured.');
      const action = req.body?.action === 'approve' ? 'approved' : req.body?.action === 'reject' ? 'rejected' : '';
      if (!action) return res.status(400).json({ error: 'Review action must be approve or reject.' });
      const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 2000) : null;
      const reviewerId = (req as any).authUserId as string;
      const { data: application, error: applicationError } = await supabaseAdmin.from('devcollective_mentor_applications').select('*').eq('id', req.params.id).single();
      if (applicationError || !application) return res.status(404).json({ error: 'Mentor application not found.' });
      if (application.status !== 'pending') return res.status(409).json({ error: 'This application has already been reviewed.' });

      const reviewedAt = new Date().toISOString();
      const { error: updateError } = await supabaseAdmin.from('devcollective_mentor_applications').update({ status: action, review_note: note, reviewed_by: reviewerId, reviewed_at: reviewedAt }).eq('id', application.id);
      if (updateError) throw updateError;

      if (action === 'approved') {
        const { error: profileError } = await supabaseAdmin.from('devcollective_profiles').update({ role: 'mentor', mentor_verified_at: reviewedAt }).eq('clerk_user_id', application.applicant_clerk_user_id);
        if (profileError) throw profileError;
      }

      const subject = action === 'approved' ? 'DevCollective Mentor Application Approved' : 'DevCollective Mentor Application Update';
      const safeName = String(application.applicant_name || 'Developer');
      const safeNote = note ? note.replaceAll('<', '&lt;').replaceAll('>', '&gt;') : '';
      const html = action === 'approved'
        ? `<div style="font-family:Arial,sans-serif"><h1>Mentor access approved.</h1><p>Hi ${safeName},</p><p>Your DevCollective mentor application has been approved. Your account now has mentor access.</p><p>${safeNote}</p><p>— DevCollective</p></div>`
        : `<div style="font-family:Arial,sans-serif"><h1>Mentor application update.</h1><p>Hi ${safeName},</p><p>Your DevCollective mentor application was not approved at this time.</p><p>${safeNote}</p><p>You can continue using your student account and apply again when eligible.</p><p>— DevCollective</p></div>`;
      await sendBrevoEmail({ to: [{ email: application.applicant_email }], subject, htmlContent: html });
      return res.json({ success: true, status: action });
    } catch (error: any) {
      console.error('[admin] application review failed:', error);
      return res.status(500).json({ error: 'Could not review mentor application.' });
    }
  });
}
