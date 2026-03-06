"use client";

import Link from "next/link";
import {
  Upload,
  Zap,
  Film,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Play,
} from "lucide-react";
import { CAPTION_STYLES } from "@/lib/types";

export default function HomePage() {
  return (
    <main>
      {/* ─── Navigation ─── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(10, 10, 15, 0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Film
            size={28}
            style={{ color: "var(--accent-primary)" }}
          />
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: -0.5,
            }}
            className="gradient-text"
          >
            ClipMint
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/dashboard" className="btn-secondary">
            Dashboard
          </Link>
          <Link href="/dashboard/new" className="btn-primary">
            <Upload size={16} /> Start Clipping
          </Link>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "120px 24px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 600,
            background:
              "radial-gradient(circle, rgba(108,92,231,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          className="animate-fade-in-up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 20,
            background: "rgba(108, 92, 231, 0.1)",
            border: "1px solid rgba(108, 92, 231, 0.3)",
            fontSize: 14,
            color: "var(--accent-secondary)",
            marginBottom: 32,
            fontWeight: 500,
          }}
        >
          <Sparkles size={14} /> AI-Powered Content Repurposer
        </div>

        <h1
          className="animate-fade-in-up"
          style={{
            fontSize: "clamp(40px, 6vw, 72px)",
            fontWeight: 900,
            lineHeight: 1.1,
            maxWidth: 800,
            marginBottom: 24,
            animationDelay: "0.1s",
          }}
        >
          One Video In,{" "}
          <span className="gradient-text">10+ Clips</span> Out
        </h1>

        <p
          className="animate-fade-in-up"
          style={{
            fontSize: 20,
            color: "var(--text-secondary)",
            maxWidth: 560,
            lineHeight: 1.6,
            marginBottom: 40,
            animationDelay: "0.2s",
          }}
        >
          Upload a podcast, vlog, or lecture — AI detects viral
          moments, clips them, adds professional animated captions,
          and delivers platform-ready shorts.
        </p>

        <div
          className="animate-fade-in-up"
          style={{
            display: "flex",
            gap: 16,
            animationDelay: "0.3s",
          }}
        >
          <Link
            href="/dashboard/new"
            className="btn-primary animate-pulse-glow"
            style={{ padding: "16px 36px", fontSize: 17 }}
          >
            <Upload size={18} /> Upload Your First Video
          </Link>
          <button
            className="btn-secondary"
            style={{ padding: "16px 36px", fontSize: 17 }}
          >
            <Play size={18} /> Watch Demo
          </button>
        </div>

        {/* ─── Stats ─── */}
        <div
          className="animate-fade-in-up"
          style={{
            display: "flex",
            gap: 48,
            marginTop: 80,
            animationDelay: "0.5s",
          }}
        >
          {[
            { value: "9", label: "Caption Styles" },
            { value: "200+", label: "Videos/Month Free" },
            { value: "$0", label: "Infrastructure Cost" },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div
                className="gradient-text"
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  marginTop: 4,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section
        style={{
          padding: "100px 24px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontSize: 40,
            fontWeight: 800,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          How It{" "}
          <span className="gradient-text">Works</span>
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 18,
            marginBottom: 64,
          }}
        >
          Three steps. Zero editing skills required.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 28,
          }}
        >
          {[
            {
              icon: <Upload size={28} />,
              step: "01",
              title: "Upload",
              desc: "Paste a YouTube/Instagram URL or upload your video file. We support MP4, MOV, WebM up to 500MB.",
            },
            {
              icon: <Zap size={28} />,
              step: "02",
              title: "AI Processes",
              desc: "Whisper transcribes → AI detects viral moments → FFmpeg clips → Remotion renders animated captions.",
            },
            {
              icon: <Sparkles size={28} />,
              step: "03",
              title: "Download & Post",
              desc: "Get 10+ platform-ready clips with titles, hashtags, thumbnails — formatted for Reels, Shorts & more.",
            },
          ].map((item) => (
            <div key={item.step} className="glass-card" style={{ padding: 32 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background:
                      "rgba(108, 92, 231, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent-primary)",
                  }}
                >
                  {item.icon}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--accent-primary)",
                    letterSpacing: 1,
                  }}
                >
                  STEP {item.step}
                </span>
              </div>
              <h3
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  lineHeight: 1.7,
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Caption Styles ─── */}
      <section
        style={{
          padding: "100px 24px",
          background:
            "linear-gradient(180deg, transparent 0%, rgba(108,92,231,0.03) 50%, transparent 100%)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 800,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            <span className="gradient-text">9 Caption Styles</span>
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "var(--text-secondary)",
              fontSize: 18,
              marginBottom: 64,
            }}
          >
            Professional animated captions powered by Remotion — not
            flat FFmpeg text.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            {CAPTION_STYLES.map((style) => (
              <div
                key={style.value}
                className="glass-card"
                style={{
                  padding: 24,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  {style.label}
                </div>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {style.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section
        style={{
          padding: "100px 24px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontSize: 40,
            fontWeight: 800,
            textAlign: "center",
            marginBottom: 64,
          }}
        >
          Simple{" "}
          <span className="gradient-text">Pricing</span>
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 24,
          }}
        >
          {[
            {
              name: "Free",
              price: "₹0",
              period: "forever",
              features: [
                "5 clips/month",
                "1 video/month",
                "720p output",
                "ClipMint watermark",
                "3 caption styles",
              ],
              highlighted: false,
            },
            {
              name: "Creator",
              price: "₹499",
              period: "/month",
              features: [
                "50 clips/month",
                "5 videos/month",
                "1080p output",
                "No watermark",
                "All 9 caption styles",
              ],
              highlighted: true,
            },
            {
              name: "Pro",
              price: "₹1,499",
              period: "/month",
              features: [
                "200 clips/month",
                "20 videos/month",
                "4K output",
                "Priority processing",
                "Direct publishing + API",
              ],
              highlighted: false,
            },
            {
              name: "Agency",
              price: "₹4,999",
              period: "/month",
              features: [
                "Unlimited clips",
                "Unlimited videos",
                "White-label",
                "Team accounts",
                "n8n integration + batch",
              ],
              highlighted: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className="glass-card"
              style={{
                padding: 32,
                border: plan.highlighted
                  ? "2px solid var(--accent-primary)"
                  : undefined,
                position: "relative",
              }}
            >
              {plan.highlighted && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--accent-primary)",
                    color: "white",
                    padding: "4px 16px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  MOST POPULAR
                </div>
              )}
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                {plan.name}
              </h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                  marginBottom: 24,
                }}
              >
                <span
                  className="gradient-text"
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                  }}
                >
                  {plan.price}
                </span>
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 14,
                  }}
                >
                  {plan.period}
                </span>
              </div>
              <ul
                style={{
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 28,
                }}
              >
                {plan.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      color: "var(--text-secondary)",
                      fontSize: 14,
                    }}
                  >
                    <CheckCircle2
                      size={16}
                      style={{
                        color: "var(--accent-green)",
                        flexShrink: 0,
                      }}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={
                  plan.highlighted
                    ? "btn-primary"
                    : "btn-secondary"
                }
                style={{ width: "100%", justifyContent: "center" }}
              >
                Get Started <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer
        style={{
          padding: "40px 24px",
          borderTop: "1px solid var(--border-subtle)",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <Film
            size={18}
            style={{ color: "var(--accent-primary)" }}
          />
          <span className="gradient-text" style={{ fontWeight: 700 }}>
            ClipMint
          </span>
        </div>
        © 2026 ClipMint by NovaMint. All rights reserved.
      </footer>
    </main>
  );
}
