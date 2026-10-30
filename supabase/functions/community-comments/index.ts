import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const COMMENT_REP_REWARD = 5;
const RESEND_API_URL = "https://api.resend.com/emails";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function base64UrlToString(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
}

async function getClerkUserId(req: Request): Promise<string> {
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Not authenticated.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid authentication token.");
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(base64UrlToString(parts[1]));
  } catch {
    throw new Error("Invalid authentication token.");
  }
  const issuer = String(payload.iss || "").replace(/\/$/, "");
  if (!issuer || !issuer.startsWith("https://")) throw new Error("Invalid authentication token.");
  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  const verified = await jwtVerify(token, jwks, { issuer });
  const userId = String(verified.payload.sub || "");
  if (!userId) throw new Error("Invalid authentication token.");
  return userId;
}

async function adjustRep(userId: string, delta: number) {
  const { data: profile, error: profileError } = await supabase
    .from("devcollective_profiles")
    .select("rep")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return 0;
  const nextRep = Math.max(0, Number(profile.rep) + delta);
  const { error: updateError } = await supabase
    .from("devcollective_profiles")
    .update({ rep: nextRep, level: Math.max(1, Math.floor(nextRep / 150) + 1) })
    .eq("clerk_user_id", userId);
  if (updateError) throw updateError;
  return nextRep;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendReplyEmail(params: {
  recipientEmail: string;
  recipientName: string;
  actorName: string;
  postTitle: string;
  replyText: string;
  postId: string;
  commentId: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
  if (!apiKey) {
    console.warn("Reply email skipped: RESEND_API_KEY is not configured.");
    return { sent: false, skipped: true };
  }

  const appUrl = String(Deno.env.get("APP_URL") || "").replace(/\/$/, "");
  const discussionUrl = appUrl ? `${appUrl}/?communityPost=${encodeURIComponent(params.postId)}&comment=${encodeURIComponent(params.commentId)}` : "";
  const safeRecipientName = escapeHtml(params.recipientName || "Developer");
  const safeActorName = escapeHtml(params.actorName || "A developer");
  const safePostTitle = escapeHtml(params.postTitle || "your discussion");
  const safeReply = escapeHtml(params.replyText).replace(/\n/g, "<br />");

  const html = `
    <div style="margin:0;background:#fff9f0;padding:32px;font-family:Inter,Arial,sans-serif;color:#171717;">
      <div style="max-width:640px;margin:0 auto;border:2px solid #171717;background:#fffdf8;box-shadow:6px 6px 0 #171717;">
        <div style="height:8px;background:#9fc5ff;"></div>
        <div style="padding:28px;">
          <div style="font-family:monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6b6b6b;">DEVCOLLECTIVE / COMMUNITY</div>
          <h1 style="font-size:30px;line-height:1.05;margin:8px 0 16px;">Someone replied to your comment.</h1>
          <p style="font-size:15px;line-height:1.6;margin:0 0 18px;">Hey ${safeRecipientName}, <strong>${safeActorName}</strong> replied to your comment on <strong>${safePostTitle}</strong>.</p>
          <div style="border:2px solid #171717;background:#eef5ff;padding:18px;font-size:15px;line-height:1.6;">${safeReply}</div>
          ${discussionUrl ? `<p style="margin:22px 0 0;"><a href="${discussionUrl}" style="display:inline-block;background:#9fc5ff;color:#171717;text-decoration:none;border:2px solid #171717;padding:12px 16px;font-family:monospace;font-size:11px;font-weight:700;text-transform:uppercase;box-shadow:3px 3px 0 #171717;">Open discussion →</a></p>` : ""}
        </div>
      </div>
    </div>`;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `devcollective-comment-reply/${params.commentId}`,
    },
    body: JSON.stringify({
      from,
      to: [params.recipientEmail],
      subject: `${params.actorName || "Someone"} replied to your DevCollective comment`,
      html,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.name || "Email provider rejected the notification.");
  return { sent: true, id: data?.id || null };
}

async function loadComments(postId: string, viewerId: string) {
  const { data: comments, error } = await supabase
    .from("devcollective_post_comments")
    .select("id,post_id,parent_comment_id,author_clerk_user_id,content,created_at,updated_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  if (!comments?.length) return [];
  const authorIds = [...new Set(comments.map((comment) => comment.author_clerk_user_id))];
  const { data: profiles, error: profileError } = await supabase.from("devcollective_profiles").select("clerk_user_id,name,avatar,role,rep,academic_year,level").in("clerk_user_id", authorIds);
  if (profileError) throw profileError;
  const profileMap = new Map((profiles || []).map((profile) => [profile.clerk_user_id, profile]));
  const commentIds = comments.map((comment) => comment.id);
  const { data: likes, error: likeError } = await supabase.from("devcollective_post_comment_likes").select("comment_id,user_clerk_user_id").in("comment_id", commentIds);
  if (likeError) throw likeError;
  const likeCount = new Map<string, number>();
  const likedByViewer = new Set<string>();
  for (const like of likes || []) {
    likeCount.set(like.comment_id, (likeCount.get(like.comment_id) || 0) + 1);
    if (like.user_clerk_user_id === viewerId) likedByViewer.add(like.comment_id);
  }
  return comments.map((comment) => {
    const author = profileMap.get(comment.author_clerk_user_id);
    return {
      id: comment.id,
      postId: comment.post_id,
      parentCommentId: comment.parent_comment_id || null,
      authorId: comment.author_clerk_user_id,
      authorName: author?.name || "Developer",
      authorAvatar: author?.avatar || "",
      authorRole: author?.role || "student",
      authorRep: Number(author?.rep) || 0,
      authorAcademicYear: author?.academic_year || "",
      authorLevel: Number(author?.level) || 1,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at || comment.created_at,
      likes: likeCount.get(comment.id) || 0,
      likedByMe: likedByViewer.has(comment.id),
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getClerkUserId(req);
    const url = new URL(req.url);
    const postId = url.searchParams.get("postId");
    const commentId = url.searchParams.get("commentId");
    const mode = url.searchParams.get("mode");

    if (req.method === "GET" && mode === "counts") {
      const { data, error } = await supabase.from("devcollective_post_comments").select("post_id").limit(5000);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of data || []) counts.set(row.post_id, (counts.get(row.post_id) || 0) + 1);
      return json({ counts: Array.from(counts, ([id, count]) => ({ postId: id, count })) });
    }

    if (req.method === "GET") {
      if (!postId) return json({ error: "postId is required." }, 400);
      return json({ comments: await loadComments(postId, userId), viewerId: userId });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const targetPostId = String(body.postId || postId || "");
      const parentCommentId = body.parentCommentId ? String(body.parentCommentId) : null;
      const content = typeof body.content === "string" ? body.content.trim().slice(0, 2000) : "";
      if (!targetPostId) return json({ error: "postId is required." }, 400);
      if (!content) return json({ error: "Comment cannot be empty." }, 400);

      const { data: post, error: postError } = await supabase
        .from("devcollective_posts")
        .select("id,title")
        .eq("id", targetPostId)
        .maybeSingle();
      if (postError) throw postError;
      if (!post) return json({ error: "Post not found." }, 404);

      let recipient: { clerk_user_id: string; name: string; email: string } | null = null;
      if (parentCommentId) {
        const { data: parent, error: parentError } = await supabase
          .from("devcollective_post_comments")
          .select("id,post_id,author_clerk_user_id")
          .eq("id", parentCommentId)
          .maybeSingle();
        if (parentError) throw parentError;
        if (!parent || parent.post_id !== targetPostId) return json({ error: "Parent comment not found for this post." }, 404);
        if (parent.author_clerk_user_id !== userId) {
          const { data: recipientProfile, error: recipientError } = await supabase
            .from("devcollective_profiles")
            .select("clerk_user_id,name,email")
            .eq("clerk_user_id", parent.author_clerk_user_id)
            .maybeSingle();
          if (recipientError) throw recipientError;
          recipient = recipientProfile || null;
        }
      }

      const { data: created, error } = await supabase
        .from("devcollective_post_comments")
        .insert({ post_id: targetPostId, parent_comment_id: parentCommentId, author_clerk_user_id: userId, content })
        .select("id")
        .single();
      if (error) throw error;

      const nextRep = await adjustRep(userId, COMMENT_REP_REWARD);

      if (recipient?.email) {
        const { data: actorProfile } = await supabase
          .from("devcollective_profiles")
          .select("name")
          .eq("clerk_user_id", userId)
          .maybeSingle();
        try {
          await sendReplyEmail({
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            actorName: actorProfile?.name || "A developer",
            postTitle: post.title || "your discussion",
            replyText: content,
            postId: targetPostId,
            commentId: created.id,
          });
        } catch (emailError) {
          console.error("Reply email notification failed; comment remains created:", emailError);
        }

        const { error: notificationError } = await supabase
          .from("devcollective_notifications")
          .insert({
            recipient_clerk_user_id: recipient.clerk_user_id,
            actor_clerk_user_id: userId,
            type: "comment_reply",
            post_id: targetPostId,
            comment_id: created.id,
          });
        if (notificationError) console.error("In-app reply notification failed; comment remains created:", notificationError);
      }

      const comments = await loadComments(targetPostId, userId);
      return json({ comment: comments.find((item) => item.id === created.id) || null, count: comments.length, repAwarded: COMMENT_REP_REWARD, rep: nextRep }, 201);
    }

    if (req.method === "PUT") {
      if (!commentId) return json({ error: "commentId is required." }, 400);
      const body = await req.json().catch(() => ({}));
      const content = typeof body.content === "string" ? body.content.trim().slice(0, 2000) : "";
      if (!content) return json({ error: "Comment cannot be empty." }, 400);
      const { data: existing, error: lookupError } = await supabase.from("devcollective_post_comments").select("id,post_id,author_clerk_user_id").eq("id", commentId).maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) return json({ error: "Comment not found." }, 404);
      if (existing.author_clerk_user_id !== userId) return json({ error: "You can only edit your own comments." }, 403);
      const { error } = await supabase.from("devcollective_post_comments").update({ content }).eq("id", commentId).eq("author_clerk_user_id", userId);
      if (error) throw error;
      const comments = await loadComments(existing.post_id, userId);
      return json({ comment: comments.find((item) => item.id === commentId) || null });
    }

    if (req.method === "DELETE") {
      if (!commentId) return json({ error: "commentId is required." }, 400);
      const { data: existing, error: lookupError } = await supabase.from("devcollective_post_comments").select("id,post_id,author_clerk_user_id").eq("id", commentId).maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) return json({ error: "Comment not found." }, 404);
      if (existing.author_clerk_user_id !== userId) return json({ error: "You can only delete your own comments." }, 403);
      const { error } = await supabase.from("devcollective_post_comments").delete().eq("id", commentId).eq("author_clerk_user_id", userId);
      if (error) throw error;
      const nextRep = await adjustRep(userId, -COMMENT_REP_REWARD);
      const comments = await loadComments(existing.post_id, userId);
      return json({ count: comments.length, repRemoved: COMMENT_REP_REWARD, rep: nextRep });
    }

    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    console.error("community-comments error", error);
    const message = error instanceof Error ? error.message : "Could not process community comments.";
    const status = message.includes("Not authenticated") || message.includes("Invalid authentication") ? 401 : 500;
    return json({ error: message }, status);
  }
});