"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import type { Job, Clip } from "@/lib/types";
import { JOB_STATUS_LABELS } from "@/lib/types";
import {
    ArrowLeft,
    Download,
    ExternalLink,
    Copy,
    Share2,
    Star,
    Clock,
    Film,
    Loader2,
    RefreshCw,
    AlertTriangle,
} from "lucide-react";

export default function JobDetailPage({
    params,
}: {
    params: Promise<{ jobId: string }>;
}) {
    const { jobId } = use(params);
    const supabase = createClient();
    const [job, setJob] = useState<Job | null>(null);
    const [clips, setClips] = useState<Clip[]>([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);

    useEffect(() => {
        async function load() {
            const { data: jobData } = await supabase
                .from("jobs")
                .select("*")
                .eq("id", jobId)
                .single();

            if (jobData) setJob(jobData as Job);

            const { data: clipsData } = await supabase
                .from("clips")
                .select("*")
                .eq("job_id", jobId)
                .order("clip_index", { ascending: true });

            if (clipsData) setClips(clipsData as Clip[]);
            setLoading(false);
        }
        load();
    }, [jobId, supabase]);

    const handleRetry = async () => {
        if (!job) return;
        setRetrying(true);

        // Reset job status to queued
        await supabase
            .from("jobs")
            .update({ status: "queued", progress: 0, error_message: null })
            .eq("id", job.id);

        setJob((j) => j ? { ...j, status: "queued", progress: 0, error_message: null } : j);

        // Re-trigger the pipeline
        try {
            const res = await fetch("/api/trigger-pipeline", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    job_id: job.id,
                    video_url: job.video_url,
                    caption_style: job.caption_style,
                    max_clips: job.max_clips,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                // Update UI with the error
                setJob((j) => j ? { ...j, status: "failed", error_message: data.error } : j);
            }
        } catch {
            setJob((j) => j ? { ...j, status: "failed", error_message: "Network error — could not reach trigger API" } : j);
        }
        setRetrying(false);
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
                <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent-primary)" }} />
            </div>
        );
    }

    if (!job) {
        return (
            <div>
                <Link
                    href="/dashboard"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        color: "var(--text-secondary)",
                        textDecoration: "none",
                        fontSize: 14,
                        marginBottom: 20,
                    }}
                >
                    <ArrowLeft size={16} /> Back to Jobs
                </Link>
                <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
                    <Film size={40} style={{ color: "var(--text-muted)", marginBottom: 16 }} />
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Job Not Found</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                        This job doesn&apos;t exist or you don&apos;t have access to it.
                    </p>
                </div>
            </div>
        );
    }

    const statusInfo = JOB_STATUS_LABELS[job.status];

    return (
        <div>
            {/* ─── Back + Header ─── */}
            <Link
                href="/dashboard"
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                    fontSize: 14,
                    marginBottom: 20,
                }}
            >
                <ArrowLeft size={16} /> Back to Jobs
            </Link>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 32,
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: 28,
                            fontWeight: 800,
                            marginBottom: 8,
                        }}
                    >
                        Job {jobId.slice(0, 8)}
                    </h1>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            color: "var(--text-secondary)",
                            fontSize: 14,
                        }}
                    >
                        <span
                            className="status-badge"
                            style={{
                                background: `${statusInfo.color}15`,
                                color: statusInfo.color,
                                border: `1px solid ${statusInfo.color}30`,
                            }}
                        >
                            {statusInfo.emoji} {statusInfo.label}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={14} />
                            {new Date(job.created_at).toLocaleString()}
                        </span>
                        <span>Style: {job.caption_style}</span>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-secondary">
                        <Download size={16} /> Download All
                    </button>
                    <button className="btn-primary">
                        <Share2 size={16} /> Share
                    </button>
                </div>
            </div>

            {/* ─── Error box when job failed ─── */}
            {job.status === "failed" && (
                <div
                    className="glass-card"
                    style={{
                        padding: 20,
                        marginBottom: 32,
                        border: "1px solid rgba(239,68,68,0.3)",
                        background: "rgba(239,68,68,0.05)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <AlertTriangle size={20} style={{ color: "#EF4444", flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#EF4444", marginBottom: 6 }}>
                                Pipeline failed
                            </div>
                            <div
                                style={{
                                    fontFamily: "monospace",
                                    fontSize: 12,
                                    color: "var(--text-secondary)",
                                    background: "rgba(0,0,0,0.3)",
                                    padding: "8px 12px",
                                    borderRadius: 6,
                                    wordBreak: "break-all",
                                    marginBottom: 12,
                                }}
                            >
                                {job.error_message || "Unknown error — check GitHub Actions logs"}
                            </div>
                            <button
                                className="btn-primary"
                                onClick={handleRetry}
                                disabled={retrying}
                                style={{ padding: "8px 16px", fontSize: 13 }}
                            >
                                {retrying ? (
                                    <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Retrying...</>
                                ) : (
                                    <><RefreshCw size={14} /> Retry Pipeline</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Progress bar for active jobs ─── */}
            {job.status !== "done" && job.status !== "failed" && (
                <div className="glass-card" style={{ padding: 24, marginBottom: 32 }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 12,
                            fontSize: 14,
                        }}
                    >
                        <span style={{ color: "var(--text-secondary)" }}>
                            {statusInfo.emoji} {statusInfo.label}...
                        </span>
                        <span style={{ fontWeight: 600 }}>{job.progress}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: 8 }}>
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${job.progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* ─── Clips Grid ─── */}
            <h2
                style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}
            >
                <Film size={20} style={{ color: "var(--accent-primary)" }} />
                {clips.length} Clip{clips.length !== 1 ? "s" : ""} Generated
            </h2>

            {clips.length === 0 ? (
                <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
                    <Film size={36} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                        {job.status === "done"
                            ? "No clips were generated for this job."
                            : "Clips will appear here once processing is complete."}
                    </p>
                </div>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                        gap: 16,
                    }}
                >
                    {clips.map((clip, i) => (
                        <div
                            key={clip.id}
                            className="glass-card animate-fade-in-up"
                            style={{
                                padding: 0,
                                overflow: "hidden",
                                animationDelay: `${i * 0.08}s`,
                            }}
                        >
                            {/* Preview area */}
                            <div
                                style={{
                                    height: 180,
                                    background:
                                        "linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card-hover) 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
                                }}
                            >
                                {clip.thumbnail_url ? (
                                    <img
                                        src={clip.thumbnail_url}
                                        alt={clip.title || `Clip ${clip.clip_index + 1}`}
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                        }}
                                    />
                                ) : (
                                    <Film
                                        size={40}
                                        style={{ color: "var(--text-muted)", opacity: 0.3 }}
                                    />
                                )}

                                {/* Viral score badge */}
                                {clip.viral_score != null && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 12,
                                            right: 12,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 4,
                                            padding: "4px 10px",
                                            borderRadius: 8,
                                            background: clip.viral_score >= 80
                                                ? "rgba(0, 230, 118, 0.15)"
                                                : "rgba(255, 145, 0, 0.15)",
                                            color: clip.viral_score >= 80
                                                ? "var(--accent-green)"
                                                : "var(--accent-orange)",
                                            fontSize: 13,
                                            fontWeight: 700,
                                        }}
                                    >
                                        <Star size={14} /> {clip.viral_score}
                                    </div>
                                )}

                                {/* Duration badge */}
                                {clip.duration_seconds != null && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            bottom: 12,
                                            right: 12,
                                            padding: "4px 8px",
                                            borderRadius: 6,
                                            background: "rgba(0,0,0,0.6)",
                                            fontSize: 12,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {Math.round(clip.duration_seconds)}s
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div style={{ padding: "16px 20px" }}>
                                <h3
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 700,
                                        marginBottom: 6,
                                        lineHeight: 1.3,
                                    }}
                                >
                                    {clip.title || `Clip ${clip.clip_index + 1}`}
                                </h3>
                                {clip.hook_caption && (
                                    <p
                                        style={{
                                            fontSize: 13,
                                            color: "var(--text-muted)",
                                            marginBottom: 12,
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        &ldquo;{clip.hook_caption}&rdquo;
                                    </p>
                                )}

                                {/* Hashtags */}
                                {clip.hashtags && clip.hashtags.length > 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 6,
                                            marginBottom: 16,
                                        }}
                                    >
                                        {clip.hashtags.slice(0, 4).map((tag) => (
                                            <span
                                                key={tag}
                                                style={{
                                                    fontSize: 11,
                                                    padding: "3px 8px",
                                                    borderRadius: 6,
                                                    background: "rgba(108,92,231,0.1)",
                                                    color: "var(--accent-secondary)",
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Actions */}
                                <div style={{ display: "flex", gap: 8 }}>
                                    <a
                                        href={clip.drive_url || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary"
                                        style={{
                                            flex: 1,
                                            justifyContent: "center",
                                            padding: "8px 12px",
                                            fontSize: 13,
                                        }}
                                    >
                                        <Download size={14} /> Download
                                    </a>
                                    <button
                                        className="btn-secondary"
                                        style={{
                                            padding: "8px 12px",
                                            fontSize: 13,
                                        }}
                                        onClick={() => {
                                            navigator.clipboard.writeText(
                                                `${clip.title}\n\n${clip.hook_caption}\n\n${clip.hashtags?.join(" ")}`
                                            );
                                        }}
                                    >
                                        <Copy size={14} />
                                    </button>
                                    <a
                                        href={clip.drive_url || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary"
                                        style={{
                                            padding: "8px 12px",
                                            fontSize: 13,
                                        }}
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
