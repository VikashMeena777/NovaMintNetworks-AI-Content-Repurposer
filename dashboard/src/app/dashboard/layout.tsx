"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { PLAN_LIMITS } from "@/lib/types";
import {
    Film,
    LayoutDashboard,
    Upload,
    Settings,
    Key,
    BarChart3,
    LogOut,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Crown,
} from "lucide-react";

const NAV_ITEMS = [
    { href: "/dashboard", label: "My Jobs", icon: LayoutDashboard },
    { href: "/dashboard/new", label: "New Video", icon: Upload },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/api-keys", label: "API Keys", icon: Key },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

/* ─── Donut SVG ─── */
function DonutMeter({ percent, size = 56, strokeWidth = 5 }: { percent: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
    const color = percent >= 90 ? "var(--accent-red)" : percent >= 70 ? "var(--accent-orange)" : "var(--accent-primary)";

    return (
        <div className="donut-container">
            <svg width={size} height={size}>
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="var(--bg-primary)" strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke={color} strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.8s ease" }}
                />
            </svg>
            <span className="donut-text">{percent}%</span>
        </div>
    );
}

/* ─── Page title map for breadcrumbs ─── */
function getPageTitle(pathname: string): string {
    if (pathname === "/dashboard") return "My Jobs";
    if (pathname === "/dashboard/new") return "New Video";
    if (pathname === "/dashboard/analytics") return "Analytics";
    if (pathname === "/dashboard/api-keys") return "API Keys";
    if (pathname === "/dashboard/settings") return "Settings";
    if (pathname.startsWith("/dashboard/")) return "Job Detail";
    return "Dashboard";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }

            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (data) setProfile(data as Profile);
            setLoading(false);
        }
        loadProfile();
    }, []);

    async function handleSignOut() {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    }

    const planLimit = profile ? PLAN_LIMITS[profile.plan] : PLAN_LIMITS.free;
    const usagePercent = profile ? Math.round((profile.clips_used / planLimit.clips) * 100) : 0;
    const planKey = profile?.plan ?? "free";

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            {/* ═══ Desktop Sidebar ═══ */}
            <aside className={`dash-sidebar ${collapsed ? "collapsed" : ""}`}>
                {/* Logo + Collapse toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", marginBottom: 24 }}>
                    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
                        <img src="/clipmint-logo.jpg" alt="ClipMint" style={{ height: 28, width: 28, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                        {!collapsed && <span className="gradient-text sidebar-label" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>ClipMint</span>}
                    </Link>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6 }}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                {/* User info */}
                {!collapsed && profile && (
                    <div style={{ padding: "12px 12px", marginBottom: 16, borderRadius: 10, background: "var(--bg-card)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: "50%",
                                background: "var(--gradient-hero)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0,
                            }}>
                                {(profile.full_name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div style={{ overflow: "hidden" }}>
                                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {profile.full_name || "User"}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span className={`plan-badge ${planKey}`}>{planKey}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Nav items */}
                <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link key={item.href} href={item.href} className={`sidebar-nav-item ${isActive ? "active" : ""}`}>
                                <div className="sidebar-icon-bg">
                                    <Icon size={18} style={{ color: isActive ? "var(--accent-primary)" : "var(--text-muted)" }} />
                                </div>
                                {!collapsed && <span className="sidebar-label">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Usage meter — Donut */}
                <div className="sidebar-usage-card" style={{
                    padding: 16, borderRadius: 12,
                    background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                    marginBottom: 8,
                }}>
                    {collapsed ? (
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <DonutMeter percent={usagePercent} size={40} strokeWidth={4} />
                        </div>
                    ) : (
                        <div className="sidebar-label">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, letterSpacing: 0.5 }}>
                                    USAGE
                                </span>
                                <DonutMeter percent={usagePercent} size={40} strokeWidth={4} />
                            </div>
                            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                                {loading ? (
                                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                                ) : (
                                    `${profile?.clips_used ?? 0} / ${planLimit.clips} clips`
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Upgrade CTA (only if free plan) */}
                {!collapsed && planKey === "free" && (
                    <Link href="/pricing" className="upgrade-card sidebar-label" style={{ textDecoration: "none", display: "block" }}>
                        <Sparkles size={16} style={{ color: "var(--accent-primary)", margin: "0 auto 6px" }} />
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>Upgrade to Pro</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Unlock unlimited clips</div>
                    </Link>
                )}

                {/* Sign out */}
                <button
                    onClick={handleSignOut}
                    style={{
                        display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
                        gap: 10, padding: "10px 14px", marginTop: 8,
                        background: "none", border: "1px solid var(--border-subtle)",
                        borderRadius: 10, cursor: "pointer", color: "var(--text-muted)",
                        fontSize: 13, transition: "all 0.2s ease", width: "100%",
                    }}
                >
                    <LogOut size={16} />
                    {!collapsed && <span className="sidebar-label">Sign Out</span>}
                </button>
            </aside>

            {/* ═══ Mobile Bottom Nav ═══ */}
            <nav className="dash-bottom-nav">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link key={item.href} href={item.href} className={`bottom-nav-item ${isActive ? "active" : ""}`}>
                            <Icon size={20} />
                            <span>{item.label.split(" ").pop()}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* ═══ Main content ═══ */}
            <main className="dash-main" style={{ flex: 1, marginLeft: collapsed ? 72 : 260, padding: "28px 36px", minHeight: "100vh", transition: "margin-left 0.3s ease" }}>
                {/* Breadcrumb */}
                <div className="breadcrumb" style={{ marginBottom: 20 }}>
                    <Link href="/dashboard">Dashboard</Link>
                    {pathname !== "/dashboard" && (
                        <>
                            <span className="sep">/</span>
                            <span className="current">{getPageTitle(pathname)}</span>
                        </>
                    )}
                </div>
                {children}
            </main>
        </div>
    );
}
