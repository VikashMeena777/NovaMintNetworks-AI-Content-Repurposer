"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
    Upload, Link2, ArrowRight, Sparkles, Info, Loader2,
    Check, Zap, AlertCircle,
} from "lucide-react";
import { CAPTION_STYLES, type CaptionStyle } from "@/lib/types";

const STEPS = [
    { num: 1, label: "Source" },
    { num: 2, label: "Style" },
    { num: 3, label: "Config" },
];

export default function NewVideoPage() {
    const router = useRouter();
    const supabase = createClient();
    const [videoUrl, setVideoUrl] = useState("");
    const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("hormozi");
    const [maxClips, setMaxClips] = useState(10);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sourceType, setSourceType] = useState<"url" | "upload">("url");
    const [currentStep, setCurrentStep] = useState(1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoUrl.trim()) return;

        setIsSubmitting(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("You must be logged in."); setIsSubmitting(false); return; }

        const { data: profile } = await supabase.from("profiles").select("clips_used, clips_limit, videos_used, videos_limit").eq("id", user.id).single();

        if (profile) {
            if (profile.videos_used >= profile.videos_limit) {
                setError(`You've reached your limit of ${profile.videos_limit} video(s). Please upgrade.`);
                setIsSubmitting(false); return;
            }
            if (profile.clips_used >= profile.clips_limit) {
                setError(`You've reached your limit of ${profile.clips_limit} clips. Please upgrade.`);
                setIsSubmitting(false); return;
            }
            const remaining = profile.clips_limit - profile.clips_used;
            if (remaining <= 0) { setError("No clips remaining. Please upgrade."); setIsSubmitting(false); return; }
            if (maxClips > remaining) setMaxClips(remaining);
        }

        const { data, error: insertError } = await supabase.from("jobs").insert({
            user_id: user.id, video_url: videoUrl.trim(),
            source_type: sourceType === "upload" ? "drive" : sourceType,
            caption_style: captionStyle, max_clips: maxClips, status: "queued", progress: 0,
        }).select("id").single();

        if (insertError) { setError(insertError.message); setIsSubmitting(false); return; }

        if (data) {
            if (profile) await supabase.from("profiles").update({ videos_used: profile.videos_used + 1 }).eq("id", user.id);
            try {
                await fetch("/api/trigger-pipeline", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ job_id: data.id, video_url: videoUrl.trim(), caption_style: captionStyle, max_clips: maxClips }),
                });
            } catch (err) { console.warn("Trigger failed:", err); }
            router.push(`/dashboard/${data.id}`);
        }
    };

    return (
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
            {/* ─── Step Progress ─── */}
            <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36 }}>
                {STEPS.map((step, i) => (
                    <div key={step.num} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                                width: 30, height: 30, borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 700,
                                background: currentStep >= step.num ? "var(--accent-primary)" : "var(--bg-secondary)",
                                color: currentStep >= step.num ? "white" : "var(--text-muted)",
                                border: currentStep >= step.num ? "none" : "1px solid var(--border-subtle)",
                                transition: "all 0.3s ease",
                            }}>
                                {currentStep > step.num ? <Check size={14} /> : step.num}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 500, color: currentStep >= step.num ? "var(--text-primary)" : "var(--text-muted)" }}>
                                {step.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div style={{ flex: 1, height: 2, margin: "0 12px", background: currentStep > step.num ? "var(--accent-primary)" : "var(--border-subtle)", borderRadius: 1, transition: "background 0.3s ease" }} />
                        )}
                    </div>
                ))}
            </div>

            <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 800, marginBottom: 4 }}>
                <Zap size={24} style={{ color: "var(--accent-primary)", verticalAlign: "middle", marginRight: 8 }} />
                Create New Video
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 32 }}>
                Upload a video and let AI create viral clips with animated captions
            </p>

            <form onSubmit={handleSubmit}>
                {/* ─── Source Type Tabs ─── */}
                <div className="tab-nav" style={{ marginBottom: 20 }}>
                    {[
                        { value: "url" as const, label: "Paste URL", icon: <Link2 size={15} /> },
                        { value: "upload" as const, label: "Upload via Drive", icon: <Upload size={15} /> },
                    ].map((tab) => (
                        <button
                            key={tab.value} type="button"
                            className={`tab-item ${sourceType === tab.value ? "active" : ""}`}
                            onClick={() => { setSourceType(tab.value); setCurrentStep(1); }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ─── URL Input ─── */}
                {sourceType === "url" && (
                    <div style={{ marginBottom: 28 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>Video URL</label>
                        <input
                            type="url" value={videoUrl}
                            onChange={(e) => { setVideoUrl(e.target.value); if (e.target.value.trim()) setCurrentStep(2); }}
                            placeholder="https://youtube.com/watch?v=... or Instagram/Facebook URL"
                            className="input-field" required
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                            <Info size={12} /> Supports YouTube, Instagram, Facebook, and direct MP4 links
                        </div>
                    </div>
                )}

                {/* ─── Upload via Drive ─── */}
                {sourceType === "upload" && (
                    <div style={{ marginBottom: 28 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
                            Upload via Google Drive
                        </label>
                        <div className="glass-card" style={{ padding: 20, marginBottom: 14 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                {[
                                    { n: 1, t: "Upload to Google Drive", d: "Upload your video file to your Google Drive account" },
                                    { n: 2, t: 'Share with "Anyone with the link"', d: 'Right-click → Share → Change to "Anyone with the link" → Copy link' },
                                    { n: 3, t: "Paste the link below", d: "Paste your Google Drive share link and we'll handle the rest" },
                                ].map((s) => (
                                    <div key={s.n} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                        <div style={{
                                            width: 26, height: 26, borderRadius: "50%",
                                            background: "rgba(108,92,231,0.15)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            flexShrink: 0, fontSize: 12, fontWeight: 700, color: "var(--accent-primary)",
                                        }}>{s.n}</div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{s.t}</div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{s.d}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <input
                            type="url" value={videoUrl}
                            onChange={(e) => { setVideoUrl(e.target.value); if (e.target.value.trim()) setCurrentStep(2); }}
                            placeholder="https://drive.google.com/file/d/..." className="input-field" required
                        />
                    </div>
                )}

                {/* ─── Caption Style Picker ─── */}
                <div style={{ marginBottom: 28 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-secondary)" }}>Caption Style</label>
                    <div className="dash-grid-3">
                        {CAPTION_STYLES.map((style) => (
                            <button
                                key={style.value} type="button"
                                onClick={() => { setCaptionStyle(style.value); setCurrentStep(3); }}
                                className="glass-card"
                                style={{
                                    padding: "12px 14px", textAlign: "left", cursor: "pointer",
                                    borderColor: captionStyle === style.value ? "var(--accent-primary)" : undefined,
                                    background: captionStyle === style.value ? "rgba(108,92,231,0.12)" : undefined,
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: captionStyle === style.value ? "var(--text-primary)" : "var(--text-secondary)" }}>
                                        {style.label}
                                    </span>
                                    {captionStyle === style.value && <Check size={14} style={{ color: "var(--accent-primary)" }} />}
                                </div>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{style.description}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── Max Clips ─── */}
                <div style={{ marginBottom: 32 }}>
                    <label style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-secondary)" }}>
                        <span>Max Clips</span>
                        <span style={{ color: "var(--accent-primary)", fontWeight: 700 }}>{maxClips}</span>
                    </label>
                    <input
                        type="range"
                        min={1} max={20}
                        value={maxClips}
                        onChange={(e) => setMaxClips(Number(e.target.value))}
                        style={{
                            width: "100%",
                            background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${((maxClips - 1) / 19) * 100}%, var(--bg-secondary) ${((maxClips - 1) / 19) * 100}%, var(--bg-secondary) 100%)`,
                            height: 6,
                            borderRadius: 3
                        }}
                        className="custom-range"
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                        <span>1 clip</span><span>20 clips</span>
                    </div>
                </div>

                {/* ─── Error ─── */}
                {error && (
                    <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                        <AlertCircle size={14} /> {error}
                    </div>
                )}

                {/* ─── Submit ─── */}
                <button
                    type="submit" className="btn-primary"
                    disabled={isSubmitting || !videoUrl.trim()}
                    style={{ width: "100%", justifyContent: "center", padding: "14px 24px", fontSize: 15 }}
                >
                    {isSubmitting ? (
                        <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Processing...</>
                    ) : (
                        <><Sparkles size={18} /> Start Processing <ArrowRight size={18} /></>
                    )}
                </button>

                {/* ─── Info ─── */}
                <div className="glass-card" style={{ padding: 18, marginTop: 20, display: "flex", gap: 10 }}>
                    <Info size={18} style={{ color: "var(--accent-primary)", flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>How long does it take?</div>
                        <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>
                            Processing typically takes 5-15 minutes. The AI downloads the video, transcribes audio, detects viral moments, generates clips, and renders captions.
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}
