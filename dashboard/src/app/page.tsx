"use client";

import Link from "next/link";
import {
  Upload,
  Zap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Play,
  Film,
  Bot,
  Layers,
  BarChart3,
  Code2,
  MonitorSmartphone,
  ChevronDown,
  Star,
  Quote,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { CAPTION_STYLES } from "@/lib/types";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

/* ─── Scroll reveal hook ─── */
function useReveal() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function RevealSection({
  children,
  style,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  delay?: number;
}) {
  const ref = useReveal();
  return (
    <section
      ref={ref}
      className={`reveal ${delay ? `reveal-delay-${delay}` : ""} ${className}`}
      style={style}
    >
      {children}
    </section>
  );
}

/* ─── FAQ Component ─── */
function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const faqs = [
    {
      q: "What video formats are supported?",
      a: "ClipMint supports MP4, MOV, WebM, and AVI files up to 500MB. You can also paste a YouTube, Instagram, or Google Drive URL directly.",
    },
    {
      q: "How long does processing take?",
      a: "Most videos are processed in 5-15 minutes depending on length. Priority processing is available on Pro and Agency plans for faster results.",
    },
    {
      q: "Can I cancel my subscription?",
      a: "Absolutely. You can cancel anytime from your dashboard Settings page. You'll keep access until the end of your billing period.",
    },
    {
      q: "What's included in the free plan?",
      a: "The free plan includes 5 clips per month, 2 videos per month, 720p output, and access to 3 caption styles. No credit card required.",
    },
    {
      q: "How does the refund policy work?",
      a: "We offer a 7-day refund policy from the date of purchase. If the service doesn't meet your expectations, email us at ClipMint.Billing@gmail.com.",
    },
    {
      q: "Can I use clips commercially?",
      a: "Yes! You own 100% of your content. All clips generated through ClipMint can be used for commercial purposes on any platform.",
    },
    {
      q: "Is API access available?",
      a: "API access is available on Pro and Agency plans. You get full RESTful API access to integrate ClipMint into your own workflows and tools.",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 700,
        margin: "0 auto",
      }}
    >
      {faqs.map((faq, i) => (
        <div
          key={i}
          className={`faq-item ${openIdx === i ? "open" : ""}`}
        >
          <button
            className="faq-question"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
          >
            {faq.q}
            <ChevronDown size={18} className="faq-chevron" />
          </button>
          <div className="faq-answer">{faq.a}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ─── */
export default function HomePage() {
  return (
    <main>
      <Navbar />

      {/* ═══ 1. HERO ═══ */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "140px 24px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="gradient-mesh" />

        {/* Badge */}
        <div
          className="animate-fade-in-up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 18px",
            borderRadius: 24,
            background: "rgba(108, 92, 231, 0.1)",
            border: "1px solid rgba(108, 92, 231, 0.25)",
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
            lineHeight: 1.08,
            maxWidth: 820,
            marginBottom: 24,
            animationDelay: "0.1s",
            letterSpacing: -1,
          }}
        >
          One Video In,{" "}
          <span className="gradient-text">10+ Viral Clips</span> Out
        </h1>

        <p
          className="animate-fade-in-up"
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "var(--text-secondary)",
            maxWidth: 580,
            lineHeight: 1.65,
            marginBottom: 44,
            animationDelay: "0.2s",
          }}
        >
          Upload a podcast, vlog, or lecture — AI detects viral moments,
          clips them, and adds{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            professional animated captions
          </strong>
          . Platform-ready in minutes.
        </p>

        <div
          className="animate-fade-in-up"
          style={{
            display: "flex",
            gap: 16,
            animationDelay: "0.3s",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link
            href="/login"
            className="btn-primary animate-pulse-glow"
            style={{ padding: "16px 36px", fontSize: 17 }}
          >
            <Upload size={18} /> Start Free — No Card Required
          </Link>
          <Link
            href="/features"
            className="btn-secondary"
            style={{ padding: "16px 36px", fontSize: 17 }}
          >
            <Play size={18} /> See Features
          </Link>
        </div>

        {/* Trust badge */}
        <div
          className="animate-fade-in-up"
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--text-muted)",
            fontSize: 14,
            animationDelay: "0.4s",
          }}
        >
          <CheckCircle2 size={16} style={{ color: "var(--accent-green)" }} />
          Trusted by 500+ content creators worldwide
        </div>

        {/* Stats */}
        <div
          className="animate-fade-in-up"
          style={{
            display: "flex",
            gap: 56,
            marginTop: 64,
            animationDelay: "0.5s",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { value: "9", label: "Caption Styles" },
            { value: "50K+", label: "Clips Generated" },
            { value: "< 15 min", label: "Avg Processing" },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div
                className="gradient-text"
                style={{ fontSize: 36, fontWeight: 800 }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 13,
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

      {/* ═══ 2. SOCIAL PROOF BAR ═══ */}
      <RevealSection
        style={{
          padding: "40px 24px",
          textAlign: "center",
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: 2,
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          Built for creators on
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 48,
            flexWrap: "wrap",
            alignItems: "center",
            opacity: 0.5,
          }}
        >
          {["YouTube", "Instagram", "TikTok", "LinkedIn", "X / Twitter"].map(
            (platform) => (
              <span
                key={platform}
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  letterSpacing: 0.5,
                }}
              >
                {platform}
              </span>
            )
          )}
        </div>
      </RevealSection>

      {/* ═══ 3. HOW IT WORKS ═══ */}
      <RevealSection
        style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}
      >
        <h2 className="section-heading">
          How It <span className="gradient-text">Works</span>
        </h2>
        <p className="section-subheading">
          Three steps. Zero editing skills required.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 28,
          }}
        >
          {[
            {
              icon: <Upload size={28} />,
              step: "01",
              title: "Upload",
              desc: "Paste a YouTube/Instagram URL or drag-and-drop your video file. We support MP4, MOV, WebM up to 500MB.",
            },
            {
              icon: <Zap size={28} />,
              step: "02",
              title: "AI Processes",
              desc: "Transcribes → AI scores viral moments → Clips → Renders studio-quality animated captions.",
            },
            {
              icon: <Sparkles size={28} />,
              step: "03",
              title: "Download & Post",
              desc: "Get platform-ready clips with titles, hashtags, and thumbnails — formatted for Reels, Shorts & TikTok.",
            },
          ].map((item, i) => (
            <div
              key={item.step}
              className="glass-card"
              style={{
                padding: 32,
                animationDelay: `${i * 0.1}s`,
              }}
            >
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
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: "rgba(108, 92, 231, 0.12)",
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
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--accent-primary)",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                  }}
                >
                  Step {item.step}
                </span>
              </div>
              <h3
                style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}
              >
                {item.title}
              </h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </RevealSection>

      {/* ═══ 4. FEATURES GRID ═══ */}
      <RevealSection
        style={{
          padding: "100px 24px",
          background:
            "linear-gradient(180deg, transparent 0%, rgba(108,92,231,0.02) 50%, transparent 100%)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 className="section-heading">
            Powerful <span className="gradient-text">Features</span>
          </h2>
          <p className="section-subheading">
            Everything you need to turn long-form content into viral
            short-form clips.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 24,
            }}
          >
            {[
              {
                icon: <Bot size={24} />,
                title: "AI Viral Moment Detection",
                desc: "Our AI analyzes audio energy, transcript context, and engagement patterns to find the most shareable moments.",
              },
              {
                icon: <Sparkles size={24} />,
                title: "9 Animated Caption Styles",
                desc: "Studio-quality animated captions powered by Remotion — not flat FFmpeg text. From Hormozi-style to Neon Glow.",
              },
              {
                icon: <Layers size={24} />,
                title: "Batch Processing",
                desc: "Process multiple videos at once. Queue up your content and let AI handle the rest while you focus on creating.",
              },
              {
                icon: <MonitorSmartphone size={24} />,
                title: "Multi-Platform Output",
                desc: "Clips are automatically formatted for YouTube Shorts, Instagram Reels, TikTok, and LinkedIn — with proper aspect ratios.",
              },
              {
                icon: <Code2 size={24} />,
                title: "API Access",
                desc: "Full RESTful API to integrate ClipMint into your own tools, workflows, and team processes. Available on Pro plans.",
              },
              {
                icon: <BarChart3 size={24} />,
                title: "Analytics Dashboard",
                desc: "Track clips generated, viral scores, processing trends, and usage — all in a real-time analytics dashboard.",
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="glass-card"
                style={{ padding: 28 }}
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
                    marginBottom: 20,
                  }}
                >
                  {feat.icon}
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  {feat.title}
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ═══ 5. CAPTION STYLES SHOWCASE ═══ */}
      <RevealSection
        style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}
      >
        <h2 className="section-heading">
          <span className="gradient-text">9 Caption Styles</span>
        </h2>
        <p className="section-subheading">
          Professional animated captions powered by Remotion — studio-quality,
          not flat text.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          {CAPTION_STYLES.map((style) => (
            <div
              key={style.value}
              className="glass-card"
              style={{ padding: 24, cursor: "default" }}
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
      </RevealSection>

      {/* ═══ 6. PRICING ═══ */}
      <RevealSection
        style={{
          padding: "100px 24px",
          background:
            "linear-gradient(180deg, transparent 0%, rgba(108,92,231,0.02) 50%, transparent 100%)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 className="section-heading">
            Simple <span className="gradient-text">Pricing</span>
          </h2>
          <p className="section-subheading">
            Start free. Upgrade when you{"'"}re ready to go pro.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
                  "2 videos/month",
                  "720p output",
                  "ClipMint watermark",
                  "3 caption styles",
                ],
                highlighted: false,
                cta: "Start Free",
              },
              {
                name: "Creator",
                price: "₹249",
                period: "/month",
                features: [
                  "50 clips/month",
                  "5 videos/month",
                  "1080p output",
                  "No watermark",
                  "All 9 caption styles",
                ],
                highlighted: true,
                cta: "Start Free Trial",
              },
              {
                name: "Pro",
                price: "₹899",
                period: "/month",
                features: [
                  "200 clips/month",
                  "20 videos/month",
                  "4K output",
                  "Priority processing",
                  "API access",
                ],
                highlighted: false,
                cta: "Subscribe Now",
              },
              {
                name: "Agency",
                price: "₹1,499",
                period: "/month",
                features: [
                  "Unlimited clips",
                  "Unlimited videos",
                  "White-label",
                  "Team accounts",
                  "n8n integration + batch",
                ],
                highlighted: false,
                cta: "Contact Sales",
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
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                    }}
                  >
                    Most Popular
                  </div>
                )}
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
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
                    style={{ fontSize: 36, fontWeight: 800 }}
                  >
                    {plan.price}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
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
                <Link
                  href="/login"
                  className={plan.highlighted ? "btn-primary" : "btn-secondary"}
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    textDecoration: "none",
                  }}
                >
                  {plan.cta} <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ═══ 7. TESTIMONIALS ═══ */}
      <RevealSection
        style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}
      >
        <h2 className="section-heading">
          Loved by <span className="gradient-text">Creators</span>
        </h2>
        <p className="section-subheading">
          See what content creators are saying about ClipMint.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}
        >
          {[
            {
              name: "Priya Sharma",
              role: "YouTube Creator · 120K subs",
              text: "ClipMint reduced my editing time from 4 hours to 15 minutes. The AI accurately picks the most engaging moments and the animated captions look professional.",
              stars: 5,
            },
            {
              name: "Rahul Mehta",
              role: "Podcast Host · The Daily Grind",
              text: "I upload my 1-hour podcast episode and get 12+ clips ready for Reels and Shorts. The Hormozi-style captions are exactly what I needed. Game changer.",
              stars: 5,
            },
            {
              name: "Ananya Gupta",
              role: "Social Media Manager",
              text: "We manage 8 client accounts and ClipMint handles all our short-form content now. The batch processing and API access on the Pro plan make it seamless.",
              stars: 5,
            },
          ].map((t) => (
            <div
              key={t.name}
              className="glass-card"
              style={{ padding: 28 }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  marginBottom: 16,
                }}
              >
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    fill="var(--accent-orange)"
                    style={{ color: "var(--accent-orange)" }}
                  />
                ))}
              </div>
              <Quote
                size={20}
                style={{
                  color: "var(--accent-primary)",
                  opacity: 0.3,
                  marginBottom: 8,
                }}
              />
              <p
                style={{
                  color: "var(--text-secondary)",
                  lineHeight: 1.7,
                  fontSize: 15,
                  marginBottom: 20,
                }}
              >
                {t.text}
              </p>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {t.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </RevealSection>

      {/* ═══ 8. FAQ ═══ */}
      <RevealSection
        style={{
          padding: "100px 24px",
          background:
            "linear-gradient(180deg, transparent 0%, rgba(108,92,231,0.02) 50%, transparent 100%)",
        }}
      >
        <h2 className="section-heading">
          Frequently Asked <span className="gradient-text">Questions</span>
        </h2>
        <p className="section-subheading">
          Everything you need to know about ClipMint.
        </p>
        <FAQ />
      </RevealSection>

      {/* ═══ 9. CTA BANNER ═══ */}
      <RevealSection
        style={{
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            padding: "64px 40px",
            borderRadius: 24,
            background:
              "linear-gradient(135deg, rgba(108, 92, 231, 0.15) 0%, rgba(0, 229, 255, 0.08) 100%)",
            border: "1px solid rgba(108, 92, 231, 0.2)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div className="gradient-mesh" />
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 800,
              marginBottom: 16,
              position: "relative",
              zIndex: 1,
            }}
          >
            Ready to <span className="gradient-text">10x Your Content</span>?
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 18,
              marginBottom: 32,
              position: "relative",
              zIndex: 1,
            }}
          >
            Join 500+ creators already using ClipMint. Start free — no credit
            card required.
          </p>
          <Link
            href="/login"
            className="btn-primary"
            style={{
              padding: "16px 40px",
              fontSize: 17,
              position: "relative",
              zIndex: 1,
            }}
          >
            <Sparkles size={18} /> Get Started for Free
          </Link>
        </div>
      </RevealSection>

      {/* ═══ 10. FOOTER ═══ */}
      <Footer />
    </main>
  );
}
