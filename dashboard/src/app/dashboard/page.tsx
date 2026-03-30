"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import type { Job, JobStatus } from "@/lib/types";
import { JOB_STATUS_LABELS } from "@/lib/types";
import {
    Film,
    Search,
    Filter,
    Plus,
    Clock,
    CheckCircle2,
    Clapperboard,
    ChevronDown,
    X,
    TrendingUp,
} from "lucide-react";

type FilterOption = JobStatus | "all" | "processing";

const FILTER_OPTIONS: { value: FilterOption; label: string; color: string }[] = [
    { value: "all", label: "All Jobs", color: "var(--text-secondary)" },
    { value: "queued", label: "Queued", color: "#6B7280" },
    { value: "processing", label: "Processing", color: "#F59E0B" },
    { value: "done", label: "Completed", color: "#10B981" },
    { value: "failed", label: "Failed", color: "#EF4444" },
];

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

function timeAgo(date: string): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
}

export default function JobsPage() {
    const supabase = createClient();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<FilterOption>("all");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [userName, setUserName] = useState("");
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function loadJobs() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Load name for greeting
            const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
            if (profile?.full_name) setUserName(profile.full_name.split(" ")[0]);

            const { data, error } = await supabase
                .from("jobs")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (data && !error) setJobs(data as Job[]);
            setLoading(false);
        }
        loadJobs();

        const channel = supabase
            .channel("jobs-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, (payload) => {
                if (payload.eventType === "INSERT") {
                    setJobs((prev) => [payload.new as Job, ...prev]);
                } else if (payload.eventType === "UPDATE") {
                    setJobs((prev) => prev.map((j) => j.id === (payload.new as Job).id ? (payload.new as Job) : j));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterDropdown(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const PROCESSING_STATUSES: JobStatus[] = ["downloading", "transcribing", "analyzing", "clipping", "captioning", "uploading"];

    const filteredJobs = jobs.filter((j) => {
        if (statusFilter !== "all") {
            if (statusFilter === "processing") {
                if (!PROCESSING_STATUSES.includes(j.status)) return false;
            } else {
                if (j.status !== statusFilter) return false;
            }
        }
        if (search) {
            const q = search.toLowerCase();
            return (j.video_url || "").toLowerCase().includes(q) || j.caption_style.toLowerCase().includes(q) || (j.video_filename || "").toLowerCase().includes(q);
        }
        return true;
    });

    const totalJobs = jobs.length;
    const processing = jobs.filter((j) => !["done", "failed", "queued", "cancelled"].includes(j.status)).length;
    const completed = jobs.filter((j) => j.status === "done").length;
    const totalClips = jobs.reduce((sum, j) => sum + (j.clips_count || 0), 0);

    const activeFilterLabel = FILTER_OPTIONS.find((f) => f.value === statusFilter);

    const statCards = [
        { label: "Total Jobs", value: totalJobs, icon: Film, color: "var(--accent-primary)", bg: "rgba(108,92,231,0.12)" },
        { label: "Processing", value: processing, icon: Clock, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
        { label: "Completed", value: completed, icon: CheckCircle2, color: "#10B981", bg: "rgba(16,185,129,0.12)" },
        { label: "Clips Generated", value: totalClips, icon: Clapperboard, color: "#06B6D4", bg: "rgba(6,182,212,0.12)" },
    ];

    return (
        <div>
            {/* ─── Welcome Header ─── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 800, marginBottom: 4 }}>
                        {getGreeting()}{userName ? `, ${userName}` : ""} 👋
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                        Here&apos;s what&apos;s happening with your content today
                    </p>
                </div>
                <Link href="/dashboard/new" className="btn-primary" style={{ textDecoration: "none", padding: "10px 20px", fontSize: 14, gap: 8 }}>
                    <Plus size={16} /> New Video
                </Link>
            </div>

            {/* ─── Stat Cards ─── */}
            <div className="dash-grid-4" style={{ marginBottom: 28 }}>
                {statCards.map((stat) => (
                    <div key={stat.label} className="stat-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{stat.label}</span>
                            <div className="stat-icon-bg" style={{ background: stat.bg }}>
                                <stat.icon size={18} style={{ color: stat.color }} />
                            </div>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                            {loading ? <div className="skeleton" style={{ height: 28, width: 60 }} /> : stat.value}
                        </div>
                        {!loading && stat.label === "Completed" && totalJobs > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--accent-green)" }}>
                                <TrendingUp size={12} /> {Math.round((completed / totalJobs) * 100)}% success rate
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ─── Search + Filter ─── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <div style={{ flex: 1, position: "relative" }}>
                    <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input className="input-field" placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 40, padding: "12px 16px 12px 40px" }} />
                </div>
                <div ref={filterRef} style={{ position: "relative" }}>
                    <button
                        className="btn-secondary"
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        style={{
                            gap: 8, minWidth: 120, justifyContent: "center", height: "100%", padding: "10px 16px", fontSize: 13,
                            border: statusFilter !== "all" ? "1px solid var(--accent-primary)" : undefined,
                            background: statusFilter !== "all" ? "rgba(108,92,231,0.1)" : undefined,
                        }}
                    >
                        <Filter size={14} />
                        {statusFilter === "all" ? "Filter" : activeFilterLabel?.label}
                        {statusFilter !== "all" ? (
                            <X size={12} style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setStatusFilter("all"); setShowFilterDropdown(false); }} />
                        ) : <ChevronDown size={12} />}
                    </button>
                    {showFilterDropdown && (
                        <div style={{
                            position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 170,
                            background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                            borderRadius: 12, padding: 5, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                        }}>
                            {FILTER_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setStatusFilter(opt.value); setShowFilterDropdown(false); }}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                                        padding: "9px 12px", borderRadius: 8, border: "none",
                                        background: statusFilter === opt.value ? "rgba(108,92,231,0.15)" : "transparent",
                                        color: statusFilter === opt.value ? "var(--text-primary)" : "var(--text-secondary)",
                                        cursor: "pointer", fontSize: 13, fontWeight: statusFilter === opt.value ? 600 : 400,
                                        transition: "all 0.15s ease", textAlign: "left", fontFamily: "inherit",
                                    }}
                                >
                                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color, flexShrink: 0 }} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Jobs List ─── */}
            {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />
                    ))}
                </div>
            ) : filteredJobs.length === 0 ? (
                <div className="glass-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "80px 20px" }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: 24,
                        background: "rgba(108,92,231,0.1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginBottom: 24
                    }}>
                        <Film size={40} style={{ color: "var(--accent-primary)" }} />
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                        {statusFilter !== "all" ? "No matching jobs" : "No jobs yet"}
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: 15, marginBottom: 32, maxWidth: 300 }}>
                        {statusFilter !== "all" ? "Try a different filter or clear your search" : "Upload your first video to get started"}
                    </p>
                    {statusFilter === "all" && (
                        <Link href="/dashboard/new" className="btn-primary" style={{ textDecoration: "none", gap: 8 }}>
                            <Plus size={16} /> Upload Video
                        </Link>
                    )}
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredJobs.map((job, i) => {
                        const statusInfo = JOB_STATUS_LABELS[job.status];
                        const isProcessing = !["done", "failed", "queued", "cancelled"].includes(job.status);
                        return (
                            <Link
                                key={job.id}
                                href={`/dashboard/${job.id}`}
                                className="glass-card animate-fade-in-up"
                                style={{
                                    padding: "16px 20px", textDecoration: "none", color: "inherit",
                                    display: "flex", alignItems: "center", gap: 16,
                                    animationDelay: `${i * 0.04}s`,
                                }}
                            >
                                {/* Thumbnail placeholder */}
                                <div style={{
                                    width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                                    background: "var(--gradient-card)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    border: "1px solid var(--border-subtle)",
                                }}>
                                    <Film size={20} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {job.video_url || job.video_filename || "Untitled"}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                                        <span>{job.caption_style}</span>
                                        <span style={{ opacity: 0.3 }}>•</span>
                                        <span>{timeAgo(job.created_at)}</span>
                                        {job.clips_count > 0 && (
                                            <>
                                                <span style={{ opacity: 0.3 }}>•</span>
                                                <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>{job.clips_count} clips</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Progress ring or status */}
                                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                                    {isProcessing && (
                                        <div style={{ position: "relative", width: 36, height: 36 }}>
                                            <svg width="36" height="36" style={{ transform: "rotate(-90deg)" }}>
                                                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--bg-secondary)" strokeWidth="3" />
                                                <circle
                                                    cx="18" cy="18" r="14" fill="none" stroke="var(--accent-primary)" strokeWidth="3"
                                                    strokeDasharray={2 * Math.PI * 14} strokeDashoffset={2 * Math.PI * 14 * (1 - (job.progress || 0) / 100)}
                                                    strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease" }}
                                                />
                                            </svg>
                                            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>
                                                {job.progress}%
                                            </span>
                                        </div>
                                    )}
                                    <span style={{
                                        display: "inline-flex", alignItems: "center", gap: 4,
                                        padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                                        color: statusInfo.color,
                                        background: `${statusInfo.color}15`,
                                        border: `1px solid ${statusInfo.color}25`,
                                    }}>
                                        {isProcessing && <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusInfo.color, animation: "pulse-glow 1.5s infinite" }} />}
                                        {statusInfo.label}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
