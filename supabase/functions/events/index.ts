import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const clerkIssuer = String(Deno.env.get("CLERK_ISSUER_URL") || "").replace(/\/$/, "");
const clerkAuthorizedParties = String(Deno.env.get("EVENTS_CLERK_AUTHORIZED_PARTIES") || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const clerkJwks = clerkIssuer ? createRemoteJWKSet(new URL(`${clerkIssuer}/.well-known/jwks.json`)) : null;

async function userId(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Not authenticated.");
  if (!clerkJwks || !clerkIssuer) throw new Error("Events authentication is not configured.");

  const { payload } = await jwtVerify(token, clerkJwks, {
    issuer: clerkIssuer,
    algorithms: ["RS256"],
  });

  if (clerkAuthorizedParties.length) {
    const azp = String(payload.azp || "");
    if (!clerkAuthorizedParties.includes(azp)) throw new Error("Invalid authentication token.");
  }

  const id = String(payload.sub || "");
  if (!id) throw new Error("Invalid authentication token.");
  return id;
}

async function admin(req: Request) {
  const id = await userId(req);
  const { data, error } = await supabase.from("devcollective_profiles").select("role").eq("clerk_user_id", id).maybeSingle();
  if (error) throw error;
  if (data?.role !== "admin") throw new Error("Administrator access is required.");
  return id;
}

const map = (r: any) => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  subtitle: r.subtitle,
  description: r.description,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  venue: r.venue,
  city: r.city,
  organizer: r.organizer,
  registrationUrl: r.registration_url,
  sourceUrl: r.source_url,
  ticketInfo: r.ticket_info,
  theme: r.theme,
  speakers: Array.isArray(r.speakers) ? r.speakers : [],
  coordinators: Array.isArray(r.coordinators) ? r.coordinators : [],
  contactInfo: r.contact_info,
  details: r.details && typeof r.details === "object" ? r.details : {},
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const slug = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
      const { data, error } = await supabase.from("devcollective_events").select("*").order("starts_at", { ascending: true });
      if (error) throw error;
      return json({ events: (data || []).map(map) });
    }

    await admin(req);

    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "Event id is required." }, 400);
      const { error } = await supabase.from("devcollective_events").delete().eq("id", id);
      if (error) throw error;
      return json({ success: true });
    }

    const body = await req.json().catch(() => ({}));
    for (const key of ["title", "subtitle", "description", "startsAt", "endsAt", "venue", "city", "organizer"]) {
      if (!String(body[key] || "").trim()) return json({ error: `${key} is required.` }, 400);
    }

    const start = new Date(body.startsAt);
    const end = new Date(body.endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return json({ error: "Event dates are invalid." }, 400);

    const t = body.theme && typeof body.theme === "object" ? body.theme : {};
    const details = body.details && typeof body.details === "object" ? body.details : {};
    const payload = {
      slug: String(body.slug || slug(body.title)).slice(0, 100),
      title: String(body.title).trim().slice(0, 160),
      subtitle: String(body.subtitle).trim().slice(0, 160),
      description: String(body.description).trim().slice(0, 5000),
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      venue: String(body.venue).trim().slice(0, 250),
      city: String(body.city).trim().slice(0, 120),
      organizer: String(body.organizer).trim().slice(0, 160),
      registration_url: body.registrationUrl ? String(body.registrationUrl).trim().slice(0, 1000) : null,
      source_url: body.sourceUrl ? String(body.sourceUrl).trim().slice(0, 1000) : null,
      ticket_info: body.ticketInfo ? String(body.ticketInfo).trim().slice(0, 500) : null,
      theme: {
        background: String(t.background || "#050505"),
        foreground: String(t.foreground || "#FFFFFF"),
        primary: String(t.primary || "#E50914"),
        secondary: String(t.secondary || "#171717"),
        accent: String(t.accent || "#FF1A1A"),
      },
      speakers: Array.isArray(body.speakers) ? body.speakers.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 30) : [],
      coordinators: Array.isArray(body.coordinators) ? body.coordinators.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 30) : [],
      contact_info: body.contactInfo ? String(body.contactInfo).trim().slice(0, 1000) : null,
      details,
      updated_at: new Date().toISOString(),
    };

    if (req.method === "POST") {
      const { data, error } = await supabase.from("devcollective_events").insert(payload).select("*").single();
      if (error) throw error;
      return json({ event: map(data) }, 201);
    }

    if (req.method === "PUT") {
      const id = String(body.id || "");
      if (!id) return json({ error: "Event id is required." }, 400);
      const { data, error } = await supabase.from("devcollective_events").update(payload).eq("id", id).select("*").single();
      if (error) throw error;
      return json({ event: map(data) });
    }

    return json({ error: "Method not allowed." }, 405);
  } catch (error: any) {
    const message = String(error?.message || "Event service failed.");
    return json(
      { error: message },
      /not authenticated|invalid authentication/i.test(message)
        ? 401
        : /administrator access/i.test(message)
          ? 403
          : /authentication is not configured/i.test(message)
            ? 503
            : 500,
    );
  }
});
