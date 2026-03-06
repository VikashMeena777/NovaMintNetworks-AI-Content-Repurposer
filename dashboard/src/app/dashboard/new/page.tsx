"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
    Upload,
    Link2,
    HardDrive,
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
    const [sourceType, setSourceType] = useState<"url" | "upload" | "drive">("url");

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

        const { data, error: insertError } = await supabase
            .from("jobs")
            .insert({
                user_id: user.id,
                video_url: videoUrl.trim(),
                source_type: sourceType,
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
                        { value: "upload" as const, label: "Upload File", icon: <Upload size={16} /> },
                        { value: "drive" as const, label: "Google Drive", icon: <HardDrive size={16} /> },
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

                {/* ─── File Upload ─── */}
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
                            Upload Video File
                        </label>
                        <div
                            style={{
                                border: "2px dashed var(--border-subtle)",
                                borderRadius: 16,
                                padding: "48px 24px",
                                textAlign: "center",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                background: "var(--bg-secondary)",
                            }}
                        >
                            <Upload
                                size={36}
                                style={{
                                    color: "var(--text-muted)",
                                    marginBottom: 12,
                                }}
                            />
                            <p style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
                                Drag & drop your video here, or click to browse
                            </p>
                            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                                MP4, MOV, WebM — max 500MB
                            </p>
                            <input
                                type="file"
                                accept="video/*"
                                style={{ display: "none" }}
                            />
                        </div>
                    </div>
                )}

                {/* ─── Drive ─── */}
                {sourceType === "drive" && (
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
                            Google Drive Link
                        </label>
                        <input
                            type="url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://drive.google.com/file/d/..."
                            className="input-field"
                            required
                        />
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
                    disabled={isSubmitting || (!videoUrl.trim() && sourceType !== "upload")}
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
                            your clips are ready. The pipeline downloads the
                            video, transcribes the audio, detects viral moments
                            with AI, generates clips, and renders professional
                            captions.
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}
