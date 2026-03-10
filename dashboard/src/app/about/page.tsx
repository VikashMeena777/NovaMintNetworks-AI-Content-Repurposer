import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Film, Target, Lightbulb, Rocket } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "About ClipMint — AI Video Clipping Platform",
    description:
        "Learn about ClipMint, the AI-powered platform that turns long videos into viral short-form clips with professional animated captions.",
};

export default function AboutPage() {
    return (
        <main>
            <Navbar />

            <div style={{ maxWidth: 900, margin: "0 auto", padding: "140px 24px 80px" }}>
                {/* Hero */}
                <div style={{ textAlign: "center", marginBottom: 80 }}>
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 24,
                        }}
                    >
                        <Film size={36} style={{ color: "var(--accent-primary)" }} />
                        <span
                            className="gradient-text"
                            style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}
                        >
                            ClipMint
                        </span>
                    </div>
                    <h1
                        style={{
                            fontSize: "clamp(32px, 5vw, 48px)",
                            fontWeight: 800,
                            lineHeight: 1.15,
                            marginBottom: 20,
                        }}
                    >
                        Turning Long Videos Into{" "}
                        <span className="gradient-text">Viral Moments</span>
                    </h1>
                    <p
                        style={{
                            fontSize: 18,
                            color: "var(--text-secondary)",
                            maxWidth: 600,
                            margin: "0 auto",
                            lineHeight: 1.7,
                        }}
                    >
                        ClipMint was built to solve a simple problem: content creators
                        spend hours editing long-form videos into short clips. We
                        automated the entire workflow with AI.
                    </p>
                </div>

                {/* Story */}
                <div className="glass-card" style={{ padding: 40, marginBottom: 32 }}>
                    <h2
                        style={{
                            fontSize: 22,
                            fontWeight: 700,
                            marginBottom: 16,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <Lightbulb size={22} style={{ color: "var(--accent-orange)" }} />
                        Our Story
                    </h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: 15 }}>
                        ClipMint started as a personal tool — a weekend project to help
                        podcast creators turn 1-hour episodes into scroll-stopping clips.
                        After seeing the quality of AI transcription and the
                        power of custom animated captions, we knew this could
                        become a product that saves creators thousands of hours every
                        month.
                    </p>
                    <p
                        style={{
                            color: "var(--text-secondary)",
                            lineHeight: 1.8,
                            fontSize: 15,
                            marginTop: 12,
                        }}
                    >
                        Today, ClipMint processes videos end-to-end: downloading,
                        transcribing, detecting viral moments using AI, clipping with
                        precision, and rendering studio-quality animated captions — all
                        automatically.
                    </p>
                </div>

                {/* Values grid */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                        gap: 24,
                        marginBottom: 64,
                    }}
                >
                    {[
                        {
                            icon: <Target size={24} />,
                            title: "Our Mission",
                            desc: "Democratize professional video editing. Every creator should have access to studio-quality clips and captions — regardless of budget or editing skill.",
                        },
                        {
                            icon: <Rocket size={24} />,
                            title: "Our Vision",
                            desc: "Become the go-to AI platform for content repurposing. From a 1-hour podcast to 15 platform-ready clips — in under 20 minutes.",
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="glass-card"
                            style={{ padding: 32 }}
                        >
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: "rgba(108, 92, 231, 0.12)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "var(--accent-primary)",
                                    marginBottom: 16,
                                }}
                            >
                                {item.icon}
                            </div>
                            <h3
                                style={{
                                    fontSize: 18,
                                    fontWeight: 700,
                                    marginBottom: 10,
                                }}
                            >
                                {item.title}
                            </h3>
                            <p
                                style={{
                                    color: "var(--text-secondary)",
                                    fontSize: 14,
                                    lineHeight: 1.7,
                                }}
                            >
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Company info */}
                <div
                    style={{
                        textAlign: "center",
                        padding: "48px 24px",
                        color: "var(--text-secondary)",
                        fontSize: 15,
                        lineHeight: 1.7,
                    }}
                >
                    <p>
                        <strong style={{ color: "var(--text-primary)" }}>
                            NovaMint Networks
                        </strong>
                    </p>
                    <p>Founder of ClipMint - VIKASH MEENA</p>
                    <p>Jaipur, Rajasthan, India</p>
                    <p>
                        <a
                            href="mailto:ClipMintApp@gmail.com"
                            style={{ color: "var(--accent-secondary)", textDecoration: "none" }}
                        >
                            ClipMintApp@gmail.com
                        </a>
                    </p>
                </div>
            </div>

            <Footer />
        </main>
    );
}
