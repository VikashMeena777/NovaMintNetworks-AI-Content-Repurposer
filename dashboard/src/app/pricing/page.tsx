"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Link from "next/link";
import {
    CheckCircle2,
    ArrowRight,
    ChevronDown,
    Loader2,
    Zap,
    CreditCard,
    RefreshCw,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

/* ─── Plan data ─── */
const PLANS = [
    {
        key: "free" as const,
        name: "Free",
        monthlyPrice: "₹0",
        annualPrice: "₹0",
        period: "forever",
        features: [
            "5 clips/month",
            "2 videos/month",
            "720p output",
            "ClipMint watermark",
            "3 caption styles",
            "Email support",
        ],
        highlighted: false,
        cta: "Start Free",
    },
    {
        key: "creator" as const,
        name: "Creator",
        monthlyPrice: "₹249",
        annualPrice: "₹199",
        period: "/month",
        features: [
            "50 clips/month",
            "5 videos/month",
            "1080p output",
            "No watermark",
            "All 9 caption styles",
            "Priority processing",
            "Email support",
        ],
        highlighted: true,
        cta: "Get Creator",
    },
    {
        key: "pro" as const,
        name: "Pro",
        monthlyPrice: "₹899",
        annualPrice: "₹719",
        period: "/month",
        features: [
            "200 clips/month",
            "20 videos/month",
            "4K output",
            "No watermark",
            "All 9 caption styles",
            "Priority processing",
            "Full API access",
            "Discord notifications",
        ],
        highlighted: false,
        cta: "Get Pro",
    },
    {
        key: "agency" as const,
        name: "Agency",
        monthlyPrice: "₹1,499",
        annualPrice: "₹1,199",
        period: "/month",
        features: [
            "Unlimited clips",
            "Unlimited videos",
            "4K output",
            "White-label option",
            "Team accounts",
            "n8n integration",
            "Batch processing",
            "Dedicated support",
        ],
        highlighted: false,
        cta: "Contact Sales",
    },
];

const BILLING_FAQ = [
    {
        q: "What payment methods do you accept?",
        a: "We accept all major credit/debit cards, UPI, net banking, and wallets via Cashfree. All payments are securely processed with 256-bit encryption.",
    },
    {
        q: "Can I cancel anytime?",
        a: "Yes. Cancel from your Settings page at any time. You'll retain access until the end of your current billing cycle.",
    },
    {
        q: "What's the refund policy?",
        a: "We offer a 7-day refund window from the date of your first payment. Email ClipMint.Billing@gmail.com with your refund request.",
    },
    {
        q: "Do I need a credit card for the free plan?",
        a: "No. The free plan requires no credit card. Just sign up with your email or Google account and start clipping.",
    },
    {
        q: "Can I switch plans?",
        a: "Yes. Upgrade or downgrade anytime from your dashboard Settings. Changes take effect at the start of your next billing cycle.",
    },
    {
        q: "What's the difference between one-time and subscription?",
        a: "One-time payment gives you 30 days of access at the monthly rate. Subscription auto-renews each month or year at the selected rate until you cancel.",
    },
];

export default function PricingPage() {
    const [annual, setAnnual] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [paymentType, setPaymentType] = useState<"subscription" | "one_time">("subscription");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [cashfreeLoaded, setCashfreeLoaded] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            setIsLoggedIn(!!user);
        });
    }, []);

    // Load Cashfree JS SDK
    useEffect(() => {
        if (typeof window !== "undefined" && !cashfreeLoaded) {
            const script = document.createElement("script");
            script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
            script.onload = () => setCashfreeLoaded(true);
            document.head.appendChild(script);
        }
    }, [cashfreeLoaded]);

    const showToast = useCallback((type: "success" | "error", message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    }, []);

    async function handleCheckout(planKey: string) {
        if (planKey === "free") {
            window.location.href = "/login";
            return;
        }

        if (!isLoggedIn) {
            window.location.href = "/login";
            return;
        }

        setLoadingPlan(planKey);

        try {
            const period = paymentType === "one_time" ? "one_time" : annual ? "annual" : "monthly";

            const res = await fetch("/api/cashfree/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: planKey, period }),
            });

            const data = await res.json();

            if (!res.ok) {
                showToast("error", data.error || "Failed to initialize payment");
                setLoadingPlan(null);
                return;
            }

            // Open Cashfree Checkout
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cashfree = (window as any).Cashfree?.({
                mode: data.environment === "production" ? "production" : "sandbox",
            });

            if (!cashfree) {
                showToast("error", "Payment system is loading. Please try again in a moment.");
                setLoadingPlan(null);
                return;
            }

            const checkoutOptions = {
                paymentSessionId: data.payment_session_id,
                redirectTarget: "_modal",
            };

            cashfree.checkout(checkoutOptions).then(async (result: { error?: { message: string }; redirect?: boolean; paymentDetails?: { paymentMessage: string } }) => {
                if (result.error) {
                    showToast("error", result.error.message || "Payment failed. Please try again.");
                    setLoadingPlan(null);
                } else if (result.redirect) {
                    // Payment will be verified on redirect
                    console.log("Payment redirecting...");
                } else if (result.paymentDetails) {
                    // Payment completed in modal, verify on server
                    try {
                        const verifyRes = await fetch("/api/cashfree/verify-payment", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ order_id: data.order_id }),
                        });

                        const verifyData = await verifyRes.json();

                        if (verifyRes.ok && verifyData.success) {
                            showToast("success", verifyData.message || "Payment successful! Redirecting...");
                            setTimeout(() => {
                                window.location.href = "/dashboard";
                            }, 1500);
                        } else {
                            showToast("error", verifyData.error || "Payment verification failed");
                        }
                    } catch {
                        showToast("error", "Payment verification failed. Please contact support.");
                    }
                    setLoadingPlan(null);
                }
            });
        } catch {
            showToast("error", "Something went wrong. Please try again.");
            setLoadingPlan(null);
        }
    }

    return (
        <main>
            <Navbar />

            {/* ─── Toast ─── */}
            {toast && (
                <div
                    style={{
                        position: "fixed",
                        top: 24,
                        right: 24,
                        zIndex: 1000,
                        padding: "14px 24px",
                        borderRadius: 12,
                        background: toast.type === "success" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                        border: `1px solid ${toast.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                        color: toast.type === "success" ? "#10B981" : "#EF4444",
                        fontSize: 14,
                        fontWeight: 600,
                        backdropFilter: "blur(12px)",
                        animation: "fadeIn 0.3s ease",
                    }}
                >
                    {toast.message}
                </div>
            )}

            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "140px 24px 80px" }}>
                <div style={{ textAlign: "center", marginBottom: 48 }}>
                    <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, marginBottom: 16 }}>
                        Simple, <span className="gradient-text">Transparent</span> Pricing
                    </h1>
                    <p style={{ fontSize: 18, color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto 32px", lineHeight: 1.6 }}>
                        Start free. Scale as you grow. No hidden fees.
                    </p>

                    {/* ─── Payment Type Toggle ─── */}
                    <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                        <button
                            onClick={() => setPaymentType("subscription")}
                            style={{
                                padding: "8px 20px",
                                borderRadius: 8,
                                border: `1px solid ${paymentType === "subscription" ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                                background: paymentType === "subscription" ? "rgba(108,92,231,0.12)" : "transparent",
                                color: paymentType === "subscription" ? "var(--accent-primary)" : "var(--text-secondary)",
                                fontWeight: 600,
                                fontSize: 13,
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                fontFamily: "inherit",
                                display: "flex", alignItems: "center", gap: 6,
                            }}
                        >
                            <RefreshCw size={14} /> Subscription
                        </button>
                        <button
                            onClick={() => setPaymentType("one_time")}
                            style={{
                                padding: "8px 20px",
                                borderRadius: 8,
                                border: `1px solid ${paymentType === "one_time" ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                                background: paymentType === "one_time" ? "rgba(108,92,231,0.12)" : "transparent",
                                color: paymentType === "one_time" ? "var(--accent-primary)" : "var(--text-secondary)",
                                fontWeight: 600,
                                fontSize: 13,
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                fontFamily: "inherit",
                                display: "flex", alignItems: "center", gap: 6,
                            }}
                        >
                            <CreditCard size={14} /> One-Time (30 Days)
                        </button>
                    </div>

                    {/* ─── Billing Period Toggle (only for subscriptions) ─── */}
                    {paymentType === "subscription" && (
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 16,
                                padding: "6px",
                                borderRadius: 12,
                                background: "var(--bg-secondary)",
                                border: "1px solid var(--border-subtle)",
                            }}
                        >
                            <button
                                onClick={() => setAnnual(false)}
                                style={{
                                    padding: "10px 24px",
                                    borderRadius: 8,
                                    border: "none",
                                    background: !annual ? "var(--accent-primary)" : "transparent",
                                    color: !annual ? "white" : "var(--text-secondary)",
                                    fontWeight: 600,
                                    fontSize: 14,
                                    cursor: "pointer",
                                    transition: "all 0.3s ease",
                                    fontFamily: "inherit",
                                }}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setAnnual(true)}
                                style={{
                                    padding: "10px 24px",
                                    borderRadius: 8,
                                    border: "none",
                                    background: annual ? "var(--accent-primary)" : "transparent",
                                    color: annual ? "white" : "var(--text-secondary)",
                                    fontWeight: 600,
                                    fontSize: 14,
                                    cursor: "pointer",
                                    transition: "all 0.3s ease",
                                    fontFamily: "inherit",
                                }}
                            >
                                Annual{" "}
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: annual ? "rgba(255,255,255,0.8)" : "var(--accent-green)",
                                        marginLeft: 4,
                                    }}
                                >
                                    Save 20%
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                {/* ─── Plans Grid ─── */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: 24,
                        marginBottom: 80,
                    }}
                >
                    {PLANS.map((plan) => {
                        const isLoading = loadingPlan === plan.key;
                        const isFree = plan.key === "free";
                        const isContactSales = plan.cta === "Contact Sales";

                        return (
                            <div
                                key={plan.name}
                                className="glass-card"
                                style={{
                                    padding: 32,
                                    border: plan.highlighted ? "2px solid var(--accent-primary)" : undefined,
                                    position: "relative",
                                }}
                            >
                                {plan.highlighted && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: -12,
                                            left: "50%",
                                            transform: "translateX(-50%)",
                                            background: "var(--accent-primary)",
                                            color: "white",
                                            padding: "4px 16px",
                                            borderRadius: 20,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            letterSpacing: 0.8,
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        Most Popular
                                    </div>
                                )}
                                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
                                    {plan.name}
                                </h3>
                                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                                    <span className="gradient-text" style={{ fontSize: 36, fontWeight: 800 }}>
                                        {paymentType === "one_time"
                                            ? plan.monthlyPrice
                                            : annual
                                                ? plan.annualPrice
                                                : plan.monthlyPrice}
                                    </span>
                                    <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
                                        {isFree
                                            ? "forever"
                                            : paymentType === "one_time"
                                                ? "/30 days"
                                                : plan.period}
                                    </span>
                                </div>

                                {/* Payment badge */}
                                {!isFree && !isContactSales && (
                                    <div
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                            padding: "3px 10px",
                                            borderRadius: 6,
                                            background: paymentType === "subscription" ? "rgba(108,92,231,0.1)" : "rgba(16,185,129,0.1)",
                                            color: paymentType === "subscription" ? "var(--accent-primary)" : "var(--accent-green)",
                                            fontSize: 11,
                                            fontWeight: 600,
                                            marginBottom: 16,
                                        }}
                                    >
                                        {paymentType === "subscription" ? (
                                            <><RefreshCw size={10} /> Auto-renews</>
                                        ) : (
                                            <><Zap size={10} /> One-time</>
                                        )}
                                    </div>
                                )}

                                <ul
                                    style={{
                                        listStyle: "none",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 12,
                                        marginBottom: 28,
                                    }}
                                >
                                    {plan.features.map((f) => (
                                        <li
                                            key={f}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                color: "var(--text-secondary)",
                                                fontSize: 14,
                                            }}
                                        >
                                            <CheckCircle2
                                                size={16}
                                                style={{ color: "var(--accent-green)", flexShrink: 0 }}
                                            />
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                {isContactSales ? (
                                    <Link
                                        href="/contact"
                                        className="btn-secondary"
                                        style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}
                                    >
                                        Contact Sales <ArrowRight size={16} />
                                    </Link>
                                ) : (
                                    <button
                                        onClick={() => handleCheckout(plan.key)}
                                        disabled={isLoading}
                                        className={plan.highlighted ? "btn-primary" : "btn-secondary"}
                                        style={{
                                            width: "100%",
                                            justifyContent: "center",
                                            cursor: isLoading ? "wait" : "pointer",
                                            opacity: isLoading ? 0.7 : 1,
                                            fontFamily: "inherit",
                                        }}
                                    >
                                        {isLoading ? (
                                            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                        ) : (
                                            <>
                                                {plan.cta} <ArrowRight size={16} />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ─── Feature Comparison Table ─── */}
                <div style={{ marginBottom: 80 }}>
                    <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: "center", marginBottom: 32 }}>
                        Compare <span className="gradient-text">Plans</span>
                    </h2>
                    <div className="glass-card" style={{ overflowX: "auto", padding: 0 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 600 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <th style={{ textAlign: "left", padding: "16px 20px", color: "var(--text-muted)", fontWeight: 600 }}>
                                        Feature
                                    </th>
                                    {PLANS.map((p) => (
                                        <th
                                            key={p.name}
                                            style={{
                                                textAlign: "center",
                                                padding: "16px 12px",
                                                color: p.highlighted ? "var(--accent-secondary)" : "var(--text-primary)",
                                                fontWeight: 700,
                                            }}
                                        >
                                            {p.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ["Clips/month", "5", "50", "200", "Unlimited"],
                                    ["Videos/month", "2", "5", "20", "Unlimited"],
                                    ["Output quality", "720p", "1080p", "4K", "4K"],
                                    ["Caption styles", "3", "9", "9", "9"],
                                    ["Watermark", "Yes", "No", "No", "No"],
                                    ["API access", "—", "—", "✓", "✓"],
                                    ["Priority processing", "—", "✓", "✓", "✓"],
                                    ["Team accounts", "—", "—", "—", "✓"],
                                    ["White-label", "—", "—", "—", "✓"],
                                ].map((row, i) => (
                                    <tr
                                        key={row[0]}
                                        style={{
                                            borderBottom: i < 8 ? "1px solid rgba(42, 42, 69, 0.5)" : undefined,
                                        }}
                                    >
                                        <td style={{ padding: "14px 20px", color: "var(--text-secondary)", fontWeight: 500 }}>
                                            {row[0]}
                                        </td>
                                        {row.slice(1).map((val, j) => (
                                            <td
                                                key={j}
                                                style={{
                                                    textAlign: "center",
                                                    padding: "14px 12px",
                                                    color:
                                                        val === "✓"
                                                            ? "var(--accent-green)"
                                                            : val === "—"
                                                                ? "var(--text-muted)"
                                                                : "var(--text-primary)",
                                                    fontWeight: val === "✓" ? 700 : 400,
                                                }}
                                            >
                                                {val}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ─── Cashfree Trust Badge ─── */}
                <div style={{ textAlign: "center", marginBottom: 48 }}>
                    <div
                        className="glass-card"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "14px 28px",
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                            Secure payments powered by <strong style={{ color: "var(--text-primary)" }}>Cashfree</strong> • 256-bit SSL encryption
                        </span>
                    </div>
                </div>

                {/* ─── Billing FAQ ─── */}
                <div style={{ maxWidth: 700, margin: "0 auto" }}>
                    <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: "center", marginBottom: 32 }}>
                        Billing <span className="gradient-text">FAQ</span>
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {BILLING_FAQ.map((faq, i) => (
                            <div key={i} className={`faq-item ${openFaq === i ? "open" : ""}`}>
                                <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                                    {faq.q}
                                    <ChevronDown size={18} className="faq-chevron" />
                                </button>
                                <div className="faq-answer">{faq.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
}
