import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/**
 * Force Node.js runtime (not Edge) so all npm packages resolve correctly.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/job-status
 *
 * Called by the processing pipeline when a job completes or fails.
 * - Updates clips_used in the user's profile
 * - Sends email notification via Resend
 * - Sends Discord notification via user's webhook URL
 *
 * Body: { job_id, status, error_message?, webhook_secret }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { job_id, status, error_message, webhook_secret } = body;

    // Lazy-init Resend (avoids build-time crash when env var is missing)
    const resend = new Resend(process.env.RESEND_API_KEY);

    // ── Authenticate the webhook call ──
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (!expectedSecret || webhook_secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!job_id || !status) {
      return NextResponse.json(
        { error: "job_id and status are required" },
        { status: 400 }
      );
    }

    // ── Fetch job details from Supabase via REST ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY env var is not set — cannot fetch job");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const jobRes = await fetch(
      `${supabaseUrl}/rest/v1/jobs?id=eq.${job_id}&select=id,user_id,video_url,clips_count,source_type`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );

    const jobs = await jobRes.json();
    console.log(`Webhook job lookup: job_id=${job_id}, status=${jobRes.status}, results=${Array.isArray(jobs) ? jobs.length : 'non-array'}`);
    if (!jobs || jobs.length === 0) {
      console.error(`Job not found: job_id=${job_id}, response:`, JSON.stringify(jobs));
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobs[0];

    // ── Update clips_used in user profile when job completes successfully ──
    if (status === "done" && job.clips_count > 0) {
      try {
        const profileRes = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${job.user_id}&select=clips_used`,
          {
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
          }
        );
        const profiles = await profileRes.json();
        if (profiles && profiles.length > 0) {
          const currentClipsUsed = profiles[0].clips_used || 0;
          await fetch(
            `${supabaseUrl}/rest/v1/profiles?id=eq.${job.user_id}`,
            {
              method: "PATCH",
              headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify({
                clips_used: currentClipsUsed + job.clips_count,
              }),
            }
          );
          console.log(`Updated clips_used: ${currentClipsUsed} → ${currentClipsUsed + job.clips_count} for user ${job.user_id}`);
        }
      } catch (err) {
        console.error("Failed to update clips_used:", err);
      }
    }

    // ── Get user email + profile (for notification prefs) ──
    const userRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${job.user_id}`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );

    const userData = await userRes.json();
    const userEmail = userData?.email;

    if (!userEmail) {
      console.error("Could not fetch user email for user:", job.user_id);
      return NextResponse.json(
        { error: "User email not found" },
        { status: 404 }
      );
    }

    // ── Get user notification preferences ──
    let notifyEmail = true;
    let notifyDiscord = false;
    let notifyJobComplete = true;
    let notifyJobFailed = true;
    let discordWebhookUrl: string | null = null;

    try {
      const profileNotifRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${job.user_id}&select=notify_email,notify_discord,notify_job_complete,notify_job_failed,discord_webhook_url`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        }
      );
      const profileNotifData = await profileNotifRes.json();
      if (profileNotifData && profileNotifData.length > 0) {
        const prefs = profileNotifData[0];
        notifyEmail = prefs.notify_email ?? true;
        notifyDiscord = prefs.notify_discord ?? false;
        notifyJobComplete = prefs.notify_job_complete ?? true;
        notifyJobFailed = prefs.notify_job_failed ?? true;
        discordWebhookUrl = prefs.discord_webhook_url || null;
      }
    } catch (err) {
      console.warn("Could not fetch notification prefs, using defaults:", err);
    }

    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || "https://novamintnetworks.in";
    const jobUrl = `${dashboardUrl}/dashboard/${job_id}`;

    // ── Check if this notification type is enabled ──
    const shouldNotify =
      (status === "done" && notifyJobComplete) ||
      (status === "failed" && notifyJobFailed);

    // ── Send Email notification ──
    if (shouldNotify && notifyEmail) {
      try {
        if (status === "done") {
          await resend.emails.send({
            from: "ClipMint <no-reply@novamintnetworks.in>",
            to: [userEmail],
            subject: "🎬 Your clips are ready!",
            html: buildSuccessEmail({
              jobUrl,
              clipCount: job.clips_count || 0,
              videoUrl: job.video_url || "",
            }),
          });
        } else if (status === "failed") {
          await resend.emails.send({
            from: "ClipMint <no-reply@novamintnetworks.in>",
            to: [userEmail],
            subject: "⚠️ Video processing failed",
            html: buildFailureEmail({
              jobUrl,
              errorMessage: error_message || "An unexpected error occurred",
              videoUrl: job.video_url || "",
            }),
          });
        }
        console.log(`Email notification sent to ${userEmail} for status: ${status}`);
      } catch (err) {
        console.error("Failed to send email notification:", err);
      }
    }

    // ── Send Discord notification ──
    if (shouldNotify && notifyDiscord && discordWebhookUrl) {
      try {
        await sendDiscordNotification({
          webhookUrl: discordWebhookUrl,
          status,
          jobUrl,
          clipCount: job.clips_count || 0,
          videoUrl: job.video_url || "",
          errorMessage: error_message,
        });
        console.log(`Discord notification sent for job ${job_id}`);
      } catch (err) {
        console.error("Failed to send Discord notification:", err);
      }
    }

    return NextResponse.json({ sent: true, to: userEmail, status });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Webhook handler error:", errMsg);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}

// ── Discord Webhook ──

async function sendDiscordNotification(opts: {
  webhookUrl: string;
  status: string;
  jobUrl: string;
  clipCount: number;
  videoUrl: string;
  errorMessage?: string;
}) {
  const isSuccess = opts.status === "done";

  const embed = {
    title: isSuccess ? "🎬 Your clips are ready!" : "⚠️ Processing failed",
    description: isSuccess
      ? `ClipMint generated **${opts.clipCount} clip${opts.clipCount !== 1 ? "s" : ""}** from your video.`
      : `ClipMint encountered an error while processing your video.\n\n**Error:** ${opts.errorMessage || "An unexpected error occurred"}`,
    color: isSuccess ? 0x39E508 : 0xEF4444,
    fields: [
      {
        name: "📹 Source",
        value: opts.videoUrl.length > 100
          ? opts.videoUrl.slice(0, 100) + "..."
          : opts.videoUrl || "N/A",
        inline: false,
      },
      ...(isSuccess
        ? [{ name: "📊 Clips", value: `${opts.clipCount}`, inline: true }]
        : []),
    ],
    url: opts.jobUrl,
    timestamp: new Date().toISOString(),
    footer: {
      text: "ClipMint by NovaMint Networks",
    },
  };

  await fetch(opts.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "ClipMint",
      avatar_url: "https://novamintnetworks.in/favicon.ico",
      embeds: [embed],
    }),
  });
}

// ── Email Templates ──

function buildSuccessEmail(opts: { jobUrl: string; clipCount: number; videoUrl: string }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#111;border-radius:16px;border:1px solid #222;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#39E508 0%,#00C853 100%);padding:32px 40px;">
      <h1 style="margin:0;color:#000;font-size:24px;font-weight:800;">🎬 Your clips are ready!</h1>
    </div>
    <div style="padding:32px 40px;">
      <p style="color:#ccc;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Great news! ClipMint has finished processing your video and generated
        <strong style="color:#39E508;">${opts.clipCount} clip${opts.clipCount !== 1 ? "s" : ""}</strong>.
      </p>
      <p style="color:#888;font-size:13px;margin:0 0 24px;word-break:break-all;">
        Source: ${opts.videoUrl.length > 80 ? opts.videoUrl.slice(0, 80) + "..." : opts.videoUrl}
      </p>
      <a href="${opts.jobUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#39E508,#00C853);color:#000;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
        View & Download Clips →
      </a>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #222;">
      <p style="color:#555;font-size:12px;margin:0;">
        ClipMint by NovaMint Networks · <a href="${opts.jobUrl}" style="color:#39E508;text-decoration:none;">Dashboard</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildFailureEmail(opts: { jobUrl: string; errorMessage: string; videoUrl: string }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#111;border-radius:16px;border:1px solid #222;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#EF4444 0%,#DC2626 100%);padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;">⚠️ Processing Failed</h1>
    </div>
    <div style="padding:32px 40px;">
      <p style="color:#ccc;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Unfortunately, ClipMint encountered an error while processing your video.
      </p>
      <p style="color:#888;font-size:13px;margin:0 0 12px;word-break:break-all;">
        Source: ${opts.videoUrl.length > 80 ? opts.videoUrl.slice(0, 80) + "..." : opts.videoUrl}
      </p>
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:12px 16px;margin:0 0 24px;">
        <span style="color:#EF4444;font-size:13px;">
          ${opts.errorMessage}
        </span>
      </div>
      <a href="${opts.jobUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#EF4444,#DC2626);color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
        View Job & Retry →
      </a>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #222;">
      <p style="color:#555;font-size:12px;margin:0;">
        ClipMint by NovaMint Networks · <a href="${opts.jobUrl}" style="color:#39E508;text-decoration:none;">Dashboard</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
