import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TOKEN_TTL_MS = 10 * 60 * 1000;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

async function getClerkUserId(req: Request): Promise<string> {
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Not authenticated.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid authentication token.");
  const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  const issuer = String(payload.iss || "").replace(/\/$/, "");
  if (!issuer || !issuer.startsWith("https://")) throw new Error("Invalid authentication token.");
  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  const verified = await jwtVerify(token, jwks, { issuer });
  const userId = String(verified.payload.sub || "");
  if (!userId) throw new Error("Invalid authentication token.");
  return userId;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function randomToken(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "prepare") {
      const userId = await getClerkUserId(req);
      await supabase.from("devcollective_account_deletion_tokens").delete().eq("clerk_user_id", userId);
      const token = await randomToken();
      const tokenHash = await sha256(token);
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
      const { error } = await supabase.from("devcollective_account_deletion_tokens").insert({
        clerk_user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });
      if (error) throw error;
      return json({ token, expiresAt });
    }

    if (action === "cleanup") {
      const token = typeof body.token === "string" ? body.token.trim() : "";
      if (!/^[a-f0-9]{64}$/i.test(token)) return json({ error: "Invalid deletion token." }, 400);
      const tokenHash = await sha256(token);
      const now = new Date().toISOString();
      const { data: tokenRow, error: lookupError } = await supabase
        .from("devcollective_account_deletion_tokens")
        .select("id,clerk_user_id")
        .eq("token_hash", tokenHash)
        .is("consumed_at", null)
        .gt("expires_at", now)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!tokenRow) return json({ error: "Deletion token is invalid or expired." }, 401);

      const { data: consumed, error: consumeError } = await supabase
        .from("devcollective_account_deletion_tokens")
        .update({ consumed_at: now })
        .eq("id", tokenRow.id)
        .is("consumed_at", null)
        .select("id")
        .maybeSingle();
      if (consumeError) throw consumeError;
      if (!consumed) return json({ error: "Deletion token is invalid or already used." }, 401);

      const { error: deleteError } = await supabase
        .from("devcollective_profiles")
        .delete()
        .eq("clerk_user_id", tokenRow.clerk_user_id);
      if (deleteError) throw deleteError;

      return json({ success: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("account-deletion error", error);
    const message = error instanceof Error ? error.message : "Could not process account deletion.";
    const status = message.includes("Not authenticated") || message.includes("Invalid authentication") ? 401 : 500;
    return json({ error: message }, status);
  }
});