"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Mail, MapPin, Clock, Send } from "lucide-react";
import { useState } from "react";

export default function ContactPage() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSending(true);
        setError("");

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error("Failed to send");
            setSent(true);
            setForm({ name: "", email: "", subject: "", message: "" });
        } catch {
            setError(
                "Failed to send message. Please email us directly at ClipMint.Support@gmail.com"
            );
        } finally {
            setSending(false);
        }
    }

    return (
        <main>
            <Navbar />

            <div
                style={{
                    maxWidth: 1000,
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
                        Get In <span className="gradient-text">Touch</span>
                    </h1>
                    <p
                        style={{
                            fontSize: 18,
                            color: "var(--text-secondary)",
                            maxWidth: 500,
                            margin: "0 auto",
                            lineHeight: 1.6,
                        }}
                    >
                        Have a question, suggestion, or need help? We{"'"}d love to hear
                        from you.
                    </p>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                        gap: 40,
                    }}
                >
                    {/* Contact info */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {[
                            {
                                icon: <Mail size={22} />,
                                title: "Email",
                                value: "ClipMint.Support@gmail.com",
                                href: "mailto:ClipMint.Support@gmail.com",
                            },
                            {
                                icon: <MapPin size={22} />,
                                title: "Address",
                                value: "Jaipur, Rajasthan, India",
                            },
                            {
                                icon: <Send size={22} />,
                                title: "Founder",
                                value: "VIKASH MEENA",
                            },
                            {
                                icon: <Clock size={22} />,
                                title: "Support Hours",
                                value: "Mon – Sat, 10 AM – 7 PM IST",
                            },
                        ].map((info) => (
                            <div
                                key={info.title}
                                className="glass-card"
                                style={{
                                    padding: 24,
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 16,
                                }}
                            >
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: "rgba(108, 92, 231, 0.12)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "var(--accent-primary)",
                                        flexShrink: 0,
                                    }}
                                >
                                    {info.icon}
                                </div>
                                <div>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            color: "var(--text-muted)",
                                            marginBottom: 4,
                                            textTransform: "uppercase",
                                            letterSpacing: 0.5,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {info.title}
                                    </div>
                                    {info.href ? (
                                        <a
                                            href={info.href}
                                            style={{
                                                color: "var(--accent-secondary)",
                                                textDecoration: "none",
                                                fontSize: 15,
                                                fontWeight: 500,
                                            }}
                                        >
                                            {info.value}
                                        </a>
                                    ) : (
                                        <div style={{ fontSize: 15, fontWeight: 500 }}>
                                            {info.value}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        <div
                            className="glass-card"
                            style={{
                                padding: 24,
                                background:
                                    "linear-gradient(135deg, rgba(108, 92, 231, 0.08) 0%, rgba(0, 229, 255, 0.04) 100%)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    marginBottom: 8,
                                }}
                            >
                                Follow us
                            </div>
                            <a
                                href="https://instagram.com/clipmintapp"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: "var(--accent-secondary)",
                                    textDecoration: "none",
                                    fontSize: 14,
                                }}
                            >
                                @ClipMintApp on Instagram →
                            </a>
                        </div>
                    </div>

                    {/* Contact form */}
                    <div className="glass-card" style={{ padding: 32 }}>
                        {sent ? (
                            <div
                                style={{
                                    textAlign: "center",
                                    padding: "60px 20px",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 48,
                                        marginBottom: 16,
                                    }}
                                >
                                    ✉️
                                </div>
                                <h3
                                    style={{
                                        fontSize: 22,
                                        fontWeight: 700,
                                        marginBottom: 8,
                                    }}
                                >
                                    Message Sent!
                                </h3>
                                <p style={{ color: "var(--text-secondary)" }}>
                                    We{"'"}ll get back to you within 24 hours.
                                </p>
                                <button
                                    className="btn-secondary"
                                    style={{ marginTop: 24 }}
                                    onClick={() => setSent(false)}
                                >
                                    Send Another
                                </button>
                            </div>
                        ) : (
                            <form
                                onSubmit={handleSubmit}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 20,
                                }}
                            >
                                <h3
                                    style={{
                                        fontSize: 20,
                                        fontWeight: 700,
                                        marginBottom: 4,
                                    }}
                                >
                                    Send us a message
                                </h3>

                                <div>
                                    <label
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: "var(--text-secondary)",
                                            marginBottom: 6,
                                            display: "block",
                                        }}
                                    >
                                        Your Name
                                    </label>
                                    <input
                                        className="input-field"
                                        placeholder="John Doe"
                                        value={form.name}
                                        onChange={(e) =>
                                            setForm({ ...form, name: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div>
                                    <label
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: "var(--text-secondary)",
                                            marginBottom: 6,
                                            display: "block",
                                        }}
                                    >
                                        Email Address
                                    </label>
                                    <input
                                        className="input-field"
                                        type="email"
                                        placeholder="john@example.com"
                                        value={form.email}
                                        onChange={(e) =>
                                            setForm({ ...form, email: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div>
                                    <label
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: "var(--text-secondary)",
                                            marginBottom: 6,
                                            display: "block",
                                        }}
                                    >
                                        Subject
                                    </label>
                                    <input
                                        className="input-field"
                                        placeholder="How can we help?"
                                        value={form.subject}
                                        onChange={(e) =>
                                            setForm({ ...form, subject: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div>
                                    <label
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: "var(--text-secondary)",
                                            marginBottom: 6,
                                            display: "block",
                                        }}
                                    >
                                        Message
                                    </label>
                                    <textarea
                                        className="input-field"
                                        placeholder="Tell us what's on your mind..."
                                        value={form.message}
                                        onChange={(e) =>
                                            setForm({ ...form, message: e.target.value })
                                        }
                                        required
                                        rows={5}
                                    />
                                </div>

                                {error && (
                                    <p
                                        style={{
                                            color: "var(--accent-red)",
                                            fontSize: 14,
                                        }}
                                    >
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={sending}
                                    style={{ justifyContent: "center", padding: "14px 28px" }}
                                >
                                    {sending ? (
                                        "Sending..."
                                    ) : (
                                        <>
                                            <Send size={16} /> Send Message
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
}
