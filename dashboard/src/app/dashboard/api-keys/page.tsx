"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Key, Plus, Copy, Trash2, Shield, Loader2, Check, AlertCircle } from "lucide-react";

interface ApiKeyRow {
    id: string;
    name: string;
    key_prefix: string;
    created_at: string;
    last_used_at: string | null;
    requests_today: number;
    is_active: boolean;
}

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
        if (!user) {
            setError("Not authenticated");
            setCreating(false);
            return;
        }

        // Generate a random API key
        const rawKey = `cm_live_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
        const keyPrefix = rawKey.slice(0, 12);

        // Hash the key with SHA-256
        const encoder = new TextEncoder();
        const data = encoder.encode(rawKey);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        const { error: insertError } = await supabase
            .from("api_keys")
            .insert({
                user_id: user.id,
                key_hash: keyHash,
                key_prefix: keyPrefix,
                name: newKeyName.trim(),
            });

        if (insertError) {
            setError(insertError.message);
            setCreating(false);
            return;
        }

        setNewRawKey(rawKey);
        setCreating(false);
        await loadKeys();
    }

    async function deleteKey(keyId: string) {
        const { error: delError } = await supabase
            .from("api_keys")
            .delete()
            .eq("id", keyId);

        if (!delError) {
            setKeys((prev) => prev.filter((k) => k.id !== keyId));
        }
    }

    function closeModal() {
        setShowCreateModal(false);
        setNewKeyName("");
        setNewRawKey(null);
        setCopied(false);
        setError(null);
    }

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>API Keys</h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
                        Manage API keys for programmatic access to ClipMint
                    </p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={16} /> Create Key
                </button>
            </div>

            {/* ─── Info box ─── */}
            <div className="glass-card" style={{ padding: 20, marginBottom: 24, display: "flex", gap: 12 }}>
                <Shield size={20} style={{ color: "var(--accent-primary)", flexShrink: 0, marginTop: 2 }} />
                <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>API Documentation</div>
                    <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
                        Use your API key to submit videos, check job status, and download clips programmatically.
                        Include your key in the <code style={{ background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: 4 }}>Authorization: Bearer cm_****</code> header.
                    </p>
                </div>
            </div>

            {/* ─── Keys List ─── */}
            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                    <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "var(--accent-primary)" }} />
                </div>
            ) : keys.length === 0 ? (
                <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
                    <Key size={36} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                        No API keys yet. Create one to get started.
                    </p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {keys.map((key) => (
                        <div key={key.id} className="glass-card" style={{ padding: "20px 24px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <Key size={18} style={{ color: key.is_active ? "var(--accent-primary)" : "var(--text-muted)" }} />
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{key.name}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <code style={{
                                                fontSize: 13,
                                                color: "var(--text-muted)",
                                                background: "var(--bg-secondary)",
                                                padding: "3px 8px",
                                                borderRadius: 6,
                                                fontFamily: "'Fira Code', monospace",
                                            }}>
                                                {key.key_prefix}••••••••••••
                                            </code>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(key.key_prefix)}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    color: "var(--text-muted)",
                                                    padding: 4,
                                                }}
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                                            {key.requests_today} requests today
                                        </div>
                                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                            {key.last_used_at
                                                ? `Last used: ${new Date(key.last_used_at).toLocaleDateString()}`
                                                : "Never used"}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteKey(key.id)}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "var(--accent-red)",
                                            padding: 8,
                                            borderRadius: 8,
                                            transition: "background 0.2s",
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Create Modal ─── */}
            {showCreateModal && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 100,
                    }}
                    onClick={closeModal}
                >
                    <div
                        className="glass-card"
                        style={{ padding: 32, width: 480, maxWidth: "90vw" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {newRawKey ? (
                            /* ─── Show new key ─── */
                            <>
                                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                                    <Check size={20} style={{ color: "var(--accent-green)" }} /> Key Created!
                                </h3>
                                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                                    Copy this key now — you won&apos;t be able to see it again.
                                </p>
                                <div style={{
                                    background: "var(--bg-secondary)",
                                    padding: "12px 16px",
                                    borderRadius: 10,
                                    fontFamily: "'Fira Code', monospace",
                                    fontSize: 13,
                                    wordBreak: "break-all",
                                    marginBottom: 16,
                                    border: "1px solid var(--border-subtle)",
                                }}>
                                    {newRawKey}
                                </div>
                                <div style={{ display: "flex", gap: 12 }}>
                                    <button
                                        className="btn-primary"
                                        style={{ flex: 1, justifyContent: "center" }}
                                        onClick={() => {
                                            navigator.clipboard.writeText(newRawKey);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                    >
                                        {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Key</>}
                                    </button>
                                    <button className="btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={closeModal}>
                                        Done
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* ─── Create form ─── */
                            <>
                                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Create API Key</h3>
                                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
                                    Key Name
                                </label>
                                <input
                                    type="text"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    placeholder="e.g. Production, Development"
                                    className="input-field"
                                    style={{ marginBottom: 20 }}
                                />
                                {error && (
                                    <div style={{
                                        padding: "10px 14px",
                                        borderRadius: 8,
                                        background: "rgba(239,68,68,0.1)",
                                        border: "1px solid rgba(239,68,68,0.3)",
                                        color: "#EF4444",
                                        fontSize: 13,
                                        marginBottom: 16,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
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
                                        {creating ? (
                                            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                        ) : (
                                            <><Key size={16} /> Create</>
                                        )}
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
