"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import type { Job, Clip } from "@/lib/types";
import { JOB_STATUS_LABELS } from "@/lib/types";
import {
    ArrowLeft, Download, ExternalLink, Copy, Share2, Star,
    Clock, Film, Loader2, RefreshCw, AlertTriangle, Image,
    Check, ChevronRight,
} from "lucide-react";

const PIPELINE_STEPS = [
    { key: "downloading", label: "Download" },
    { key: "transcribing", label: "Transcribe" },
    { key: "analyzing", label: "Analyze" },
    { key: "clipping", label: "Clip" },
    { key: "captioning", label: "Caption" },
    { key: "uploading", label: "Upload" },
];

function getStepState(stepKey: string, jobStatus: string) {
    const stepOrder = PIPELINE_STEPS.map((s) => s.key);
    const currentIdx = stepOrder.indexOf(jobStatus);
    const stepIdx = stepOrder.indexOf(stepKey);
    if (jobStatus === "done") return "completed";
    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "active";
    return "pending";
}

export default function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
    const { jobId } = use(params);
    const supabase = createClient();
    const [job, setJob] = useState<Job | null>(null);
    const [clips, setClips] = useState<Clip[]>([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);
    const [downloadingAll, setDownloadingAll] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const { data: jobData } = await supabase.from("jobs").select("*").eq("id", jobId).single();
            if (jobData) setJob(jobData as Job);

            const { data: clipsData } = await supabase.from("clips").select("*").eq("job_id", jobId).order("clip_index", { ascending: true });
            if (clipsData) setClips(clipsData as Clip[]);
            setLoading(false);
        }
        load();

        // Real-time updates for this job
        const channel = supabase
            .channel(`job-${jobId}`)
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs", filter: `id=eq.${jobId}` }, (payload) => {
                setJob(payload.new as Job);
            })
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "clips", filter: `job_id=eq.${jobId}` }, (payload) => {
                setClips((prev) => [...prev, payload.new as Clip]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [jobId]);

    const handleRetry = async () => {
        if (!job) return;
        setRetrying(true);
        await supabase.from("jobs").update({ status: "queued", progress: 0, error_message: null }).eq("id", job.id);
        setJob((j) => j ? { ...j, status: "queued", progress: 0, error_message: null } : j);
        try {
            const res = await fetch("/api/trigger-pipeline", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ job_id: job.id, video_url: job.video_url, caption_style: job.caption_style, max_clips: job.max_clips }),
            });
            if (!res.ok) setJob((j) => j ? { ...j, status: "failed", error_message: "Could not start processing. Please try again." } : j);
        } catch {
            setJob((j) => j ? { ...j, status: "failed", error_message: "Could not start processing. Please check your connection." } : j);
        }
        setRetrying(false);
    };

    const toDirectDriveUrl = (url: string): string => {
        const match = url.match(/\/file\/d\/([^/]+)/);
        if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
        const idMatch = url.match(/[?&]id=([^&]+)/);
        if (idMatch) return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
        return url;
    };

    const triggerDownload = (url: string) => {
        const downloadUrl = toDirectDriveUrl(url);
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = downloadUrl;
        document.body.appendChild(iframe);
        setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 10000);
    };

    const handleDownloadAll = () => {
        if (clips.length === 0) return;
        setDownloadingAll(true);
        const validClips = clips.filter((c) => c.drive_url);
        validClips.forEach((clip, i) => {
            setTimeout(() => {
                triggerDownload(clip.drive_url!);
                if (i === validClips.length - 1) setDownloadingAll(false);
            }, i * 1000);
        });
    };

    const handleCopy = (clipId: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(clipId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) {
        return (
            <div>
                <div className="skeleton" style={{ height: 28, width: 180, marginBottom: 24, borderRadius: 8 }} />
                <div className="skeleton" style={{ height: 80, marginBottom: 20, borderRadius: 14 }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 260, borderRadius: 16 }} />)}
                </div>
            </div>
        );
    }

    if (!job) {
        return (
            <div>
                <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", textDecoration: "none", fontSize: 14, marginBottom: 20 }}>
                    <ArrowLeft size={16} /> Back to Jobs
                </Link>
                <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
                    <Film size={40} style={{ color: "var(--text-muted)", marginBottom: 16 }} />
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Job Not Found</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>This job doesn&apos;t exist or you don&apos;t have access.</p>
                </div>
            </div>
        );
    }

    const statusInfo = JOB_STATUS_LABELS[job.status];
    const isProcessing = !["done", "failed", "queued", "cancelled"].includes(job.status);

    return (
        <div>
            {/* ─── Header ─── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
                <div>
                    <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", textDecoration: "none", fontSize: 13, marginBottom: 12 }}>
                        <ArrowLeft size={14} /> Back to Jobs
                    </Link>
                    <h1 style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 800, marginBottom: 8 }}>
                        Job {jobId.slice(0, 8)}
                    </h1>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 13, color: "var(--text-muted)" }}>
                        <span className="status-badge" style={{ background: `${statusInfo.color}15`, color: statusInfo.color, border: `1px solid ${statusInfo.color}30` }}>
                            {statusInfo.emoji} {statusInfo.label}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={13} /> {new Date(job.created_at).toLocaleString()}</span>
                        <span>Style: {job.caption_style}</span>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-secondary" onClick={handleDownloadAll} disabled={downloadingAll || clips.length === 0} style={{ padding: "8px 16px", fontSize: 13 }}>
                        {downloadingAll ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Downloading...</> : <><Download size={14} /> Download All ({clips.length})</>}
                    </button>
                </div>
            </div>

            {/* ─── Job Overview Card ─── */}
            <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>SOURCE</div>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.video_url || job.video_filename || "—"}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>CAPTION STYLE</div>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{job.caption_style}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>MAX CLIPS</div>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{job.max_clips}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>CLIPS GENERATED</div>
                        <div style={{ fontSize: 13, color: "var(--accent-green)", fontWeight: 700 }}>{clips.length}</div>
                    </div>
                </div>
            </div>

            {/* ─── Step Progress Indicator ─── */}
            {(isProcessing || job.status === "done") && (
                <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 16 }}>PROCESSING PIPELINE</div>
                    <div className="step-progress">
                        {PIPELINE_STEPS.map((step, i) => {
                            const state = job.status === "done" ? "completed" : getStepState(step.key, job.status);
                            return (
                                <div key={step.key} className="step-item">
                                    {i < PIPELINE_STEPS.length - 1 && <div className={`step-connector ${state === "completed" ? "completed" : state === "active" ? "active" : ""}`} />}
                                    <div className={`step-circle ${state}`}>
                                        {state === "completed" ? <Check size={14} /> : i + 1}
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: 500, color: state === "active" ? "var(--accent-primary)" : state === "completed" ? "var(--accent-green)" : "var(--text-muted)" }}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─── Error/Cancelled states ─── */}
            {job.status === "failed" && (
                <div className="glass-card" style={{ padding: 20, marginBottom: 24, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <AlertTriangle size={20} style={{ color: "#EF4444", flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#EF4444", marginBottom: 6 }}>Processing failed</div>
                            <div style={{ fontSize: 13, color: "var(--text-secondary)", background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: 8, marginBottom: 12, lineHeight: 1.5 }}>
                                {job.error_message || "Something went wrong. Please try again or contact support."}
                            </div>
                            <button className="btn-primary" onClick={handleRetry} disabled={retrying} style={{ padding: "8px 16px", fontSize: 13 }}>
                                {retrying ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Retrying...</> : <><RefreshCw size={14} /> Retry</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {job.status === "cancelled" && (
                <div className="glass-card" style={{ padding: 20, marginBottom: 24, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <AlertTriangle size={20} style={{ color: "#F59E0B", flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#F59E0B", marginBottom: 6 }}>Processing cancelled</div>
                            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>This job was cancelled. You can retry to reprocess your video.</div>
                            <button className="btn-primary" onClick={handleRetry} disabled={retrying} style={{ padding: "8px 16px", fontSize: 13 }}>
                                {retrying ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Retrying...</> : <><RefreshCw size={14} /> Retry</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Clips Gallery ─── */}
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Film size={18} style={{ color: "var(--accent-primary)" }} />
                {clips.length} Clip{clips.length !== 1 ? "s" : ""} Generated
            </h2>

            {clips.length === 0 ? (
                <div className="glass-card" style={{ padding: 48, textAlign: "center" }}>
                    <Film size={36} style={{ color: "var(--text-muted)", marginBottom: 12, opacity: 0.4 }} />
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                        {job.status === "done" ? "No clips were generated for this job." : "Clips will appear here once processing is complete."}
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                    {clips.map((clip, i) => (
                        <div key={clip.id} className="glass-card animate-fade-in-up" style={{ padding: 0, overflow: "hidden", animationDelay: `${i * 0.06}s` }}>
                            {/* Preview area */}
                            <div style={{ height: 170, background: "linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card-hover) 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                                {clip.thumbnail_url ? (
                                    <img src={clip.thumbnail_url} alt={clip.title || `Clip ${clip.clip_index + 1}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    <Film size={36} style={{ color: "var(--text-muted)", opacity: 0.2 }} />
                                )}
                                {clip.viral_score != null && (
                                    <div style={{ position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8, background: clip.viral_score >= 80 ? "rgba(0,230,118,0.2)" : "rgba(255,145,0,0.2)", color: clip.viral_score >= 80 ? "var(--accent-green)" : "var(--accent-orange)", fontSize: 13, fontWeight: 700, backdropFilter: "blur(8px)" }}>
                                        <Star size={13} /> {clip.viral_score}
                                    </div>
                                )}
                                {clip.duration_seconds != null && (
                                    <div style={{ position: "absolute", bottom: 10, right: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(0,0,0,0.7)", fontSize: 11, fontWeight: 600 }}>
                                        {Math.round(clip.duration_seconds)}s
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div style={{ padding: "14px 18px" }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 5, lineHeight: 1.3 }}>
                                    {clip.title || `Clip ${clip.clip_index + 1}`}
                                </h3>
                                {clip.hook_caption && (
                                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                        &ldquo;{clip.hook_caption}&rdquo;
                                    </p>
                                )}
                                {clip.hashtags && clip.hashtags.length > 0 && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                                        {clip.hashtags.slice(0, 4).map((tag) => (
                                            <span key={tag} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(108,92,231,0.1)", color: "var(--accent-secondary)", fontWeight: 500 }}>{tag}</span>
                                        ))}
                                    </div>
                                )}

                                {/* Actions */}
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    <button className="btn-primary" style={{ flex: 1, justifyContent: "center", padding: "7px 10px", fontSize: 12 }} onClick={() => clip.drive_url && triggerDownload(clip.drive_url)}>
                                        <Download size={13} /> Video
                                    </button>
                                    {clip.thumbnail_url && (
                                        <button className="btn-secondary" style={{ padding: "7px 10px", fontSize: 12 }} onClick={() => triggerDownload(clip.thumbnail_url!)} title="Download Thumbnail">
                                            <Image size={13} />
                                        </button>
                                    )}
                                    <button
                                        className="btn-secondary"
                                        style={{ padding: "7px 10px", fontSize: 12 }}
                                        onClick={() => handleCopy(clip.id, `${clip.title}\n\n${clip.hook_caption}\n\n${clip.hashtags?.join(" ")}`)}
                                        title={copiedId === clip.id ? "Copied!" : "Copy caption & hashtags"}
                                    >
                                        {copiedId === clip.id ? <Check size={13} style={{ color: "var(--accent-green)" }} /> : <Copy size={13} />}
                                    </button>
                                    <a href={clip.drive_url || "#"} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: "7px 10px", fontSize: 12 }} title="Open in Drive">
                                        <ExternalLink size={13} />
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
