"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
    Key, Plus, Copy, Trash2, Shield, Loader2, Check,
    AlertCircle, Code2, ChevronDown, ChevronUp,
    Terminal, AlertTriangle, Activity,
} from "lucide-react";

interface ApiKeyRow {
    id: string;
    name: string;
    key_prefix: string;
    created_at: string;
    last_used_at: string | null;
    requests_today: number;
    is_active: boolean;
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

const CODE_SNIPPETS = [
    {
        lang: "cURL",
        code: `curl -X POST https://novamintnetworks.in/api/v1/jobs \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"video_url": "https://youtube.com/watch?v=...", "caption_style": "hormozi", "max_clips": 5}'`,
    },
    {
        lang: "JavaScript",
        code: `const response = await fetch("https://novamintnetworks.in/api/v1/jobs", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    video_url: "https://youtube.com/watch?v=...",
    caption_style: "hormozi",
    max_clips: 5,
  }),
});
const data = await response.json();`,
    },
    {
        lang: "Python",
        code: `import requests

response = requests.post(
    "https://novamintnetworks.in/api/v1/jobs",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={
        "video_url": "https://youtube.com/watch?v=...",
        "caption_style": "hormozi",
        "max_clips": 5,
    },
)
data = response.json()`,
    },
];

export default function ApiKeysPage() {
    const supabase = createClient();
    const [keys, setKeys] = useState<ApiKeyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [creating, setCreating] = useState(false);
    const [newRawKey, setNewRawKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSnippets, setShowSnippets] = useState(false);
    const [activeSnippet, setActiveSnippet] = useState(0);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [copiedPrefix, setCopiedPrefix] = useState<string | null>(null);

    useEffect(() => {
        loadKeys();
    }, []);

    async function loadKeys() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from("api_keys")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (data) setKeys(data as ApiKeyRow[]);
        setLoading(false);
    }

    async function createKey() {
        if (!newKeyName.trim()) return;
        setCreating(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Not authenticated"); setCreating(false); return; }

        const rawKey = `cm_live_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
        const keyPrefix = rawKey.slice(0, 12);

        const encoder = new TextEncoder();
        const data = encoder.encode(rawKey);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        const { error: insertError } = await supabase
            .from("api_keys")
            .insert({ user_id: user.id, key_hash: keyHash, key_prefix: keyPrefix, name: newKeyName.trim() });

        if (insertError) { setError(insertError.message); setCreating(false); return; }

        setNewRawKey(rawKey);
        setCreating(false);
        await loadKeys();
    }

    async function deleteKey(keyId: string) {
        const { error: delError } = await supabase.from("api_keys").delete().eq("id", keyId);
        if (!delError) setKeys((prev) => prev.filter((k) => k.id !== keyId));
        setDeleteConfirm(null);
    }

    function closeModal() {
        setShowCreateModal(false);
        setNewKeyName("");
        setNewRawKey(null);
        setCopied(false);
        setError(null);
    }

    const totalRequests = keys.reduce((sum, k) => sum + k.requests_today, 0);
    const activeKeys = keys.filter((k) => k.is_active).length;

    return (
        <div>
            {/* ─── Header ─── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 800, marginBottom: 4 }}>API Keys</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                        Manage API keys for programmatic access to ClipMint
                    </p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={16} /> Create Key
                </button>
            </div>

            {/* ─── API Overview Stats ─── */}
            <div className="dash-grid-3" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Active Keys</span>
                        <div className="stat-icon-bg" style={{ background: "rgba(108,92,231,0.12)" }}>
                            <Key size={18} style={{ color: "var(--accent-primary)" }} />
                        </div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{loading ? <div className="skeleton" style={{ height: 28, width: 40 }} /> : activeKeys}</div>
                </div>
                <div className="stat-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Requests Today</span>
                        <div className="stat-icon-bg" style={{ background: "rgba(0,230,118,0.12)" }}>
                            <Activity size={18} style={{ color: "var(--accent-green)" }} />
                        </div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{loading ? <div className="skeleton" style={{ height: 28, width: 40 }} /> : totalRequests}</div>
                </div>
                <div className="stat-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Total Keys</span>
                        <div className="stat-icon-bg" style={{ background: "rgba(0,229,255,0.12)" }}>
                            <Shield size={18} style={{ color: "var(--accent-cyan)" }} />
                        </div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{loading ? <div className="skeleton" style={{ height: 28, width: 40 }} /> : keys.length}</div>
                </div>
            </div>

            {/* ─── Documentation Info ─── */}
            <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 12 }}>
                        <Code2 size={20} style={{ color: "var(--accent-primary)", flexShrink: 0, marginTop: 2 }} />
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>API Documentation</div>
                            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
                                Use your API key in the <code style={{ background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>Authorization: Bearer cm_****</code> header.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSnippets(!showSnippets)}
                        style={{
                            background: "none", border: "1px solid var(--border-subtle)",
                            borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                            color: "var(--text-secondary)", fontSize: 12, fontWeight: 500,
                            display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                        }}
                    >
                        <Terminal size={13} />
                        {showSnippets ? "Hide" : "Show"} Examples
                        {showSnippets ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                </div>

                {/* Code Snippets */}
                {showSnippets && (
                    <div style={{ marginTop: 16, animation: "fadeInUp 0.3s ease" }}>
                        <div className="tab-nav" style={{ marginBottom: 12 }}>
                            {CODE_SNIPPETS.map((snippet, i) => (
                                <button
                                    key={snippet.lang}
                                    className={`tab-item ${activeSnippet === i ? "active" : ""}`}
                                    onClick={() => setActiveSnippet(i)}
                                    style={{ padding: "6px 12px", fontSize: 12 }}
                                >
                                    {snippet.lang}
                                </button>
                            ))}
                        </div>
                        <div className="code-block">
                            <span className="code-lang">{CODE_SNIPPETS[activeSnippet].lang}</span>
                            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                                {CODE_SNIPPETS[activeSnippet].code}
                            </pre>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(CODE_SNIPPETS[activeSnippet].code);
                                    setCopiedPrefix("snippet");
                                    setTimeout(() => setCopiedPrefix(null), 2000);
                                }}
                                style={{
                                    position: "absolute", top: 8, right: 60, background: "var(--bg-card)",
                                    border: "1px solid var(--border-subtle)", borderRadius: 6,
                                    padding: "4px 8px", cursor: "pointer", color: "var(--text-muted)",
                                    fontSize: 11, display: "flex", alignItems: "center", gap: 4,
                                }}
                            >
                                {copiedPrefix === "snippet" ? <><Check size={11} style={{ color: "var(--accent-green)" }} /> Copied</> : <><Copy size={11} /> Copy</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Keys List ─── */}
            {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 16 }} />)}
                </div>
            ) : keys.length === 0 ? (
                <div className="glass-card" style={{ padding: 48, textAlign: "center" }}>
                    <Key size={40} style={{ color: "var(--text-muted)", marginBottom: 16, opacity: 0.4 }} />
                    <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>No API Keys Yet</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>
                        Create your first API key to start using ClipMint programmatically
                    </p>
                    <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus size={16} /> Create Your First Key
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {keys.map((key, i) => (
                        <div
                            key={key.id}
                            className="glass-card animate-fade-in-up"
                            style={{ padding: "18px 22px", animationDelay: `${i * 0.05}s` }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                                    {/* Status dot */}
                                    <div style={{
                                        width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                                        background: key.is_active ? "var(--accent-green)" : "var(--text-muted)",
                                        boxShadow: key.is_active ? "0 0 8px rgba(0,230,118,0.4)" : "none",
                                    }} />
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{key.name}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                            <code style={{
                                                fontSize: 12, color: "var(--text-muted)",
                                                background: "var(--bg-secondary)", padding: "3px 8px",
                                                borderRadius: 6, fontFamily: "'Fira Code', monospace",
                                            }}>
                                                {key.key_prefix}••••••••••••
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(key.key_prefix);
                                                    setCopiedPrefix(key.id);
                                                    setTimeout(() => setCopiedPrefix(null), 2000);
                                                }}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: copiedPrefix === key.id ? "var(--accent-green)" : "var(--text-muted)", padding: 4, display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
                                            >
                                                {copiedPrefix === key.id ? <><Check size={12} /> Copied</> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                                            {key.requests_today} requests today
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                            {key.last_used_at ? `Last used ${timeAgo(key.last_used_at)}` : "Never used"}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setDeleteConfirm(key.id)}
                                        style={{
                                            background: "none", border: "1px solid rgba(255,82,82,0.2)",
                                            cursor: "pointer", color: "var(--accent-red)",
                                            padding: "6px 8px", borderRadius: 8,
                                            transition: "all 0.2s", display: "flex", alignItems: "center",
                                        }}
                                        title="Delete key"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Delete Confirmation Modal ─── */}
            {deleteConfirm && (
                <div
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
                    onClick={() => setDeleteConfirm(null)}
                >
                    <div
                        className="glass-card animate-scale-in"
                        style={{ padding: 28, width: 420, maxWidth: "90vw" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,82,82,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <AlertTriangle size={20} style={{ color: "var(--accent-red)" }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Delete API Key</h3>
                                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                                    {keys.find(k => k.id === deleteConfirm)?.name}
                                </p>
                            </div>
                        </div>
                        <div style={{
                            padding: "12px 16px", borderRadius: 10,
                            background: "rgba(255,82,82,0.06)", border: "1px solid rgba(255,82,82,0.15)",
                            marginBottom: 20,
                        }}>
                            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                                This action <strong style={{ color: "var(--accent-red)" }}>cannot be undone</strong>. Any applications using this key will immediately lose access. Make sure to update your integrations before deleting.
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                            <button className="btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setDeleteConfirm(null)}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                style={{ flex: 1, justifyContent: "center", background: "var(--accent-red)" }}
                                onClick={() => deleteKey(deleteConfirm)}
                            >
                                <Trash2 size={14} /> Delete Key
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Create Modal ─── */}
            {showCreateModal && (
                <div
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
                    onClick={closeModal}
                >
                    <div
                        className="glass-card animate-scale-in"
                        style={{ padding: 32, width: 480, maxWidth: "90vw" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {newRawKey ? (
                            <>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(0,230,118,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Check size={18} style={{ color: "var(--accent-green)" }} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Key Created!</h3>
                                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Copy this key now — you won&apos;t see it again</p>
                                    </div>
                                </div>
                                <div style={{
                                    background: "var(--bg-primary)", padding: "14px 18px",
                                    borderRadius: 10, fontFamily: "'Fira Code', monospace",
                                    fontSize: 13, wordBreak: "break-all", marginBottom: 20,
                                    border: "1px solid var(--border-subtle)",
                                }}>
                                    {newRawKey}
                                </div>
                                <div style={{ display: "flex", gap: 12 }}>
                                    <button
                                        className="btn-primary"
                                        style={{ flex: 1, justifyContent: "center" }}
                                        onClick={() => { navigator.clipboard.writeText(newRawKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                    >
                                        {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Key</>}
                                    </button>
                                    <button className="btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={closeModal}>
                                        Done
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Create API Key</h3>
                                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                                    Give your key a descriptive name to easily identify it later
                                </p>
                                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
                                    Key Name
                                </label>
                                <input
                                    type="text" value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    placeholder="e.g. Production, Development, My App"
                                    className="input-field" style={{ marginBottom: 20 }}
                                    autoFocus
                                />
                                {error && (
                                    <div style={{
                                        padding: "10px 14px", borderRadius: 8,
                                        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                                        color: "#EF4444", fontSize: 13, marginBottom: 16,
                                        display: "flex", alignItems: "center", gap: 8,
                                    }}>
                                        <AlertCircle size={14} /> {error}
                                    </div>
                                )}
                                <div style={{ display: "flex", gap: 12 }}>
                                    <button className="btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={closeModal}>
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary"
                                        style={{ flex: 1, justifyContent: "center" }}
                                        disabled={creating || !newKeyName.trim()}
                                        onClick={createKey}
                                    >
                                        {creating ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <><Key size={16} /> Create</>}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
