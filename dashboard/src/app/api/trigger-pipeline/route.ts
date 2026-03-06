import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";

/**
 * POST /api/trigger-pipeline
 *
 * Called by the dashboard after a job is inserted into Supabase.
 * Triggers the GitHub Actions workflow_dispatch to start processing.
 * This runs server-side so the GITHUB_TOKEN never reaches the browser.
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { job_id, video_url, caption_style, max_clips } = body;

    if (!job_id || !video_url) {
        return NextResponse.json(
            { error: "job_id and video_url are required" },
            { status: 400 }
        );
    }

    // Verify the job belongs to this user
    const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select("id, user_id")
        .eq("id", job_id)
        .eq("user_id", user.id)
        .single();

    if (jobError || !job) {
        return NextResponse.json(
            { error: "Job not found or not authorized" },
            { status: 404 }
        );
    }

    // Trigger GitHub Actions workflow
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;

    if (!githubToken || !githubRepo) {
        // If GitHub integration isn't configured, just leave the job queued
        console.warn("GITHUB_TOKEN or GITHUB_REPO not set — pipeline not triggered");
        return NextResponse.json({
            triggered: false,
            message: "Pipeline trigger not configured. Job created but processing not started.",
        });
    }

    try {
        const dispatchRes = await fetch(
            `https://api.github.com/repos/${githubRepo}/actions/workflows/process-video.yml/dispatches`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${githubToken}`,
                    Accept: "application/vnd.github.v3+json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ref: "main",
                    inputs: {
                        job_id: job_id,
                        video_url: video_url,
                        caption_style: caption_style || "hormozi",
                        max_clips: String(max_clips || 10),
                    },
                }),
            }
        );

        if (!dispatchRes.ok) {
            const errText = await dispatchRes.text();
            console.error("GitHub dispatch failed:", dispatchRes.status, errText);

            // Mark job as failed
            await supabase
                .from("jobs")
                .update({
                    status: "failed",
                    error_message: "Failed to trigger processing pipeline",
                })
                .eq("id", job_id);

            return NextResponse.json(
                { error: "Failed to trigger processing pipeline" },
                { status: 500 }
            );
        }

        return NextResponse.json({ triggered: true, job_id });
    } catch (err) {
        console.error("Pipeline trigger error:", err);

        await supabase
            .from("jobs")
            .update({
                status: "failed",
                error_message: "Failed to trigger processing pipeline",
            })
            .eq("id", job_id);

        return NextResponse.json(
            { error: "Failed to trigger processing pipeline" },
            { status: 500 }
        );
    }
}
