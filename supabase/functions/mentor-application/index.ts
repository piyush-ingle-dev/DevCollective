const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_LENGTH = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

const json = (status: number, body: Record<string, unknown>, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });

const clean = (value: FormDataEntryValue | null, max = MAX_TEXT_LENGTH) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const getClientIp = (request: Request) =>
  request.headers.get('cf-connecting-ip') ||
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('x-real-ip') ||
  'unknown';

const allowedOrigins = () =>
  (Deno.env.get('MENTOR_ALLOWED_ORIGINS') || 'http://localhost:3000,https://devcollective-app.onrender.com')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const withinRateLimit = (key: string) => {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (current.count >= 3) return false;
  current.count += 1;
  return true;
};

const fileToBase64 = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
};

type BrevoEmailPayload = {
  sender: { email: string; name?: string };
  to: Array<{ email: string; name?: string }>;
  replyTo?: { email: string };
  subject: string;
  htmlContent: string;
  attachment?: Array<{ name: string; content: string }>;
};

const sendBrevoEmail = async (apiKey: string, payload: BrevoEmailPayload) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body?.message === 'string' ? body.message : `Email provider returned ${response.status}.`;
    throw new Error(message);
  }
  return body;
};

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  const allowed = allowedOrigins();

  if (request.method === 'OPTIONS') {
    if (origin && !allowed.includes(origin)) return new Response('Forbidden', { status: 403 });
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' }, origin);
  if (origin && !allowed.includes(origin)) return json(403, { error: 'This origin is not allowed.' }, origin);

  const apiKeyHeader = request.headers.get('apikey');
  const expectedPublishableKey = Deno.env.get('MENTOR_EXPECTED_PUBLISHABLE_KEY');
  if (expectedPublishableKey && apiKeyHeader !== expectedPublishableKey) {
    return json(401, { error: 'Application service authorization failed.' }, origin);
  }

  const ip = getClientIp(request);
  if (!withinRateLimit(ip)) {
    return json(429, { error: 'Too many applications from this network. Please try again later.' }, origin);
  }

  const form = await request.formData().catch(() => null);
  if (!form) return json(400, { error: 'Please submit the application form again.' }, origin);

  const name = clean(form.get('name'), 150);
  const email = clean(form.get('email'), 320).toLowerCase();
  const college = clean(form.get('college'), 250);
  const branch = clean(form.get('branch'), 150);
  const skills = clean(form.get('skills'));
  const experience = clean(form.get('experience'));
  const message = clean(form.get('message'));
  const resume = form.get('resume');

  if (!name || !email || !college || !branch || !skills || !experience || !message) {
    return json(400, { error: 'Every mentor application field is required.' }, origin);
  }
  if (!EMAIL_RE.test(email)) return json(400, { error: 'Please provide a valid email address.' }, origin);
  if (!(resume instanceof File)) return json(400, { error: 'A PDF resume is required.' }, origin);
  if (resume.size <= 0 || resume.size > MAX_RESUME_BYTES) return json(400, { error: 'Resume must be a non-empty PDF under 5 MB.' }, origin);

  const isPdf = resume.type === 'application/pdf' || resume.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return json(400, { error: 'Resume must be a PDF file.' }, origin);

  const brevoApiKey = Deno.env.get('BREVO_API_KEY');
  const recipient = Deno.env.get('MENTOR_APPLICATION_EMAIL');
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL');
  const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'DevCollective';
  if (!brevoApiKey || !recipient || !senderEmail) {
    console.error('[mentor-application] Brevo email service is not configured.');
    return json(503, { error: 'Mentor applications are temporarily unavailable. Please try again later.' }, origin);
  }

  try {
    const resumeBase64 = await fileToBase64(resume);
    const subject = `Mentor Application — ${name}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#171717">
        <h1 style="margin-bottom:4px">New DevCollective Mentor Application</h1>
        <p style="color:#666;margin-top:0">Submitted through the DevCollective registration gate.</p>
        <hr />
        <h2>Applicant</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>College:</strong> ${escapeHtml(college)}</p>
        <p><strong>Branch:</strong> ${escapeHtml(branch)}</p>
        <h2>Skills</h2>
        <p>${escapeHtml(skills).replaceAll('\n', '<br />')}</p>
        <h2>Mentoring / Technical Experience</h2>
        <p>${escapeHtml(experience).replaceAll('\n', '<br />')}</p>
        <h2>Why they want to mentor</h2>
        <p>${escapeHtml(message).replaceAll('\n', '<br />')}</p>
        <hr />
        <p><strong>Resume:</strong> ${escapeHtml(resume.name)}</p>
      </div>
    `;

    await sendBrevoEmail(brevoApiKey, {
      sender: { email: senderEmail, name: senderName },
      to: [{ email: recipient }],
      replyTo: { email },
      subject,
      htmlContent: html,
      attachment: [{ name: resume.name, content: resumeBase64 }],
    });

    try {
      await sendBrevoEmail(brevoApiKey, {
        sender: { email: senderEmail, name: senderName },
        to: [{ email }],
        subject: 'DevCollective Mentor Application Received',
        htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#171717"><h1>Application received.</h1><p>Hi ${escapeHtml(name)},</p><p>Your DevCollective mentor application was received successfully. The developer team will review your profile and contact you about the next step.</p><p>Thank you for your interest in helping other developers grow.</p><p>— DevCollective</p></div>`,
      });
    } catch (confirmationError) {
      console.error('[mentor-application] Applicant confirmation email failed:', confirmationError);
    }

    return json(200, { success: true }, origin);
  } catch (error) {
    console.error('[mentor-application] Submission failed:', error);
    return json(502, { error: 'We could not send your application right now. Please try again shortly.' }, origin);
  }
});
