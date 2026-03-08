import React, { useMemo } from "react";
import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    Sequence,
    interpolate,
    spring,
    Video,
    staticFile,
} from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { type Caption } from "@remotion/captions";

// ---------------------------------------------------------------------------
// Schema — defines the props that can be set from Remotion Studio inspector
// ---------------------------------------------------------------------------
export const captionedClipSchema = z.object({
    /**
     * Path or URL to the source video clip to display underneath the captions.
     * Pass an absolute path or relative path that Remotion can resolve.
     * Leave empty ("") to render captions-only on a solid background.
     */
    videoSrc: z.string().default(""),
    /**
     * Number of frames the composition should last. Must match the actual
     * clip duration * fps (e.g. 30s clip at 30fps = 900 frames).
     * Defaults to 300 (10 s) which is used by the Remotion Studio preview.
     */
    durationInFrames: z.number().int().min(1).default(300),
    /**
     * JSON string of Caption[] — per-word timestamps from Groq verbose_json.
     * Shape: [{ text, startMs, endMs, timestampMs, confidence }, ...]
     */
    captionsData: z.string(),
    /** Caption style preset name */
    captionStyle: z.enum([
        "hormozi",
        "bounce",
        "fade",
        "glow",
        "typewriter",
        "glitch",
        "neon",
        "colorful",
        "minimal",
    ]),
    /** Background color used only when videoSrc is empty */
    backgroundColor: zColor(),
    /** Accent color for highlights */
    accentColor: zColor(),
    /** Base font size in pixels */
    fontSize: z.number().min(24).max(120),
});

export type CaptionedClipProps = z.infer<typeof captionedClipSchema>;

// ---------------------------------------------------------------------------
// Main Composition
// ---------------------------------------------------------------------------
export const CaptionedClip: React.FC<CaptionedClipProps> = ({
    videoSrc,
    captionsData,
    captionStyle,
    backgroundColor,
    accentColor,
    fontSize,
}) => {
    const { width, height, fps } = useVideoConfig();
    const frame = useCurrentFrame();

    // Parse Caption[] from JSON prop
    const captions = useMemo<Caption[]>(() => {
        try {
            const parsed = JSON.parse(captionsData);
            if (!Array.isArray(parsed)) return [];
            return parsed as Caption[];
        } catch {
            return [];
        }
    }, [captionsData]);

    // Build punchy 3-word-max pages instead of the default grouping which
    // combined words within 1.2 s silence gaps — producing long paragraphs.
    const pages = useMemo(() => {
        const MAX_WORDS = 3;
        const result: TikTokPage[] = [];

        for (let i = 0; i < captions.length; i += MAX_WORDS) {
            const chunk = captions.slice(i, i + MAX_WORDS);
            if (chunk.length === 0) continue;

            const first = chunk[0];
            const last = chunk[chunk.length - 1];
            const startMs = first.startMs;
            // Duration extends to the *next* page start (or last word end)
            const nextStart =
                i + MAX_WORDS < captions.length
                    ? captions[i + MAX_WORDS].startMs
                    : last.endMs;
            const durationMs = Math.max(100, nextStart - startMs);

            result.push({
                startMs,
                durationMs,
                tokens: chunk.map((c) => ({
                    text: c.text,
                    fromMs: c.startMs,
                    toMs: c.endMs,
                })),
            });
        }

        return result;
    }, [captions]);

    return (
        <AbsoluteFill
            style={{
                backgroundColor: videoSrc ? "#000000" : backgroundColor,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            {/* Source video — blurred background + full-frame foreground */}
            {videoSrc ? (
                <>
                    {/* Background: blurred & zoomed to fill 9:16 frame */}
                    <AbsoluteFill>
                        <Video
                            src={staticFile(videoSrc)}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                filter: "blur(20px)",
                                transform: "scale(1.15)",
                            }}
                        />
                    </AbsoluteFill>
                    {/* Foreground: original video at full visibility */}
                    <AbsoluteFill
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <Video
                            src={staticFile(videoSrc)}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                            }}
                        />
                    </AbsoluteFill>
                </>
            ) : null}

            {/* Radial vignette — darkens edges so text pops */}
            <AbsoluteFill
                style={{
                    background: `radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.45) 70%)`,
                }}
            />

            {/* ClipMint branding watermark */}
            <div
                style={{
                    position: "absolute",
                    top: 40,
                    right: 40,
                    color: "rgba(255,255,255,0.15)",
                    fontSize: 24,
                    fontFamily: "Inter, Arial, sans-serif",
                    fontWeight: 700,
                    letterSpacing: 2,
                }}
            >
                CLIPMINT
            </div>

            {/* Caption pages — each rendered as a Sequence */}
            {pages.map((page, pageIndex) => {
                const startFrame = Math.round((page.startMs / 1000) * fps);
                const endFrame = Math.round(
                    ((page.startMs + (page.durationMs ?? 2000)) / 1000) * fps
                );
                const durationInFrames = Math.max(1, endFrame - startFrame);

                return (
                    <Sequence
                        key={`page-${pageIndex}`}
                        from={startFrame}
                        durationInFrames={durationInFrames}
                    >
                        <PageRenderer
                            page={page}
                            style={captionStyle}
                            accentColor={accentColor}
                            fontSize={fontSize}
                            pageIndex={pageIndex}
                            width={width}
                        />
                    </Sequence>
                );
            })}
        </AbsoluteFill>
    );
};

// ---------------------------------------------------------------------------
// PageRenderer — routes to the correct style component
// ---------------------------------------------------------------------------
interface TikTokPage {
    startMs: number;
    durationMs?: number;
    tokens: Array<{ text: string; fromMs: number; toMs: number }>;
}

interface PageRendererProps {
    page: TikTokPage;
    style: CaptionedClipProps["captionStyle"];
    accentColor: string;
    fontSize: number;
    pageIndex: number;
    width: number;
}

const PageRenderer: React.FC<PageRendererProps> = (props) => {
    switch (props.style) {
        case "hormozi":
            return <HormoziPage {...props} />;
        case "bounce":
            return <BouncePage {...props} />;
        case "fade":
            return <FadePage {...props} />;
        case "glow":
            return <GlowPage {...props} />;
        case "typewriter":
            return <TypewriterPage {...props} />;
        case "glitch":
            return <GlitchPage {...props} />;
        case "neon":
            return <NeonPage {...props} />;
        case "colorful":
            return <ColorfulPage {...props} />;
        case "minimal":
            return <MinimalPage {...props} />;
        default:
            return <HormoziPage {...props} />;
    }
};

// ---------------------------------------------------------------------------
// Shared wrapper — positions captions in the lower third
// ---------------------------------------------------------------------------
const CaptionWrapper: React.FC<{ children: React.ReactNode; width: number }> = ({
    children,
    width,
}) => (
    <AbsoluteFill
        style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: 200,
            paddingLeft: 60,
            paddingRight: 60,
        }}
    >
        <div style={{ maxWidth: width - 120, textAlign: "center" }}>{children}</div>
    </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// Helper: get active token index based on current playback position
// ---------------------------------------------------------------------------
function useActiveTokenIndex(page: TikTokPage): number {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    // relFrame is the frame within this Sequence (starts at 0)
    const absoluteMs = page.startMs + (frame / fps) * 1000;
    let active = -1;
    for (let i = 0; i < page.tokens.length; i++) {
        if (absoluteMs >= page.tokens[i].fromMs) {
            active = i;
        }
    }
    return active;
}

// ===========================================================================
// STYLE 1: HORMOZI — word-by-word highlight with real timestamps
// ===========================================================================
const HormoziPage: React.FC<PageRendererProps> = ({ page, accentColor, fontSize, width }) => {
    const { fps } = useVideoConfig();
    const frame = useCurrentFrame();
    const activeIdx = useActiveTokenIndex(page);

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 12,
                }}
            >
                {page.tokens.map((token, i) => {
                    const isActive = i === activeIdx;
                    const tokenStartFrame = Math.round(
                        ((token.fromMs - page.startMs) / 1000) * fps
                    );
                    const scale = isActive
                        ? spring({
                            frame: Math.max(0, frame - tokenStartFrame),
                            fps,
                            config: { stiffness: 300, damping: 20 },
                        })
                        : 1;

                    return (
                        <span
                            key={i}
                            style={{
                                fontSize,
                                fontFamily: "'Inter', 'Arial Black', sans-serif",
                                fontWeight: 900,
                                color: isActive ? accentColor : "#FFFFFF",
                                textTransform: "uppercase",
                                WebkitTextStroke: isActive ? "0px" : "2px rgba(0,0,0,0.8)",
                                paintOrder: "stroke fill",
                                transform: `scale(${isActive ? 1 + scale * 0.15 : 1})`,
                                display: "inline-block",
                                textShadow: isActive
                                    ? `0 0 30px ${accentColor}66, 0 4px 8px rgba(0,0,0,0.5)`
                                    : "0 4px 8px rgba(0,0,0,0.5)",
                            }}
                        >
                            {token.text}
                        </span>
                    );
                })}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// STYLE 2: BOUNCE
// ===========================================================================
const BouncePage: React.FC<PageRendererProps> = ({ page, accentColor, fontSize, width }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const text = page.tokens.map((t) => t.text).join(" ");

    const entrance = spring({ frame, fps, config: { stiffness: 200, damping: 12 } });
    const translateY = interpolate(entrance, [0, 1], [80, 0]);
    const scale = interpolate(entrance, [0, 1], [0.5, 1]);

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    fontSize,
                    fontFamily: "'Inter', 'Arial Black', sans-serif",
                    fontWeight: 900,
                    color: "#FFFFFF",
                    textTransform: "uppercase",
                    transform: `translateY(${translateY}px) scale(${scale})`,
                    textShadow: `0 0 20px ${accentColor}88, 0 6px 12px rgba(0,0,0,0.6)`,
                    WebkitTextStroke: "2px rgba(0,0,0,0.6)",
                    paintOrder: "stroke fill",
                }}
            >
                {text}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// STYLE 3: FADE
// ===========================================================================
const FadePage: React.FC<PageRendererProps> = ({ page, fontSize, width }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const text = page.tokens.map((t) => t.text).join(" ");

    const opacity = interpolate(
        frame,
        [0, 8, durationInFrames - 8, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateRight: "clamp" }
    );

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    fontSize: fontSize * 0.9,
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    opacity,
                    textShadow: "0 4px 12px rgba(0,0,0,0.6)",
                }}
            >
                {text}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// STYLE 4: GLOW (pulsing, with active-word highlight)
// ===========================================================================
const GlowPage: React.FC<PageRendererProps> = ({ page, accentColor, fontSize, width }) => {
    const frame = useCurrentFrame();
    const pulse = Math.sin(frame * 0.15) * 0.3 + 0.7;
    const activeIdx = useActiveTokenIndex(page);

    return (
        <CaptionWrapper width={width}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
                {page.tokens.map((token, i) => {
                    const isActive = i === activeIdx;
                    return (
                        <span
                            key={i}
                            style={{
                                fontSize,
                                fontFamily: "'Inter', sans-serif",
                                fontWeight: 800,
                                color: isActive ? accentColor : "#FFFFFF",
                                textShadow: isActive
                                    ? `0 0 ${20 * pulse}px ${accentColor}, 0 0 ${40 * pulse}px ${accentColor}88`
                                    : "0 4px 8px rgba(0,0,0,0.5)",
                                textTransform: "uppercase",
                                display: "inline-block",
                            }}
                        >
                            {token.text}
                        </span>
                    );
                })}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// STYLE 5: TYPEWRITER
// ===========================================================================
const TypewriterPage: React.FC<PageRendererProps> = ({ page, fontSize, width }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const fullText = page.tokens.map((t) => t.text).join(" ");

    const charsToShow = Math.floor(
        interpolate(frame, [0, durationInFrames * 0.6], [0, fullText.length], {
            extrapolateRight: "clamp",
        })
    );

    const visibleText = fullText.slice(0, charsToShow);
    const showCursor = frame % 16 < 10;

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    fontSize: fontSize * 0.85,
                    fontFamily: "'Courier New', 'Fira Code', monospace",
                    fontWeight: 700,
                    color: "#00FF88",
                    textShadow: "0 0 10px rgba(0,255,136,0.4), 0 4px 8px rgba(0,0,0,0.5)",
                    textAlign: "left",
                    whiteSpace: "pre-wrap",
                }}
            >
                {visibleText}
                {showCursor && <span style={{ color: "#00FF88", opacity: 0.8 }}>▌</span>}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// STYLE 6: GLITCH
// ===========================================================================
const GlitchPage: React.FC<PageRendererProps> = ({ page, accentColor, fontSize, width }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const text = page.tokens.map((t) => t.text).join(" ");

    const entrance = spring({ frame, fps, config: { stiffness: 400, damping: 15 } });
    const glitchOffset = frame % 8 < 2 ? (Math.random() - 0.5) * 6 : 0;

    return (
        <CaptionWrapper width={width}>
            <div style={{ position: "relative" }}>
                <div
                    style={{
                        position: "absolute",
                        fontSize,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 900,
                        color: "#FF0040",
                        textTransform: "uppercase",
                        transform: `translate(${glitchOffset}px, ${-glitchOffset}px)`,
                        opacity: frame % 8 < 2 ? 0.7 : 0,
                        clipPath: "inset(10% 0 40% 0)",
                    }}
                >
                    {text}
                </div>
                <div
                    style={{
                        position: "absolute",
                        fontSize,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 900,
                        color: "#00FFFF",
                        textTransform: "uppercase",
                        transform: `translate(${-glitchOffset}px, ${glitchOffset}px)`,
                        opacity: frame % 8 < 2 ? 0.7 : 0,
                        clipPath: "inset(50% 0 10% 0)",
                    }}
                >
                    {text}
                </div>
                <div
                    style={{
                        fontSize,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 900,
                        color: "#FFFFFF",
                        textTransform: "uppercase",
                        transform: `scale(${entrance})`,
                        textShadow: "0 4px 8px rgba(0,0,0,0.5)",
                    }}
                >
                    {text}
                </div>
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// STYLE 7: NEON
// ===========================================================================
const NeonPage: React.FC<PageRendererProps> = ({ page, accentColor, fontSize, width }) => {
    const frame = useCurrentFrame();
    const text = page.tokens.map((t) => t.text).join(" ");
    const flicker = frame < 6 ? (frame % 3 === 0 ? 0.3 : 1) : 1;

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    fontSize,
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 300,
                    color: accentColor,
                    opacity: flicker,
                    textShadow: `
            0 0 7px ${accentColor},
            0 0 10px ${accentColor},
            0 0 21px ${accentColor},
            0 0 42px ${accentColor}88,
            0 0 82px ${accentColor}44,
            0 0 92px ${accentColor}22
          `,
                    textTransform: "uppercase",
                    letterSpacing: 4,
                }}
            >
                {text}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// STYLE 8: COLORFUL — rainbow word-by-word with real timing
// ===========================================================================
const RAINBOW_COLORS = [
    "#FF6B6B", "#FFA07A", "#FFD93D", "#6BCB77",
    "#4D96FF", "#9B59B6", "#FF6B9D", "#00D2FF",
];

const ColorfulPage: React.FC<PageRendererProps> = ({ page, fontSize, width }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const activeIdx = useActiveTokenIndex(page);

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 10,
                }}
            >
                {page.tokens.map((token, i) => {
                    const tokenStartFrame = Math.round(
                        ((token.fromMs - page.startMs) / 1000) * fps
                    );
                    const delay = Math.max(0, tokenStartFrame);
                    const entrance = spring({
                        frame: Math.max(0, frame - delay),
                        fps,
                        config: { stiffness: 250, damping: 18 },
                    });

                    return (
                        <span
                            key={i}
                            style={{
                                fontSize,
                                fontFamily: "'Inter', sans-serif",
                                fontWeight: 900,
                                color: RAINBOW_COLORS[i % RAINBOW_COLORS.length],
                                transform: `scale(${entrance}) rotate(${(1 - entrance) * -10}deg)`,
                                display: "inline-block",
                                textShadow: "0 4px 8px rgba(0,0,0,0.4)",
                                WebkitTextStroke: "1px rgba(0,0,0,0.3)",
                                paintOrder: "stroke fill",
                                // Dim words not yet spoken
                                opacity: i <= activeIdx + 1 ? 1 : 0.5,
                            }}
                        >
                            {token.text}
                        </span>
                    );
                })}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// STYLE 9: MINIMAL
// ===========================================================================
const MinimalPage: React.FC<PageRendererProps> = ({ page, fontSize, width }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const text = page.tokens.map((t) => t.text).join(" ");

    const entrance = spring({ frame, fps, config: { stiffness: 100, damping: 20 } });
    const exit = interpolate(
        frame,
        [durationInFrames - 10, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    backgroundColor: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(8px)",
                    padding: "16px 32px",
                    borderRadius: 12,
                    opacity: entrance * exit,
                    transform: `translateY(${(1 - entrance) * 20}px)`,
                }}
            >
                <div
                    style={{
                        fontSize: fontSize * 0.75,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        color: "#FFFFFF",
                        letterSpacing: 0.5,
                    }}
                >
                    {text}
                </div>
            </div>
        </CaptionWrapper>
    );
};
