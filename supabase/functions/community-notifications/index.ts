import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getClerkUserId(req: Request): Promise<string> {
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Not authenticated.");

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid authentication token.");
  const decoded = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  const issuer = String(decoded.iss || "").replace(/\/$/, "");
  if (!issuer || !issuer.startsWith("https://")) throw new Error("Invalid authentication token.");

  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  const verified = await jwtVerify(token, jwks, { issuer });
  const userId = String(verified.payload.sub || "");
  if (!userId) throw new Error("Invalid authentication token.");
  return userId;
}

async function actorMap(ids: string[]) {
  if (!ids.length) return new Map();
  const { data, error } = await supabase
    .from("devcollective_profiles")
    .select("clerk_user_id,name,avatar")
    .in("clerk_user_id", ids);
  if (error) throw error;
  return new Map((data || []).map((profile) => [profile.clerk_user_id, profile]));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const userId = await getClerkUserId(req);
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "list";

    if (req.method === "GET" && mode === "list") {
      const { data: rows, error } = await supabase
        .from("devcollective_notifications")
        .select("id,actor_clerk_user_id,type,post_id,comment_id,created_at,read_at")
        .eq("recipient_clerk_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;

      const actorIds = [...new Set((rows || []).map((row) => row.actor_clerk_user_id))];
      const actors = await actorMap(actorIds);
      const postIds = [...new Set((rows || []).map((row) => row.post_id).filter(Boolean))];
      const commentIds = [...new Set((rows || []).map((row) => row.comment_id).filter(Boolean))];
      const postMap = new Map<string, { title: string | null }>();
      const commentMap = new Map<string, { content: string }>();

      if (postIds.length) {
        const { data, error: postError } = await supabase
          .from("devcollective_posts")
          .select("id,title")
          .in("id", postIds as string[]);
        if (postError) throw postError;
        for (const post of data || []) postMap.set(post.id, post);
      }
      if (commentIds.length) {
        const { data, error: commentError } = await supabase
          .from("devcollective_post_comments")
          .select("id,content")
          .in("id", commentIds as string[]);
        if (commentError) throw commentError;
        for (const comment of data || []) commentMap.set(comment.id, comment);
      }

      const notifications = (rows || []).map((row) => {
        const actor = actors.get(row.actor_clerk_user_id);
        const post = row.post_id ? postMap.get(row.post_id) : undefined;
        const comment = row.comment_id ? commentMap.get(row.comment_id) : undefined;
        return {
          id: row.id,
          type: row.type,
          actorName: actor?.name || "Developer",
          actorAvatar: actor?.avatar || "",
          postId: row.post_id,
          commentId: row.comment_id,
          postTitle: post?.title || "your post",
          commentPreview: comment?.content || "your comment",
          createdAt: row.created_at,
          readAt: row.read_at,
        };
      });

      return json({
        notifications,
        unreadCount: notifications.filter((item) => !item.readAt).length,
      });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const action = String(body.action || "");

      if (action === "mark-read") {
        const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string") : [];
        if (ids.length) {
          const { error } = await supabase
            .from("devcollective_notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("recipient_clerk_user_id", userId)
            .in("id", ids);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("devcollective_notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("recipient_clerk_user_id", userId)
            .is("read_at", null);
          if (error) throw error;
        }
        return json({ success: true });
      }

      if (action === "toggle-comment-like") {
        const commentId = String(body.commentId || "");
        if (!commentId) return json({ error: "commentId is required." }, 400);
        const { data: existing, error: lookupError } = await supabase
          .from("devcollective_post_comment_likes")
          .select("comment_id")
          .eq("comment_id", commentId)
          .eq("user_clerk_user_id", userId)
          .maybeSingle();
        if (lookupError) throw lookupError;

        if (existing) {
          const { error } = await supabase
            .from("devcollective_post_comment_likes")
            .delete()
            .eq("comment_id", commentId)
            .eq("user_clerk_user_id", userId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("devcollective_post_comment_likes")
            .insert({ comment_id: commentId, user_clerk_user_id: userId });
          if (error) throw error;
        }

        const { count, error: countError } = await supabase
          .from("devcollective_post_comment_likes")
          .select("comment_id", { count: "exact", head: true })
          .eq("comment_id", commentId);
        if (countError) throw countError;
        return json({ success: true, likedByMe: !existing, likes: count || 0 });
      }

      return json({ error: "Unknown action." }, 400);
    }

    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    console.error("community-notifications error", error);
    const message = error instanceof Error ? error.message : "Could not process notifications.";
    const status = message.includes("Not authenticated") || message.includes("Invalid authentication") ? 401 : 500;
    return json({ error: message }, status);
  }
});
