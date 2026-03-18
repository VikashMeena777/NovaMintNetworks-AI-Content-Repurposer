"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

const NAV_LINKS = [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
];

export default function Navbar() {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        async function checkUser() {
            const supabase = createClient();
            try {
                const { data } = await supabase.auth.getUser();
                setUser(data?.user || null);
            } catch (err) {
                console.error(err);
            } finally {
                setAuthLoading(false);
            }
        }
        checkUser();
    }, []);

    return (
        <>
            <nav
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    padding: "14px 32px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: scrolled
                        ? "rgba(10, 10, 15, 0.92)"
                        : "rgba(10, 10, 15, 0.6)",
                    backdropFilter: "blur(16px) saturate(180%)",
                    WebkitBackdropFilter: "blur(16px) saturate(180%)",
                    borderBottom: scrolled
                        ? "1px solid var(--border-subtle)"
                        : "1px solid transparent",
                    transition: "all 0.35s ease",
                }}
            >
                {/* Logo */}
                <Link
                    href="/"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        textDecoration: "none",
                    }}
                >
                    <img src="/clipmint-logo.jpg" alt="ClipMint" style={{ height: 36, width: 36, borderRadius: 8, objectFit: "cover" }} />
                    <span
                        className="gradient-text"
                        style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}
                    >
                        ClipMint
                    </span>
                </Link>

                {/* Desktop links */}
                <div
                    className="hide-mobile"
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            style={{
                                padding: "8px 16px",
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 500,
                                color:
                                    pathname === link.href
                                        ? "var(--accent-secondary)"
                                        : "var(--text-secondary)",
                                textDecoration: "none",
                                transition: "color 0.3s ease, background 0.3s ease",
                                background:
                                    pathname === link.href
                                        ? "rgba(108, 92, 231, 0.1)"
                                        : "transparent",
                            }}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Auth buttons */}
                <div
                    className="hide-mobile"
                    style={{ display: "flex", gap: 12, alignItems: "center" }}
                >
                    {!authLoading && user ? (
                        <Link
                            href="/dashboard"
                            className="btn-primary"
                            style={{ padding: "10px 22px", fontSize: 14 }}
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="btn-secondary"
                                style={{ padding: "10px 22px", fontSize: 14 }}
                            >
                                Login
                            </Link>
                            <Link
                                href="/login"
                                className="btn-primary"
                                style={{ padding: "10px 22px", fontSize: 14 }}
                            >
                                Start Free Trial
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button
                    className="show-mobile"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    style={{
                        display: "none",
                        background: "transparent",
                        border: "none",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        padding: 8,
                    }}
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </nav>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div
                    className="show-mobile"
                    style={{
                        position: "fixed",
                        top: 60,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 99,
                        background: "rgba(10, 10, 15, 0.97)",
                        backdropFilter: "blur(20px)",
                        display: "none",
                        flexDirection: "column",
                        padding: "32px 24px",
                        gap: 8,
                        animation: "fadeInUp 0.25s ease forwards",
                    }}
                >
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            style={{
                                padding: "16px 20px",
                                borderRadius: 12,
                                fontSize: 18,
                                fontWeight: 600,
                                color:
                                    pathname === link.href
                                        ? "var(--accent-secondary)"
                                        : "var(--text-primary)",
                                textDecoration: "none",
                                background:
                                    pathname === link.href
                                        ? "rgba(108, 92, 231, 0.1)"
                                        : "transparent",
                            }}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <div
                        style={{
                            marginTop: 24,
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                        }}
                    >
                        {!authLoading && user ? (
                            <Link
                                href="/dashboard"
                                className="btn-primary"
                                style={{
                                    justifyContent: "center",
                                    padding: "14px 24px",
                                }}
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="btn-secondary"
                                    style={{
                                        justifyContent: "center",
                                        padding: "14px 24px",
                                    }}
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/login"
                                    className="btn-primary"
                                    style={{
                                        justifyContent: "center",
                                        padding: "14px 24px",
                                    }}
                                >
                                    Start Free Trial
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
