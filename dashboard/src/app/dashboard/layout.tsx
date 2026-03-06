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
} from "lucide-react";

const NAV_ITEMS = [
    { href: "/dashboard", label: "My Jobs", icon: LayoutDashboard },
    { href: "/dashboard/new", label: "New Video", icon: Upload },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/api-keys", label: "API Keys", icon: Key },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

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

    const planLimit = profile
        ? PLAN_LIMITS[profile.plan]
        : PLAN_LIMITS.free;
    const usagePercent = profile
        ? Math.round((profile.clips_used / planLimit.clips) * 100)
        : 0;

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            {/* ─── Sidebar ─── */}
            <aside
                style={{
                    width: 260,
                    background: "var(--bg-secondary)",
                    borderRight: "1px solid var(--border-subtle)",
                    padding: "24px 16px",
                    display: "flex",
                    flexDirection: "column",
                    position: "fixed",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    zIndex: 40,
                }}
            >
                {/* Logo */}
                <Link
                    href="/"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "0 12px",
                        marginBottom: 32,
                        textDecoration: "none",
                        color: "inherit",
                    }}
                >
                    <Film
                        size={26}
                        style={{ color: "var(--accent-primary)" }}
                    />
                    <span
                        className="gradient-text"
                        style={{
                            fontSize: 20,
                            fontWeight: 800,
                            letterSpacing: -0.5,
                        }}
                    >
                        ClipMint
                    </span>
                </Link>

                {/* Nav items */}
                <nav
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        flex: 1,
                    }}
                >
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "12px 16px",
                                    borderRadius: 10,
                                    textDecoration: "none",
                                    fontSize: 15,
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive
                                        ? "var(--text-primary)"
                                        : "var(--text-secondary)",
                                    background: isActive
                                        ? "rgba(108, 92, 231, 0.15)"
                                        : "transparent",
                                    border: isActive
                                        ? "1px solid rgba(108, 92, 231, 0.3)"
                                        : "1px solid transparent",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <Icon
                                    size={18}
                                    style={{
                                        color: isActive
                                            ? "var(--accent-primary)"
                                            : "var(--text-muted)",
                                    }}
                                />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Usage meter */}
                <div
                    style={{
                        padding: 16,
                        borderRadius: 12,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            fontWeight: 600,
                            letterSpacing: 0.5,
                            marginBottom: 8,
                        }}
                    >
                        {profile ? profile.plan.toUpperCase() : "FREE"} PLAN
                    </div>
                    <div
                        style={{
                            fontSize: 14,
                            color: "var(--text-secondary)",
                            marginBottom: 8,
                        }}
                    >
                        {loading ? (
                            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                        ) : (
                            `${profile?.clips_used ?? 0} / ${planLimit.clips} clips used`
                        )}
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Sign out */}
                <button
                    onClick={handleSignOut}
                    className="btn-secondary"
                    style={{
                        justifyContent: "center",
                        padding: "10px 16px",
                        fontSize: 14,
                    }}
                >
                    <LogOut size={16} /> Sign Out
                </button>
            </aside>

            {/* ─── Main content ─── */}
            <main
                style={{
                    flex: 1,
                    marginLeft: 260,
                    padding: "32px 40px",
                    minHeight: "100vh",
                }}
            >
                {children}
            </main>
        </div>
    );
}
