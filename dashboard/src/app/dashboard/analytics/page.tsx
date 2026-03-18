"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Clip, Job } from "@/lib/types";
import {
    BarChart3, TrendingUp, Film, Clock, Calendar, Loader2,
    Star, Hash, Sparkles, Play,
} from "lucide-react";

interface Stats {
    totalVideos: number;
    totalClips: number;
    avgViralScore: number;
    topClips: Clip[];
    clipsByDay: Record<string, number>;
    clipsByStyle: Record<string, number>;
    heatmap: Record<string, number>;
}

type TimeRange = "7d" | "30d" | "90d" | "all";

function getDaysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDate(d: Date): string {
    return d.toISOString().split("T")[0];
}

/* ─── Mini Donut Chart ─── */
function StyleDonut({ data }: { data: Record<string, number> }) {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    if (total === 0) return null;

    const COLORS = [
        "var(--accent-primary)", "var(--accent-green)", "var(--accent-orange)",
        "var(--accent-cyan)", "var(--accent-red)", "var(--accent-secondary)",
        "#F472B6", "#A78BFA", "#34D399",
    ];

    const size = 140;
    const strokeWidth = 18;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let cumulativeOffset = 0;

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                    {entries.map(([style, count], i) => {
                        const pct = count / total;
                        const dash = pct * circumference;
                        const offset = cumulativeOffset;
                        cumulativeOffset += dash;
                        return (
                            <circle
                                key={style}
                                cx={size / 2} cy={size / 2} r={radius}
                                fill="none" stroke={COLORS[i % COLORS.length]}
                                strokeWidth={strokeWidth}
                                strokeDasharray={`${dash} ${circumference - dash}`}
                                strokeDashoffset={-offset}
                                strokeLinecap="butt"
                                style={{ transition: "all 0.6s ease" }}
                            />
                        );
                    })}
                </svg>
                <span style={{ position: "absolute", fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
                    {total}
                </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {entries.slice(0, 6).map(([style, count], i) => (
                    <div key={style} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{style}</span>
                        <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>
                            {count} ({Math.round((count / total) * 100)}%)
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── Activity Heatmap (GitHub-style) ─── */
function ActivityHeatmap({ data }: { data: Record<string, number> }) {
    const today = new Date();
    const days: { date: string; count: number; dayName: string }[] = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = formatDate(d);
        days.push({ date: key, count: data[key] || 0, dayName: d.toLocaleDateString("en", { weekday: "short" }) });
    }

    const maxCount = Math.max(...days.map(d => d.count), 1);

    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(15, 1fr)", gap: 3, marginBottom: 8 }}>
                {days.map((day) => {
                    const intensity = day.count / maxCount;
                    const bg = day.count === 0
                        ? "var(--bg-secondary)"
                        : `rgba(108, 92, 231, ${0.2 + intensity * 0.8})`;
                    return (
                        <div
                            key={day.date}
                            title={`${day.date}: ${day.count} clip${day.count !== 1 ? "s" : ""}`}
                            style={{
                                aspectRatio: "1", borderRadius: 4,
                                background: bg, cursor: "pointer",
                                transition: "transform 0.2s, box-shadow 0.2s",
                                minWidth: 0,
                            }}
                            onMouseEnter={(e) => {
                                (e.target as HTMLElement).style.transform = "scale(1.2)";
                                (e.target as HTMLElement).style.boxShadow = "0 0 8px rgba(108,92,231,0.4)";
                            }}
                            onMouseLeave={(e) => {
                                (e.target as HTMLElement).style.transform = "scale(1)";
                                (e.target as HTMLElement).style.boxShadow = "none";
                            }}
                        />
                    );
                })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
                <span>30 days ago</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span>Less</span>
                    {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                        <span key={v} style={{
                            width: 10, height: 10, borderRadius: 2,
                            background: v === 0 ? "var(--bg-secondary)" : `rgba(108, 92, 231, ${0.2 + v * 0.8})`,
                        }} />
                    ))}
                    <span>More</span>
                </div>
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    const supabase = createClient();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>("30d");

    useEffect(() => {
        loadStats();
    }, [timeRange]);

    async function loadStats() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Date filter
        let sinceDate: Date | null = null;
        if (timeRange === "7d") sinceDate = getDaysAgo(7);
        else if (timeRange === "30d") sinceDate = getDaysAgo(30);
        else if (timeRange === "90d") sinceDate = getDaysAgo(90);

        // Total videos (within range)
        let jobQuery = supabase.from("jobs").select("*").eq("user_id", user.id);
        if (sinceDate) jobQuery = jobQuery.gte("created_at", sinceDate.toISOString());
        const { data: jobsData } = await jobQuery;
        const jobs = (jobsData || []) as Job[];

        // All clips (within range)
        let clipQuery = supabase.from("clips").select("*").eq("user_id", user.id);
        if (sinceDate) clipQuery = clipQuery.gte("created_at", sinceDate.toISOString());
        const { data: clipsData } = await clipQuery;
        const allClips = (clipsData || []) as Clip[];

        // Top clips (by viral score)
        const topClips = [...allClips].sort((a, b) => (b.viral_score ?? 0) - (a.viral_score ?? 0)).slice(0, 5);

        // Average viral score
        const scoresWithValues = allClips.filter((c) => c.viral_score != null);
        const avgScore = scoresWithValues.length > 0
            ? Math.round(scoresWithValues.reduce((sum, c) => sum + (c.viral_score ?? 0), 0) / scoresWithValues.length)
            : 0;

        // Clips grouped by day (for bar chart)
        const clipsByDay: Record<string, number> = {};
        allClips.forEach((clip) => {
            const day = formatDate(new Date(clip.created_at));
            clipsByDay[day] = (clipsByDay[day] || 0) + 1;
        });

        // Clips by caption style (for donut)
        const clipsByStyle: Record<string, number> = {};
        jobs.forEach((job) => {
            const style = job.caption_style || "unknown";
            clipsByStyle[style] = (clipsByStyle[style] || 0) + (job.clips_count || 0);
        });

        // 30-day heatmap
        const heatmap: Record<string, number> = {};
        allClips.forEach((clip) => {
            const day = formatDate(new Date(clip.created_at));
            heatmap[day] = (heatmap[day] || 0) + 1;
        });

        setStats({
            totalVideos: jobs.length,
            totalClips: allClips.length,
            avgViralScore: avgScore,
            topClips,
            clipsByDay,
            clipsByStyle,
            heatmap,
        });
        setLoading(false);
    }

    /* Build chart bars from clipsByDay data */
    function renderChart() {
        if (!stats) return null;

        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 60;
        const bars: { date: string; count: number; label: string }[] = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = formatDate(d);
            bars.push({
                date: key,
                count: stats.clipsByDay[key] || 0,
                label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
            });
        }

        const maxCount = Math.max(...bars.map((b) => b.count), 1);

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{
                    height: 200, display: "flex", alignItems: "flex-end",
                    gap: days > 30 ? 2 : 4, padding: "0 4px",
                }}>
                    {bars.map((bar, i) => {
                        const height = bar.count === 0 ? 3 : Math.max(8, (bar.count / maxCount) * 100);
                        return (
                            <div
                                key={bar.date}
                                title={`${bar.label}: ${bar.count} clip${bar.count !== 1 ? "s" : ""}`}
                                style={{
                                    flex: 1, height: `${height}%`,
                                    background: bar.count > 0 ? "var(--gradient-hero)" : "var(--bg-secondary)",
                                    borderRadius: "4px 4px 0 0",
                                    minWidth: 2,
                                    transition: "height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                                    cursor: "pointer",
                                    opacity: bar.count > 0 ? 0.7 + (bar.count / maxCount) * 0.3 : 0.3,
                                }}
                                onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
                                onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = bar.count > 0 ? String(0.7 + (bar.count / maxCount) * 0.3) : "0.3"; }}
                            />
                        );
                    })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
                    <span>{bars[0]?.label}</span>
                    <span>{bars[Math.floor(bars.length / 2)]?.label}</span>
                    <span>{bars[bars.length - 1]?.label}</span>
                </div>
            </div>
        );
    }

    const s = stats;

    const statCards = s ? [
        { label: "Total Videos", value: s.totalVideos, icon: Film, color: "var(--accent-primary)", bg: "rgba(108,92,231,0.12)" },
        { label: "Clips Generated", value: s.totalClips, icon: Play, color: "var(--accent-green)", bg: "rgba(0,230,118,0.12)" },
        { label: "Avg Viral Score", value: s.avgViralScore > 0 ? s.avgViralScore : "—", icon: TrendingUp, color: "var(--accent-orange)", bg: "rgba(255,145,0,0.12)" },
        { label: "Top Score", value: s.topClips.length > 0 ? (s.topClips[0].viral_score ?? "—") : "—", icon: Star, color: "var(--accent-cyan)", bg: "rgba(0,229,255,0.12)" },
    ] : [];

    return (
        <div>
            {/* ─── Header + Time Range ─── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 800, marginBottom: 4 }}>
                        Analytics
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                        Track your content performance and usage
                    </p>
                </div>
                <div className="tab-nav" style={{ marginBottom: 0 }}>
                    {(["7d", "30d", "90d", "all"] as TimeRange[]).map((range) => (
                        <button
                            key={range}
                            className={`tab-item ${timeRange === range ? "active" : ""}`}
                            onClick={() => setTimeRange(range)}
                            style={{ padding: "6px 14px", fontSize: 12 }}
                        >
                            {range === "all" ? "All" : range}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div>
                    <div className="dash-grid-4" style={{ marginBottom: 24 }}>
                        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
                    </div>
                    <div className="skeleton" style={{ height: 260, borderRadius: 16, marginBottom: 24 }} />
                    <div className="dash-grid-2">
                        <div className="skeleton" style={{ height: 240, borderRadius: 16 }} />
                        <div className="skeleton" style={{ height: 240, borderRadius: 16 }} />
                    </div>
                </div>
            ) : (
                <>
                    {/* ─── Stat Cards ─── */}
                    <div className="dash-grid-4" style={{ marginBottom: 24 }}>
                        {statCards.map((stat) => (
                            <div key={stat.label} className="stat-card">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{stat.label}</span>
                                    <div className="stat-icon-bg" style={{ background: stat.bg }}>
                                        <stat.icon size={18} style={{ color: stat.color }} />
                                    </div>
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800 }}>{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* ─── Activity Chart ─── */}
                    <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                            <BarChart3 size={18} style={{ color: "var(--accent-primary)" }} />
                            Clips Activity
                        </h3>
                        {s && s.totalClips === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                                <BarChart3 size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                                <p style={{ fontSize: 14 }}>No data yet. Submit your first video to see analytics.</p>
                            </div>
                        ) : (
                            renderChart()
                        )}
                    </div>

                    {/* ─── Usage Breakdown + Heatmap ─── */}
                    <div className="dash-grid-2" style={{ marginBottom: 24 }}>
                        {/* Caption Style Distribution */}
                        <div className="glass-card" style={{ padding: 28 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                                <Hash size={18} style={{ color: "var(--accent-primary)" }} />
                                Style Distribution
                            </h3>
                            {s && Object.keys(s.clipsByStyle).length === 0 ? (
                                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>
                                    No data yet
                                </div>
                            ) : (
                                s && <StyleDonut data={s.clipsByStyle} />
                            )}
                        </div>

                        {/* 30-Day Heatmap */}
                        <div className="glass-card" style={{ padding: 28 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                                <Calendar size={18} style={{ color: "var(--accent-primary)" }} />
                                Activity Calendar
                            </h3>
                            {s && <ActivityHeatmap data={s.heatmap} />}
                        </div>
                    </div>

                    {/* ─── Top Viral Clips Leaderboard ─── */}
                    <div className="glass-card" style={{ padding: 28 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                            <Sparkles size={18} style={{ color: "var(--accent-primary)" }} />
                            Top Performing Clips
                        </h3>
                        {s && s.topClips.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)" }}>
                                <p style={{ fontSize: 14 }}>No clips yet. Your top performers will appear here.</p>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {s?.topClips.map((clip, i) => (
                                    <div
                                        key={clip.id}
                                        className="animate-fade-in-up"
                                        style={{
                                            display: "flex", alignItems: "center", gap: 14,
                                            padding: "14px 18px", borderRadius: 12,
                                            background: "var(--bg-secondary)",
                                            border: "1px solid var(--border-subtle)",
                                            transition: "all 0.2s ease",
                                            animationDelay: `${i * 0.06}s`,
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-primary)";
                                            (e.currentTarget as HTMLElement).style.transform = "translateX(4px)";
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
                                            (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                                        }}
                                    >
                                        {/* Rank */}
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 8,
                                            background: i === 0 ? "rgba(255,215,0,0.15)" : i === 1 ? "rgba(192,192,192,0.12)" : i === 2 ? "rgba(205,127,50,0.12)" : "var(--bg-card)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 13, fontWeight: 800,
                                            color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "var(--text-muted)",
                                            flexShrink: 0,
                                        }}>
                                            #{i + 1}
                                        </div>

                                        {/* Thumbnail */}
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 8, flexShrink: 0, overflow: "hidden",
                                            background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center",
                                        }}>
                                            {clip.thumbnail_url ? (
                                                <img src={clip.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            ) : (
                                                <Film size={18} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {clip.title || `Clip ${clip.clip_index + 1}`}
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                                                {clip.duration_seconds && <span>{Math.round(clip.duration_seconds)}s</span>}
                                            </div>
                                        </div>

                                        {/* Score bar */}
                                        {clip.viral_score != null && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                                <div style={{ width: 80, height: 6, borderRadius: 3, background: "var(--bg-primary)", overflow: "hidden" }}>
                                                    <div style={{
                                                        height: "100%", borderRadius: 3,
                                                        width: `${clip.viral_score}%`,
                                                        background: clip.viral_score >= 80 ? "var(--accent-green)" : clip.viral_score >= 50 ? "var(--accent-orange)" : "var(--accent-red)",
                                                        transition: "width 0.6s ease",
                                                    }} />
                                                </div>
                                                <span style={{
                                                    fontSize: 14, fontWeight: 800, minWidth: 32, textAlign: "right",
                                                    color: clip.viral_score >= 80 ? "var(--accent-green)" : clip.viral_score >= 50 ? "var(--accent-orange)" : "var(--accent-red)",
                                                }}>
                                                    {clip.viral_score}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
