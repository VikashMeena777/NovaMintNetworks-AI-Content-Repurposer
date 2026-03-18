import Link from "next/link";


const FOOTER_COLUMNS = [
    {
        title: "Product",
        links: [
            { label: "Features", href: "/features" },
            { label: "Pricing", href: "/pricing" },
            { label: "API Docs", href: "/dashboard/api-keys" },
        ],
    },
    {
        title: "Company",
        links: [
            { label: "About", href: "/about" },
            { label: "Contact", href: "/contact" },
        ],
    },
    {
        title: "Legal",
        links: [
            { label: "Privacy Policy", href: "/privacy-policy" },
            { label: "Terms & Conditions", href: "/terms" },
            { label: "Refund Policy", href: "/refund-policy" },
        ],
    },
    {
        title: "Connect",
        links: [
            {
                label: "ClipMint.Support@gmail.com",
                href: "mailto:ClipMint.Support@gmail.com",
            },
            {
                label: "Instagram",
                href: "https://instagram.com/clipmintapp",
            },
        ],
    },
];

export default function Footer() {
    return (
        <footer
            style={{
                borderTop: "1px solid var(--border-subtle)",
                padding: "64px 24px 32px",
                background:
                    "linear-gradient(180deg, transparent 0%, rgba(10, 10, 15, 0.8) 100%)",
            }}
        >
            <div
                style={{
                    maxWidth: 1200,
                    margin: "0 auto",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 48,
                    marginBottom: 48,
                }}
            >
                {FOOTER_COLUMNS.map((col) => (
                    <div key={col.title}>
                        <h4
                            style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: "var(--text-primary)",
                                marginBottom: 20,
                                letterSpacing: 0.5,
                                textTransform: "uppercase",
                            }}
                        >
                            {col.title}
                        </h4>
                        <ul
                            style={{
                                listStyle: "none",
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                            }}
                        >
                            {col.links.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        style={{
                                            color: "var(--text-secondary)",
                                            textDecoration: "none",
                                            fontSize: 14,
                                            transition: "color 0.3s ease",
                                        }}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Bottom bar */}
            <div
                style={{
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: 24,
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    maxWidth: 1200,
                    margin: "0 auto",
                }}
            >
                <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                    <img src="/clipmint-logo.jpg" alt="ClipMint" style={{ height: 18, width: 18, borderRadius: 4, objectFit: "cover" }} />
                    <span
                        className="gradient-text"
                        style={{ fontWeight: 700, fontSize: 15 }}
                    >
                        ClipMint
                    </span>
                </div>
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    © 2026 NovaMint Networks. All rights reserved.
                </span>
            </div>
        </footer>
    );
}
