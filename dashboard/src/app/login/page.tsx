"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Film, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    async function handleEmailAuth(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        if (isSignUp) {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) {
                setError(error.message);
            } else if (data.session) {
                // Email confirmation disabled — session is returned immediately
                router.push("/dashboard");
                router.refresh();
            } else {
                // Email confirmation enabled — user needs to check email
                setMessage("Check your email for a confirmation link!");
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                setError(error.message);
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        }
        setLoading(false);
    }

    async function handleGoogleAuth() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) {
            setError(error.message);
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
            }}
        >
            <div
                className="glass-card"
                style={{
                    width: "100%",
                    maxWidth: 440,
                    padding: "48px 40px",
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        marginBottom: 8,
                    }}
                >
                    <Film
                        size={32}
                        style={{ color: "var(--accent-primary)" }}
                    />
                    <span
                        className="gradient-text"
                        style={{
                            fontSize: 28,
                            fontWeight: 800,
                            letterSpacing: -0.5,
                        }}
                    >
                        ClipMint
                    </span>
                </div>

                <p
                    style={{
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontSize: 14,
                        marginBottom: 32,
                    }}
                >
                    {isSignUp
                        ? "Create your account to start clipping"
                        : "Sign in to your account"}
                </p>

                {/* Google OAuth */}
                <button
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    className="btn-secondary"
                    style={{
                        width: "100%",
                        justifyContent: "center",
                        padding: "12px 16px",
                        fontSize: 15,
                        marginBottom: 24,
                        gap: 10,
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Continue with Google
                </button>

                {/* Divider */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        marginBottom: 24,
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            height: 1,
                            background: "var(--border-subtle)",
                        }}
                    />
                    <span
                        style={{
                            color: "var(--text-muted)",
                            fontSize: 13,
                        }}
                    >
                        or
                    </span>
                    <div
                        style={{
                            flex: 1,
                            height: 1,
                            background: "var(--border-subtle)",
                        }}
                    />
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailAuth}>
                    <div style={{ marginBottom: 16 }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: 13,
                                fontWeight: 500,
                                color: "var(--text-secondary)",
                                marginBottom: 6,
                            }}
                        >
                            Email
                        </label>
                        <div style={{ position: "relative" }}>
                            <Mail
                                size={16}
                                style={{
                                    position: "absolute",
                                    left: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "var(--text-muted)",
                                }}
                            />
                            <input
                                className="input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                style={{ paddingLeft: 38 }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: 13,
                                fontWeight: 500,
                                color: "var(--text-secondary)",
                                marginBottom: 6,
                            }}
                        >
                            Password
                        </label>
                        <div style={{ position: "relative" }}>
                            <Lock
                                size={16}
                                style={{
                                    position: "absolute",
                                    left: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "var(--text-muted)",
                                }}
                            />
                            <input
                                className="input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                style={{ paddingLeft: 38 }}
                            />
                        </div>
                    </div>

                    {error && (
                        <div
                            style={{
                                padding: "10px 14px",
                                borderRadius: 8,
                                background: "rgba(239,68,68,0.1)",
                                border: "1px solid rgba(239,68,68,0.3)",
                                color: "#EF4444",
                                fontSize: 13,
                                marginBottom: 16,
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {message && (
                        <div
                            style={{
                                padding: "10px 14px",
                                borderRadius: 8,
                                background: "rgba(16,185,129,0.1)",
                                border: "1px solid rgba(16,185,129,0.3)",
                                color: "#10B981",
                                fontSize: 13,
                                marginBottom: 16,
                            }}
                        >
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{
                            width: "100%",
                            justifyContent: "center",
                            padding: "12px 16px",
                            fontSize: 15,
                            gap: 8,
                        }}
                    >
                        {loading ? (
                            <Loader2
                                size={18}
                                style={{ animation: "spin 1s linear infinite" }}
                            />
                        ) : (
                            <>
                                {isSignUp ? "Create Account" : "Sign In"}
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </form>

                {/* Toggle sign up / sign in */}
                <p
                    style={{
                        textAlign: "center",
                        marginTop: 24,
                        fontSize: 14,
                        color: "var(--text-muted)",
                    }}
                >
                    {isSignUp
                        ? "Already have an account?"
                        : "Don't have an account?"}{" "}
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError(null);
                            setMessage(null);
                        }}
                        style={{
                            background: "none",
                            border: "none",
                            color: "var(--accent-primary)",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: 14,
                        }}
                    >
                        {isSignUp ? "Sign in" : "Sign up"}
                    </button>
                </p>
            </div>
        </div>
    );
}
