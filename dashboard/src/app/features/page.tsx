import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Link from "next/link";
import {
    Bot,
    Sparkles,
    Layers,
    MonitorSmartphone,
    Code2,
    BarChart3,
    Clock,
    Shield,
    Wand2,
    ArrowRight,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Features — ClipMint AI Video Clipping Platform",
    description:
        "Discover ClipMint's powerful features: AI viral moment detection, 9 animated caption styles, batch processing, multi-platform output, API access, and real-time analytics.",
};

const FEATURES = [
    {
        icon: <Bot size={28} />,
        title: "AI Viral Moment Detection",
        desc: "Our AI engine uses audio energy analysis, transcript context, silence detection, and engagement scoring to find the most shareable moments in your videos. No manual trimming needed.",
        detail: "Powered by OpenAI transcription + GPT-4 viral scoring",
    },
    {
        icon: <Sparkles size={28} />,
        title: "9 Animated Caption Styles",
        desc: "Choose from 9 studio-quality animated caption styles rendered — from Hormozi-style word highlighting to Neon glow effects. These are real animations, not flat text.",
        detail: "Hormozi · Bounce · Fade · Glow · Typewriter · Glitch · Neon · Colorful · Minimal",
    },
    {
        icon: <Layers size={28} />,
        title: "Batch Processing",
        desc: "Queue up multiple videos at once. ClipMint processes them sequentially so you can focus on creating while AI handles the editing. Perfect for agencies and prolific creators.",
        detail: "Unlimited batch queue on Agency plan",
    },
    {
        icon: <MonitorSmartphone size={28} />,
        title: "Multi-Platform Output",
        desc: "Every clip is automatically formatted for YouTube Shorts (9:16), Instagram Reels, TikTok, and LinkedIn. Complete with titles, descriptions, hashtags, and thumbnails.",
        detail: "Auto-generated metadata for each platform",
    },
    {
        icon: <Code2 size={28} />,
        title: "Full API Access",
        desc: "Integrate ClipMint into your own tools, CMS, or team workflows via a RESTful API. Submit videos, check processing status, and retrieve clips programmatically.",
        detail: "Available on Pro and Agency plans",
    },
    {
        icon: <BarChart3 size={28} />,
        title: "Analytics Dashboard",
        desc: "Track clips generated, viral scores, processing activity, and usage trends — all in a real-time dashboard. Understand which content performs best.",
        detail: "Activity heatmaps, trend charts, and leaderboards",
    },
    {
        icon: <Clock size={28} />,
        title: "Fast Processing",
        desc: "Most videos are processed in under 20 minutes — from upload to download-ready clips with animated captions. Priority processing available on paid plans.",
        detail: "Average: 10 clips in ~15 minutes",
    },
    {
        icon: <Shield size={28} />,
        title: "Secure & Private",
        desc: "Your videos are processed and then deleted. Clips are stored in your linked Google Drive. We never share your content or data with third parties.",
        detail: "GDPR-compliant data handling",
    },
    {
        icon: <Wand2 size={28} />,
        title: "Smart Audio Analysis",
        desc: "ClipMint analyzes audio energy levels, detects laughter and emphasis, and snaps clip boundaries to natural pauses — so your clips start and end cleanly.",
        detail: "Silence detection + energy peak scoring",
    },
];

export default function FeaturesPage() {
    return (
        <main>
            <Navbar />

            <div
                style={{
                    maxWidth: 1100,
                    margin: "0 auto",
                    padding: "140px 24px 80px",
                }}
            >
                <div style={{ textAlign: "center", marginBottom: 64 }}>
                    <h1
                        style={{
                            fontSize: "clamp(32px, 5vw, 48px)",
                            fontWeight: 800,
                            marginBottom: 16,
                        }}
                    >
                        Powerful <span className="gradient-text">Features</span>
                    </h1>
                    <p
                        style={{
                            fontSize: 18,
                            color: "var(--text-secondary)",
                            maxWidth: 600,
                            margin: "0 auto",
                            lineHeight: 1.6,
                        }}
                    >
                        Everything you need to turn hours of long-form content into viral
                        short-form clips — automatically.
                    </p>
                </div>

                {/* Comparison stats */}
                <div
                    className="glass-card"
                    style={{
                        padding: 32,
                        marginBottom: 48,
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 24,
                        textAlign: "center",
                    }}
                >
                    {[
                        { label: "Manual Editing", value: "4-6 hrs", muted: true },
                        { label: "With ClipMint", value: "< 20 min", muted: false },
                        { label: "Time Saved", value: "95%", muted: false },
                    ].map((s) => (
                        <div key={s.label}>
                            <div
                                className={s.muted ? "" : "gradient-text"}
                                style={{
                                    fontSize: 28,
                                    fontWeight: 800,
                                    color: s.muted ? "var(--text-muted)" : undefined,
                                    textDecoration: s.muted ? "line-through" : undefined,
                                }}
                            >
                                {s.value}
                            </div>
                            <div
                                style={{
                                    fontSize: 13,
                                    color: "var(--text-secondary)",
                                    marginTop: 4,
                                }}
                            >
                                {s.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Feature cards */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                        gap: 24,
                        marginBottom: 80,
                    }}
                >
                    {FEATURES.map((feat) => (
                        <div
                            key={feat.title}
                            className="glass-card"
                            style={{ padding: 32 }}
                        >
                            <div
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 16,
                                    background: "rgba(108, 92, 231, 0.12)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "var(--accent-primary)",
                                    marginBottom: 20,
                                }}
                            >
                                {feat.icon}
                            </div>
                            <h3
                                style={{
                                    fontSize: 20,
                                    fontWeight: 700,
                                    marginBottom: 12,
                                }}
                            >
                                {feat.title}
                            </h3>
                            <p
                                style={{
                                    color: "var(--text-secondary)",
                                    fontSize: 15,
                                    lineHeight: 1.7,
                                    marginBottom: 16,
                                }}
                            >
                                {feat.desc}
                            </p>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "var(--accent-secondary)",
                                    fontWeight: 600,
                                    padding: "6px 12px",
                                    background: "rgba(108, 92, 231, 0.08)",
                                    borderRadius: 8,
                                    display: "inline-block",
                                }}
                            >
                                {feat.detail}
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div
                    style={{
                        textAlign: "center",
                        padding: "48px 24px",
                    }}
                >
                    <h2
                        style={{
                            fontSize: 28,
                            fontWeight: 800,
                            marginBottom: 16,
                        }}
                    >
                        Ready to try it?
                    </h2>
                    <p
                        style={{
                            color: "var(--text-secondary)",
                            marginBottom: 28,
                            fontSize: 16,
                        }}
                    >
                        Start with the free plan — no credit card required.
                    </p>
                    <Link
                        href="/login"
                        className="btn-primary"
                        style={{ padding: "16px 36px", fontSize: 17 }}
                    >
                        Get Started Free <ArrowRight size={18} />
                    </Link>
                </div>
            </div>

            <Footer />
        </main>
    );
}
