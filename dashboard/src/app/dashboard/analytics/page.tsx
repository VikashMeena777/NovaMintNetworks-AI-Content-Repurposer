"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Clip } from "@/lib/types";
import { BarChart3, TrendingUp, Film, Clock, Calendar, Loader2 } from "lucide-react";

interface Stats {
    totalVideos: number;
    totalClips: number;
    avgViralScore: number;
    topClips: Clip[];
}

export default function AnalyticsPage() {
    const supabase = createClient();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Total videos
            const { count: videoCount } = await supabase
                .from("jobs")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id);

            // Total clips
            const { count: clipCount } = await supabase
                .from("clips")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id);

            // Avg viral score + top clips
            const { data: clipsData } = await supabase
                .from("clips")
                .select("*")
                .eq("user_id", user.id)
                .order("viral_score", { ascending: false })
                .limit(5);

            const clips = (clipsData || []) as Clip[];
            const scoresWithValues = clips.filter((c) => c.viral_score != null);
            const avgScore = scoresWithValues.length > 0
                ? Math.round(scoresWithValues.reduce((sum, c) => sum + (c.viral_score ?? 0), 0) / scoresWithValues.length)
                : 0;

            setStats({
                totalVideos: videoCount ?? 0,
                totalClips: clipCount ?? 0,
                avgViralScore: avgScore,
                topClips: clips,
            });
            setLoading(false);
        }
        loadStats();
    }, [supabase]);

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
                <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent-primary)" }} />
            </div>
        );
    }

    const s = stats!;

    return (
        <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                Analytics
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 32 }}>
                Track your content performance and usage
            </p>

            {/* ─── Overview Stats ─── */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 16,
                    marginBottom: 40,
                }}
            >
                {[
                    { label: "Total Videos", value: String(s.totalVideos), icon: <Film size={20} />, color: "var(--accent-primary)" },
                    { label: "Clips Generated", value: String(s.totalClips), icon: <BarChart3 size={20} />, color: "var(--accent-green)" },
                    { label: "Avg Viral Score", value: s.avgViralScore > 0 ? String(s.avgViralScore) : "—", icon: <TrendingUp size={20} />, color: "var(--accent-orange)" },
                    { label: "Top Clips", value: s.topClips.length > 0 ? String(s.topClips.length) : "—", icon: <Clock size={20} />, color: "var(--accent-cyan)" },
                ].map((stat) => (
                    <div key={stat.label} className="glass-card" style={{ padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <span style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 500 }}>{stat.label}</span>
                            <div style={{ color: stat.color }}>{stat.icon}</div>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* ─── Usage Chart Placeholder ─── */}
            <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
                    <Calendar size={18} style={{ color: "var(--accent-primary)" }} />
                    Activity Overview
                </h3>
                {s.totalClips === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                        <BarChart3 size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                        <p style={{ fontSize: 14 }}>No data yet. Submit your first video to see analytics.</p>
                    </div>
                ) : (
                    <div style={{
                        height: 200,
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 6,
                        padding: "0 8px",
                    }}>
                        {Array.from({ length: 30 }, (_, i) => {
                            const height = Math.max(10, (Math.sin(i * 0.5) + 1) * 40 + (i / 30) * 20);
                            return (
                                <div
                                    key={i}
                                    style={{
                                        flex: 1,
                                        height: `${height}%`,
                                        background: "var(--gradient-hero)",
                                        borderRadius: "4px 4px 0 0",
                                        opacity: 0.6 + (i / 30) * 0.4,
                                        minWidth: 4,
                                        transition: "height 0.3s ease",
                                    }}
                                    title={`Day ${i + 1}`}
                                />
                            );
                        })}
                    </div>
                )}
                {s.totalClips > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                        <span>30 days ago</span>
                        <span>Today</span>
                    </div>
                )}
            </div>

            {/* ─── Top Viral Clips ─── */}
            <div className="glass-card" style={{ padding: 32 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={18} style={{ color: "var(--accent-primary)" }} />
                    Top Performing Clips
                </h3>
                {s.topClips.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)" }}>
                        <p style={{ fontSize: 14 }}>No clips yet. Your top performers will appear here.</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {s.topClips.map((clip, i) => (
                            <div
                                key={clip.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 16,
                                    padding: "12px 16px",
                                    borderRadius: 10,
                                    background: "var(--bg-secondary)",
                                }}
                            >
                                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", width: 28 }}>
                                    #{i + 1}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{clip.title || `Clip ${clip.clip_index + 1}`}</div>
                                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                        {clip.duration_seconds ? `${Math.round(clip.duration_seconds)}s` : "—"}
                                    </div>
                                </div>
                                {clip.viral_score != null && (
                                    <div
                                        style={{
                                            padding: "4px 12px",
                                            borderRadius: 8,
                                            background: clip.viral_score >= 80 ? "rgba(0,230,118,0.15)" : "rgba(255,145,0,0.15)",
                                            color: clip.viral_score >= 80 ? "var(--accent-green)" : "var(--accent-orange)",
                                            fontSize: 14,
                                            fontWeight: 700,
                                        }}
                                    >
                                        {clip.viral_score}/100
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
