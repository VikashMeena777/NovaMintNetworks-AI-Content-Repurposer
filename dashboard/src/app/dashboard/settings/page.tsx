"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { CAPTION_STYLES, PLAN_LIMITS, type CaptionStyle } from "@/lib/types";
import { Settings, User, Bell, Palette, Shield, Save, Loader2 } from "lucide-react";

export default function SettingsPage() {
    const supabase = createClient();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [defaultStyle, setDefaultStyle] = useState<CaptionStyle>("hormozi");
    const [notifications, setNotifications] = useState({
        discord: true,
        email: false,
        jobComplete: true,
        jobFailed: true,
        weeklyReport: false,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setEmail(user.email ?? "");

            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (data) {
                const p = data as Profile;
                setProfile(p);
                setFullName(p.full_name ?? "");
            }
            setLoading(false);
        }
        load();
    }, [supabase]);

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        setError(null);

        const { error: updateError } = await supabase
            .from("profiles")
            .update({ full_name: fullName.trim() })
            .eq("id", profile.id);

        if (updateError) {
            setError(updateError.message);
        } else {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
                <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent-primary)" }} />
            </div>
        );
    }

    const planKey = profile?.plan ?? "free";
    const planInfo = PLAN_LIMITS[planKey];

    return (
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Settings</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 40 }}>
                Manage your account and preferences
            </p>

            {/* ─── Profile ─── */}
            <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <User size={18} style={{ color: "var(--accent-primary)" }} /> Profile
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Full Name</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Email</label>
                        <input type="email" value={email} disabled className="input-field" style={{ opacity: 0.6, cursor: "not-allowed" }} />
                    </div>
                </div>
            </div>

            {/* ─── Default Caption Style ─── */}
            <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <Palette size={18} style={{ color: "var(--accent-primary)" }} /> Default Style
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {CAPTION_STYLES.map((style) => (
                        <button
                            key={style.value}
                            onClick={() => setDefaultStyle(style.value)}
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: `1px solid ${defaultStyle === style.value ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                                background: defaultStyle === style.value ? "rgba(108,92,231,0.15)" : "transparent",
                                cursor: "pointer",
                                textAlign: "left",
                                transition: "all 0.2s",
                            }}
                        >
                            <span style={{ fontSize: 13, fontWeight: 600, color: defaultStyle === style.value ? "var(--text-primary)" : "var(--text-secondary)" }}>
                                {style.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Notifications ─── */}
            <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <Bell size={18} style={{ color: "var(--accent-primary)" }} /> Notifications
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {[
                        { key: "discord" as const, label: "Discord Notifications", desc: "Get notified via Discord webhook" },
                        { key: "email" as const, label: "Email Notifications", desc: "Receive email for completed jobs" },
                        { key: "jobComplete" as const, label: "Job Completed", desc: "Notify when processing finishes" },
                        { key: "jobFailed" as const, label: "Job Failed", desc: "Alert on processing errors" },
                        { key: "weeklyReport" as const, label: "Weekly Report", desc: "Summary of clips and performance" },
                    ].map((item) => (
                        <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.desc}</div>
                            </div>
                            <button
                                onClick={() => setNotifications((n) => ({ ...n, [item.key]: !n[item.key] }))}
                                style={{
                                    width: 44,
                                    height: 24,
                                    borderRadius: 12,
                                    border: "none",
                                    background: notifications[item.key] ? "var(--accent-primary)" : "var(--border-subtle)",
                                    cursor: "pointer",
                                    position: "relative",
                                    transition: "background 0.2s",
                                }}
                            >
                                <div style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: "50%",
                                    background: "white",
                                    position: "absolute",
                                    top: 3,
                                    left: notifications[item.key] ? 23 : 3,
                                    transition: "left 0.2s",
                                }} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── Plan Info ─── */}
            <div className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <Shield size={18} style={{ color: "var(--accent-primary)" }} /> Current Plan
                </h3>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 800 }} className="gradient-text">
                            {planKey.charAt(0).toUpperCase() + planKey.slice(1)} Plan
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                            {profile ? `${profile.clips_used}/${profile.clips_limit} clips · ${profile.videos_used}/${profile.videos_limit} videos` : `${planInfo.clips} clips / ${planInfo.videos} video per month`}
                        </div>
                    </div>
                    <button className="btn-primary">Upgrade</button>
                </div>
            </div>

            {/* ─── Error ─── */}
            {error && (
                <div style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#EF4444",
                    fontSize: 13,
                    marginBottom: 16,
                }}>
                    {error}
                </div>
            )}

            {/* ─── Save ─── */}
            <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ width: "100%", justifyContent: "center", padding: "14px 24px", fontSize: 16 }}
            >
                {saving ? (
                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                    <><Save size={18} /> {saved ? "✓ Saved!" : "Save Changes"}</>
                )}
            </button>
        </div>
    );
}
