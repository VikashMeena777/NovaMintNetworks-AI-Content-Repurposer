"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
    Upload,
    Link2,
    ArrowRight,
    Sparkles,
    Info,
    Loader2,
} from "lucide-react";
import { CAPTION_STYLES, type CaptionStyle } from "@/lib/types";

export default function NewVideoPage() {
    const router = useRouter();
    const supabase = createClient();
    const [videoUrl, setVideoUrl] = useState("");
    const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("hormozi");
    const [maxClips, setMaxClips] = useState(10);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sourceType, setSourceType] = useState<"url" | "upload">("url");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoUrl.trim()) return;

        setIsSubmitting(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setError("You must be logged in to submit a video.");
            setIsSubmitting(false);
            return;
        }

        // Check plan limits before proceeding
        const { data: profile } = await supabase
            .from("profiles")
            .select("clips_used, clips_limit, videos_used, videos_limit")
            .eq("id", user.id)
            .single();

        if (profile) {
            if (profile.videos_used >= profile.videos_limit) {
                setError(`You've reached your plan limit of ${profile.videos_limit} video(s). Please upgrade to process more videos.`);
                setIsSubmitting(false);
                return;
            }
            if (profile.clips_used >= profile.clips_limit) {
                setError(`You've reached your plan limit of ${profile.clips_limit} clips. Please upgrade to generate more clips.`);
                setIsSubmitting(false);
                return;
            }
        }

        const { data, error: insertError } = await supabase
            .from("jobs")
            .insert({
                user_id: user.id,
                video_url: videoUrl.trim(),
                source_type: sourceType === "upload" ? "drive" : sourceType,
                caption_style: captionStyle,
                max_clips: maxClips,
                status: "queued",
                progress: 0,
            })
            .select("id")
            .single();

        if (insertError) {
            setError(insertError.message);
            setIsSubmitting(false);
            return;
        }

        if (data) {
            // Increment videos_used
            if (profile) {
                await supabase
                    .from("profiles")
                    .update({ videos_used: profile.videos_used + 1 })
                    .eq("id", user.id);
            }

            // Trigger the processing pipeline
            try {
                await fetch("/api/trigger-pipeline", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        job_id: data.id,
                        video_url: videoUrl.trim(),
                        caption_style: captionStyle,
                        max_clips: maxClips,
                    }),
                });
            } catch (triggerErr) {
                console.warn("Processing trigger failed:", triggerErr);
            }
            router.push(`/dashboard/${data.id}`);
        }
    };

    return (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                New Video
            </h1>
            <p
                style={{
                    color: "var(--text-secondary)",
                    fontSize: 15,
                    marginBottom: 40,
                }}
            >
                Upload a video and let AI create viral clips with animated captions
            </p>

            <form onSubmit={handleSubmit}>
                {/* ─── Source Type Tabs ─── */}
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 24,
                    }}
                >
                    {[
                        { value: "url" as const, label: "Paste URL", icon: <Link2 size={16} /> },
                        { value: "upload" as const, label: "Upload via Drive", icon: <Upload size={16} /> },
                    ].map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setSourceType(tab.value)}
                            style={{
                                flex: 1,
                                padding: "12px 16px",
                                borderRadius: 10,
                                border: `1px solid ${sourceType === tab.value ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                                background: sourceType === tab.value ? "rgba(108,92,231,0.15)" : "var(--bg-secondary)",
                                color: sourceType === tab.value ? "var(--text-primary)" : "var(--text-secondary)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                fontSize: 14,
                                fontWeight: sourceType === tab.value ? 600 : 400,
                                transition: "all 0.2s ease",
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ─── URL Input ─── */}
                {sourceType === "url" && (
                    <div style={{ marginBottom: 28 }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 8,
                                color: "var(--text-secondary)",
                            }}
                        >
                            Video URL
                        </label>
                        <input
                            type="url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://youtube.com/watch?v=... or Instagram/Facebook URL"
                            className="input-field"
                            required
                        />
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginTop: 8,
                                fontSize: 13,
                                color: "var(--text-muted)",
                            }}
                        >
                            <Info size={14} />
                            Supports YouTube, Instagram, Facebook, and direct MP4 links
                        </div>
                    </div>
                )}

                {/* ─── Upload via Google Drive (replaces direct file upload) ─── */}
                {sourceType === "upload" && (
                    <div style={{ marginBottom: 28 }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 8,
                                color: "var(--text-secondary)",
                            }}
                        >
                            Upload Your Video via Google Drive
                        </label>
                        <div
                            className="glass-card"
                            style={{
                                padding: 24,
                                marginBottom: 16,
                            }}
                        >
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                    <div style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: "50%",
                                        background: "rgba(108,92,231,0.15)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: "var(--accent-primary)",
                                    }}>1</div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                                            Upload to Google Drive
                                        </div>
                                        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                                            Upload your video file to your Google Drive account
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                    <div style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: "50%",
                                        background: "rgba(108,92,231,0.15)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: "var(--accent-primary)",
                                    }}>2</div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                                            Share with &quot;Anyone with the link&quot;
                                        </div>
                                        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                                            Right-click → Share → Change to &quot;Anyone with the link&quot; → Copy link
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                    <div style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: "50%",
                                        background: "rgba(108,92,231,0.15)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: "var(--accent-primary)",
                                    }}>3</div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                                            Paste the link below
                                        </div>
                                        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                                            Paste your Google Drive share link and we&apos;ll handle the rest
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <input
                            type="url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://drive.google.com/file/d/..."
                            className="input-field"
                            required
                        />
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginTop: 8,
                                fontSize: 13,
                                color: "var(--text-muted)",
                            }}
                        >
                            <Info size={14} />
                            Make sure the file is shared publicly (Anyone with the link)
                        </div>
                    </div>
                )}


                {/* ─── Caption Style Picker ─── */}
                <div style={{ marginBottom: 28 }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: 14,
                            fontWeight: 600,
                            marginBottom: 12,
                            color: "var(--text-secondary)",
                        }}
                    >
                        Caption Style
                    </label>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 10,
                        }}
                    >
                        {CAPTION_STYLES.map((style) => (
                            <button
                                key={style.value}
                                type="button"
                                onClick={() => setCaptionStyle(style.value)}
                                style={{
                                    padding: "14px 16px",
                                    borderRadius: 12,
                                    border: `1px solid ${captionStyle === style.value ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                                    background: captionStyle === style.value
                                        ? "rgba(108,92,231,0.15)"
                                        : "var(--bg-secondary)",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "all 0.2s ease",
                                    position: "relative",
                                }}
                            >
                                {captionStyle === style.value && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 8,
                                            right: 8,
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            background: "var(--accent-primary)",
                                        }}
                                    />
                                )}
                                <div
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: captionStyle === style.value
                                            ? "var(--text-primary)"
                                            : "var(--text-secondary)",
                                        marginBottom: 2,
                                    }}
                                >
                                    {style.label}
                                </div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: "var(--text-muted)",
                                    }}
                                >
                                    {style.description}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── Max Clips ─── */}
                <div style={{ marginBottom: 36 }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: 14,
                            fontWeight: 600,
                            marginBottom: 8,
                            color: "var(--text-secondary)",
                        }}
                    >
                        Max Clips: {maxClips}
                    </label>
                    <input
                        type="range"
                        min={1}
                        max={20}
                        value={maxClips}
                        onChange={(e) => setMaxClips(Number(e.target.value))}
                        style={{
                            width: "100%",
                            accentColor: "var(--accent-primary)",
                        }}
                    />
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            color: "var(--text-muted)",
                            marginTop: 4,
                        }}
                    >
                        <span>1 clip</span>
                        <span>20 clips</span>
                    </div>
                </div>

                {/* ─── Error ─── */}
                {error && (
                    <div
                        style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            color: "#EF4444",
                            fontSize: 13,
                            marginBottom: 16,
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* ─── Submit ─── */}
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSubmitting || !videoUrl.trim()}
                    style={{
                        width: "100%",
                        justifyContent: "center",
                        padding: "16px 24px",
                        fontSize: 16,
                    }}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Sparkles size={18} /> Start Processing{" "}
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>

                {/* ─── Info box ─── */}
                <div
                    className="glass-card"
                    style={{
                        padding: 20,
                        marginTop: 24,
                        display: "flex",
                        gap: 12,
                    }}
                >
                    <Info
                        size={20}
                        style={{
                            color: "var(--accent-primary)",
                            flexShrink: 0,
                            marginTop: 2,
                        }}
                    />
                    <div>
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 4,
                            }}
                        >
                            How long does it take?
                        </div>
                        <p
                            style={{
                                color: "var(--text-secondary)",
                                fontSize: 13,
                                lineHeight: 1.6,
                            }}
                        >
                            Processing typically takes 5-15 minutes depending on
                            video length. You&apos;ll receive a notification when
                            your clips are ready. The AI downloads the video,
                            transcribes the audio, detects viral moments, generates
                            clips, and renders professional captions.
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}
