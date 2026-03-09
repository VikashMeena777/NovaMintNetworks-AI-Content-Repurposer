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
    AlertCircle,
    Clapperboard,
    ChevronDown,
    X,
} from "lucide-react";

type FilterOption = JobStatus | "all" | "processing";

const FILTER_OPTIONS: { value: FilterOption; label: string; color: string }[] = [
    { value: "all", label: "All Jobs", color: "var(--text-secondary)" },
    { value: "queued", label: "Queued", color: "#6B7280" },
    { value: "processing", label: "Processing", color: "#F59E0B" },
    { value: "done", label: "Completed", color: "#10B981" },
    { value: "failed", label: "Failed", color: "#EF4444" },
];

export default function JobsPage() {
    const supabase = createClient();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<FilterOption>("all");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function loadJobs() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("jobs")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (data && !error) setJobs(data as Job[]);
            setLoading(false);
        }
        loadJobs();

        // Real-time updates
        const channel = supabase
            .channel("jobs-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "jobs" },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        setJobs((prev) => [payload.new as Job, ...prev]);
                    } else if (payload.eventType === "UPDATE") {
                        setJobs((prev) =>
                            prev.map((j) =>
                                j.id === (payload.new as Job).id
                                    ? (payload.new as Job)
                                    : j
                            )
                        );
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setShowFilterDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const PROCESSING_STATUSES: JobStatus[] = ["downloading", "transcribing", "analyzing", "clipping", "captioning", "uploading"];

    const filteredJobs = jobs.filter((j) => {
        // Status filter
        if (statusFilter !== "all") {
            if (statusFilter === "processing") {
                if (!PROCESSING_STATUSES.includes(j.status)) return false;
            } else {
                if (j.status !== statusFilter) return false;
            }
        }
        // Search filter
        if (search) {
            const q = search.toLowerCase();
            return (
                (j.video_url || "").toLowerCase().includes(q) ||
                j.caption_style.toLowerCase().includes(q) ||
                (j.video_filename || "").toLowerCase().includes(q)
            );
        }
        return true;
    });

    const totalJobs = jobs.length;
    const processing = jobs.filter(
        (j) => !["done", "failed", "queued", "cancelled"].includes(j.status)
    ).length;
    const completed = jobs.filter((j) => j.status === "done").length;
    const totalClips = jobs.reduce((sum, j) => sum + (j.clips_count || 0), 0);

    const activeFilterLabel = FILTER_OPTIONS.find((f) => f.value === statusFilter);

    return (
        <div>
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 32,
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: 28,
                            fontWeight: 800,
                            color: "var(--text-primary)",
                            marginBottom: 4,
                        }}
                    >
                        My Jobs
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
                        Track your video processing jobs and manage clips
                    </p>
                </div>
                <Link
                    href="/dashboard/new"
                    className="btn-primary"
                    style={{
                        textDecoration: "none",
                        padding: "12px 24px",
                        fontSize: 15,
                        gap: 8,
                    }}
                >
                    <Plus size={18} /> New Video
                </Link>
            </div>

            {/* Stats */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 16,
                    marginBottom: 32,
                }}
            >
                {[
                    {
                        label: "Total Jobs",
                        value: totalJobs,
                        icon: Film,
                        color: "var(--accent-primary)",
                    },
                    {
                        label: "Processing",
                        value: processing,
                        icon: Clock,
                        color: "#F59E0B",
                    },
                    {
                        label: "Completed",
                        value: completed,
                        icon: CheckCircle2,
                        color: "#10B981",
                    },
                    {
                        label: "Clips Generated",
                        value: totalClips,
                        icon: Clapperboard,
                        color: "#06B6D4",
                    },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="glass-card"
                        style={{ padding: "20px 24px" }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 8,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 13,
                                    color: "var(--text-muted)",
                                    fontWeight: 500,
                                }}
                            >
                                {stat.label}
                            </span>
                            <stat.icon size={18} style={{ color: stat.color }} />
                        </div>
                        <div
                            style={{
                                fontSize: 32,
                                fontWeight: 800,
                                color: "var(--text-primary)",
                            }}
                        >
                            {loading ? "—" : stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Search + Filter */}
            <div
                style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 24,
                }}
            >
                <div style={{ flex: 1, position: "relative" }}>
                    <Search
                        size={16}
                        style={{
                            position: "absolute",
                            left: 14,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--text-muted)",
                        }}
                    />
                    <input
                        className="input"
                        placeholder="Search jobs..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: 40 }}
                    />
                </div>
                <div ref={filterRef} style={{ position: "relative" }}>
                    <button
                        className="btn-secondary"
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        style={{
                            gap: 8,
                            minWidth: 130,
                            justifyContent: "center",
                            border: statusFilter !== "all" ? "1px solid var(--accent-primary)" : undefined,
                            background: statusFilter !== "all" ? "rgba(108,92,231,0.1)" : undefined,
                        }}
                    >
                        <Filter size={16} />
                        {statusFilter === "all" ? "Filter" : activeFilterLabel?.label}
                        {statusFilter !== "all" ? (
                            <X
                                size={14}
                                style={{ marginLeft: 4, cursor: "pointer" }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setStatusFilter("all");
                                    setShowFilterDropdown(false);
                                }}
                            />
                        ) : (
                            <ChevronDown size={14} />
                        )}
                    </button>

                    {/* Filter Dropdown */}
                    {showFilterDropdown && (
                        <div
                            style={{
                                position: "absolute",
                                top: "calc(100% + 6px)",
                                right: 0,
                                minWidth: 180,
                                background: "var(--bg-card)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: 12,
                                padding: 6,
                                zIndex: 50,
                                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                            }}
                        >
                            {FILTER_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setStatusFilter(option.value);
                                        setShowFilterDropdown(false);
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: 8,
                                        border: "none",
                                        background: statusFilter === option.value ? "rgba(108,92,231,0.15)" : "transparent",
                                        color: statusFilter === option.value ? "var(--text-primary)" : "var(--text-secondary)",
                                        cursor: "pointer",
                                        fontSize: 13,
                                        fontWeight: statusFilter === option.value ? 600 : 400,
                                        transition: "all 0.15s ease",
                                        textAlign: "left",
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            background: option.color,
                                            flexShrink: 0,
                                        }}
                                    />
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Jobs list */}
            {loading ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: 60,
                        color: "var(--text-muted)",
                    }}
                >
                    <Clock
                        size={32}
                        style={{
                            animation: "spin 2s linear infinite",
                            marginBottom: 12,
                        }}
                    />
                    <p>Loading jobs...</p>
                </div>
            ) : filteredJobs.length === 0 ? (
                <div
                    className="glass-card"
                    style={{
                        textAlign: "center",
                        padding: 60,
                    }}
                >
                    <Film
                        size={48}
                        style={{
                            color: "var(--text-muted)",
                            marginBottom: 16,
                        }}
                    />
                    <h3
                        style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            marginBottom: 8,
                        }}
                    >
                        {statusFilter !== "all" ? "No matching jobs" : "No jobs yet"}
                    </h3>
                    <p
                        style={{
                            color: "var(--text-muted)",
                            fontSize: 14,
                            marginBottom: 24,
                        }}
                    >
                        {statusFilter !== "all"
                            ? "Try a different filter or clear your search"
                            : "Upload your first video to get started"}
                    </p>
                    {statusFilter === "all" && (
                        <Link
                            href="/dashboard/new"
                            className="btn-primary"
                            style={{ textDecoration: "none", gap: 8 }}
                        >
                            <Plus size={16} /> Upload Video
                        </Link>
                    )}
                </div>
            ) : (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}
                >
                    {filteredJobs.map((job) => {
                        const statusInfo = JOB_STATUS_LABELS[job.status];
                        return (
                            <Link
                                key={job.id}
                                href={`/dashboard/${job.id}`}
                                className="glass-card"
                                style={{
                                    padding: "20px 24px",
                                    textDecoration: "none",
                                    color: "inherit",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    transition: "border-color 0.2s",
                                    cursor: "pointer",
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            fontSize: 15,
                                            fontWeight: 600,
                                            color: "var(--text-primary)",
                                            marginBottom: 4,
                                        }}
                                    >
                                        {job.video_url ||
                                            job.video_filename ||
                                            "Untitled"}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        Style: {job.caption_style} •{" "}
                                        {new Date(
                                            job.created_at
                                        ).toLocaleDateString()}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 16,
                                    }}
                                >
                                    {job.status !== "done" &&
                                        job.status !== "failed" &&
                                        job.status !== "queued" &&
                                        job.status !== "cancelled" && (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                }}
                                            >
                                                <div
                                                    className="progress-bar"
                                                    style={{ width: 80 }}
                                                >
                                                    <div
                                                        className="progress-bar-fill"
                                                        style={{
                                                            width: `${job.progress}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span
                                                    style={{
                                                        fontSize: 12,
                                                        color: "var(--text-muted)",
                                                    }}
                                                >
                                                    {job.progress}%
                                                </span>
                                            </div>
                                        )}

                                    {job.clips_count > 0 && (
                                        <span
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: "#10B981",
                                            }}
                                        >
                                            {job.clips_count} clips
                                        </span>
                                    )}

                                    <span
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                            padding: "4px 12px",
                                            borderRadius: 20,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: statusInfo.color,
                                            background: `${statusInfo.color}15`,
                                            border: `1px solid ${statusInfo.color}30`,
                                        }}
                                    >
                                        {statusInfo.emoji} {statusInfo.label}
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
