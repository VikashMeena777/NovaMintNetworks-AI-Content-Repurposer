/**
 * CaptionedClip — ClipMint's professional animated caption renderer.
 *
 * Skills applied:
 * ├── fonts.md          → @remotion/google-fonts (Inter loaded, render-blocking)
 * ├── display-captions  → createTikTokStyleCaptions() for smart page grouping
 * ├── timing.md         → Easing.bezier() curves for premium animation feel
 * ├── audio-viz.md      → visualizeAudio() for bass-reactive caption effects
 * ├── silence-detect.md → trimStartSec / trimEndSec props for clean clip edges
 * └── videos.md         → @remotion/media <Video> with trimBefore / trimAfter
 */
import React, { useMemo } from "react";
import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    Sequence,
    interpolate,
    Easing,
    spring,
    staticFile,
} from "remotion";
import { Video } from "@remotion/media";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import {
    type Caption,
    type TikTokPage,
    createTikTokStyleCaptions,
} from "@remotion/captions";
import { loadFont } from "@remotion/google-fonts/Inter";
import {
    useWindowedAudioData,
    visualizeAudio,
} from "@remotion/media-utils";

// ---------------------------------------------------------------------------
// Font Loading — blocks render until Inter is available (fonts.md skill)
// ---------------------------------------------------------------------------
const { fontFamily: interFont } = loadFont("normal", {
    weights: ["400", "500", "700", "800", "900"],
    subsets: ["latin"],
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How often captions should switch pages (ms). Lower = fewer words per page.
 *  1200ms ≈ 2-4 words, respects silence boundaries automatically. */
const SWITCH_CAPTIONS_EVERY_MS = 1200;

/** Bezier curves from timing.md skill — copy-paste ready */
const EASE_CRISP_ENTER = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_EDITORIAL = Easing.bezier(0.45, 0, 0.55, 1);
const EASE_PLAYFUL_OVERSHOOT = Easing.bezier(0.34, 1.56, 0.64, 1);

// ---------------------------------------------------------------------------
// Schema — defines props that can be set from CLI / Remotion Studio
// ---------------------------------------------------------------------------
export const captionedClipSchema = z.object({
    /** Path to the source video clip (relative to public/). Empty = captions-only. */
    videoSrc: z.string().default(""),
    /** Composition duration in frames. Overridden by calculateMetadata at render time. */
    durationInFrames: z.number().int().min(1).default(300),
    /** JSON string of Caption[] — per-word timestamps from Groq verbose_json. */
    captionsData: z.string(),
    /** Caption animation style preset. */
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
    /** Background color (used only when videoSrc is empty). */
    backgroundColor: zColor(),
    /** Accent color for highlights. */
    accentColor: zColor(),
    /** Base font size in pixels. */
    fontSize: z.number().min(24).max(120),
    /** Seconds of leading silence to trim from clip start (silence-detection.md). */
    trimStartSec: z.number().min(0).default(0),
    /** Seconds to trim from clip end (silence-detection.md). 0 = no trim. */
    trimEndSec: z.number().min(0).default(0),
});

export type CaptionedClipProps = z.infer<typeof captionedClipSchema>;

// ---------------------------------------------------------------------------
// Bass-Reactive Hook (audio-visualization.md skill)
// ---------------------------------------------------------------------------
function useBassIntensity(videoSrc: string): number {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const audioSrc = videoSrc ? staticFile(videoSrc) : undefined;

    const { audioData, dataOffsetInSeconds } = useWindowedAudioData({
        src: audioSrc ?? staticFile("silence.mp3"),
        frame,
        fps,
        windowInSeconds: 10,
        enabled: Boolean(audioSrc),
    });

    return useMemo(() => {
        if (!audioData || !audioSrc) return 0;
        try {
            const frequencies = visualizeAudio({
                fps,
                frame,
                audioData,
                numberOfSamples: 128,
                optimizeFor: "speed",
                dataOffsetInSeconds,
            });
            // Bass = lowest 16 frequency bins
            const lowFreqs = frequencies.slice(0, 16);
            return lowFreqs.reduce((sum, v) => sum + v, 0) / lowFreqs.length;
        } catch {
            return 0;
        }
    }, [audioData, audioSrc, frame, fps, dataOffsetInSeconds]);
}

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
    trimStartSec,
    trimEndSec,
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

    // Smart page grouping using official API (display-captions.md skill)
    // Replaces the manual MAX_WORDS=3 loop. Handles silence gaps, natural
    // phrase boundaries, and whitespace preservation automatically.
    const pages = useMemo(() => {
        if (captions.length === 0) return [];
        const { pages: tikTokPages } = createTikTokStyleCaptions({
            captions,
            combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
        });
        return tikTokPages;
    }, [captions]);

    // Bass-reactive intensity for styles that pulse with the beat
    const bassIntensity = useBassIntensity(videoSrc);

    // Trim frames from silence-detection.md skill
    const trimBeforeFrames = Math.floor(trimStartSec * fps);
    const trimAfterFrames =
        trimEndSec > 0 ? Math.ceil(trimEndSec * fps) : undefined;

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
            {/* Uses @remotion/media <Video> with trim support (videos.md skill) */}
            {videoSrc ? (
                <>
                    {/* Background: blurred & zoomed to fill 9:16 frame */}
                    <AbsoluteFill>
                        <Video
                            src={staticFile(videoSrc)}
                            trimBefore={trimBeforeFrames}
                            trimAfter={trimAfterFrames}
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
                            trimBefore={trimBeforeFrames}
                            trimAfter={trimAfterFrames}
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
                    fontFamily: interFont,
                    fontWeight: 700,
                    letterSpacing: 2,
                }}
            >
                CLIPMINT
            </div>

            {/* Caption pages — each rendered as a Sequence (display-captions.md) */}
            {pages.map((page, pageIndex) => {
                const nextPage = pages[pageIndex + 1] ?? null;
                const startFrame = Math.round((page.startMs / 1000) * fps);
                const endFrame = Math.min(
                    nextPage
                        ? Math.round((nextPage.startMs / 1000) * fps)
                        : Infinity,
                    startFrame +
                        Math.round((SWITCH_CAPTIONS_EVERY_MS / 1000) * fps),
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
                            bassIntensity={bassIntensity}
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
interface PageRendererProps {
    page: TikTokPage;
    style: CaptionedClipProps["captionStyle"];
    accentColor: string;
    fontSize: number;
    pageIndex: number;
    width: number;
    bassIntensity: number;
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
// Helper: active token detection using official pattern (display-captions.md)
// Uses absolute time comparison instead of index-based matching.
// ---------------------------------------------------------------------------
function useActiveTokenIndex(page: TikTokPage): number {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    // Current time relative to the start of the Sequence
    const currentTimeMs = (frame / fps) * 1000;
    // Convert to absolute time by adding the page start
    const absoluteTimeMs = page.startMs + currentTimeMs;

    let active = -1;
    for (let i = 0; i < page.tokens.length; i++) {
        if (
            page.tokens[i].fromMs <= absoluteTimeMs &&
            page.tokens[i].toMs > absoluteTimeMs
        ) {
            active = i;
            break;
        }
    }
    // Fallback: if no token is precisely active, find the most recent one
    if (active === -1) {
        for (let i = 0; i < page.tokens.length; i++) {
            if (page.tokens[i].fromMs <= absoluteTimeMs) {
                active = i;
            }
        }
    }
    return active;
}

// ===========================================================================
// STYLE 1: HORMOZI — word-by-word highlight with bass-reactive pop
// ===========================================================================
const HormoziPage: React.FC<PageRendererProps> = ({
    page,
    accentColor,
    fontSize,
    width,
    bassIntensity,
}) => {
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
                        ((token.fromMs - page.startMs) / 1000) * fps,
                    );
                    // Crisp entrance with playful overshoot (timing.md)
                    const entrance = interpolate(
                        Math.max(0, frame - tokenStartFrame),
                        [0, 8],
                        [0, 1],
                        {
                            easing: EASE_PLAYFUL_OVERSHOOT,
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                        },
                    );
                    // Bass-reactive extra scale on active word (audio-viz.md)
                    const bassBoost = isActive ? bassIntensity * 0.15 : 0;
                    const scale = isActive ? 1 + entrance * 0.15 + bassBoost : 1;

                    return (
                        <span
                            key={i}
                            style={{
                                fontSize,
                                fontFamily: interFont,
                                fontWeight: 900,
                                color: isActive ? accentColor : "#FFFFFF",
                                textTransform: "uppercase",
                                WebkitTextStroke: isActive
                                    ? "0px"
                                    : "2px rgba(0,0,0,0.8)",
                                paintOrder: "stroke fill",
                                transform: `scale(${scale})`,
                                display: "inline-block",
                                textShadow: isActive
                                    ? `0 0 ${30 + bassIntensity * 20}px ${accentColor}66, 0 4px 8px rgba(0,0,0,0.5)`
                                    : "0 4px 8px rgba(0,0,0,0.5)",
                                whiteSpace: "pre",
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
// STYLE 2: BOUNCE — playful overshoot entrance (timing.md)
// ===========================================================================
const BouncePage: React.FC<PageRendererProps> = ({
    page,
    accentColor,
    fontSize,
    width,
    bassIntensity,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const text = page.tokens.map((t) => t.text).join("");

    // Playful overshoot curve instead of basic spring
    const entrance = interpolate(frame, [0, 15], [0, 1], {
        easing: EASE_PLAYFUL_OVERSHOOT,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    const translateY = interpolate(entrance, [0, 1], [80, 0]);
    const scale = interpolate(entrance, [0, 1], [0.5, 1]) + bassIntensity * 0.05;

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    fontSize,
                    fontFamily: interFont,
                    fontWeight: 900,
                    color: "#FFFFFF",
                    textTransform: "uppercase",
                    transform: `translateY(${translateY}px) scale(${scale})`,
                    textShadow: `0 0 20px ${accentColor}88, 0 6px 12px rgba(0,0,0,0.6)`,
                    WebkitTextStroke: "2px rgba(0,0,0,0.6)",
                    paintOrder: "stroke fill",
                    whiteSpace: "pre",
                }}
            >
                {text}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// STYLE 3: FADE — editorial ease-in-out (timing.md)
// ===========================================================================
const FadePage: React.FC<PageRendererProps> = ({ page, fontSize, width }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const text = page.tokens.map((t) => t.text).join("");

    // Editorial ease-in-out curve for smooth fade
    const fadeIn = interpolate(frame, [0, 12], [0, 1], {
        easing: EASE_EDITORIAL,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    const fadeOut = interpolate(
        frame,
        [durationInFrames - 12, durationInFrames],
        [1, 0],
        {
            easing: EASE_EDITORIAL,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
        },
    );

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    fontSize: fontSize * 0.9,
                    fontFamily: interFont,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    opacity: fadeIn * fadeOut,
                    textShadow: "0 4px 12px rgba(0,0,0,0.6)",
                    whiteSpace: "pre",
                }}
            >
                {text}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// STYLE 4: GLOW — pulsing glow with bass-reactive intensity
// ===========================================================================
const GlowPage: React.FC<PageRendererProps> = ({
    page,
    accentColor,
    fontSize,
    width,
    bassIntensity,
}) => {
    const frame = useCurrentFrame();
    const pulse = Math.sin(frame * 0.15) * 0.3 + 0.7;
    const activeIdx = useActiveTokenIndex(page);
    // Bass boosts the glow radius
    const glowMultiplier = pulse + bassIntensity * 0.5;

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
                    const isActive = i === activeIdx;
                    return (
                        <span
                            key={i}
                            style={{
                                fontSize,
                                fontFamily: interFont,
                                fontWeight: 800,
                                color: isActive ? accentColor : "#FFFFFF",
                                textShadow: isActive
                                    ? `0 0 ${20 * glowMultiplier}px ${accentColor}, 0 0 ${40 * glowMultiplier}px ${accentColor}88`
                                    : "0 4px 8px rgba(0,0,0,0.5)",
                                textTransform: "uppercase",
                                display: "inline-block",
                                whiteSpace: "pre",
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
// STYLE 5: TYPEWRITER — character reveal with eased speed (timing.md)
// ===========================================================================
const TypewriterPage: React.FC<PageRendererProps> = ({ page, fontSize, width }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const fullText = page.tokens.map((t) => t.text).join("");

    // Eased reveal speed — starts fast, slows down naturally
    const progress = interpolate(frame, [0, durationInFrames * 0.6], [0, 1], {
        easing: Easing.out(Easing.cubic),
        extrapolateRight: "clamp",
    });
    const charsToShow = Math.floor(progress * fullText.length);
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
                    textShadow:
                        "0 0 10px rgba(0,255,136,0.4), 0 4px 8px rgba(0,0,0,0.5)",
                    textAlign: "left",
                    whiteSpace: "pre-wrap",
                }}
            >
                {visibleText}
                {showCursor && (
                    <span style={{ color: "#00FF88", opacity: 0.8 }}>▌</span>
                )}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// STYLE 6: GLITCH — crisp entrance with RGB split
// ===========================================================================
const GlitchPage: React.FC<PageRendererProps> = ({
    page,
    accentColor,
    fontSize,
    width,
    bassIntensity,
}) => {
    const frame = useCurrentFrame();
    const text = page.tokens.map((t) => t.text).join("");

    // Crisp entrance curve (timing.md) instead of basic spring
    const entrance = interpolate(frame, [0, 10], [0, 1], {
        easing: EASE_CRISP_ENTER,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    // Glitch intensity increases with bass (audio-viz.md)
    const glitchActive = frame % 8 < 2;
    const glitchStrength = glitchActive ? 3 + bassIntensity * 8 : 0;
    const glitchOffset = glitchActive ? (Math.sin(frame * 17) * glitchStrength) : 0;

    return (
        <CaptionWrapper width={width}>
            <div style={{ position: "relative" }}>
                {/* Red channel offset */}
                <div
                    style={{
                        position: "absolute",
                        fontSize,
                        fontFamily: interFont,
                        fontWeight: 900,
                        color: "#FF0040",
                        textTransform: "uppercase",
                        transform: `translate(${glitchOffset}px, ${-glitchOffset}px)`,
                        opacity: glitchActive ? 0.7 : 0,
                        clipPath: "inset(10% 0 40% 0)",
                        whiteSpace: "pre",
                    }}
                >
                    {text}
                </div>
                {/* Cyan channel offset */}
                <div
                    style={{
                        position: "absolute",
                        fontSize,
                        fontFamily: interFont,
                        fontWeight: 900,
                        color: "#00FFFF",
                        textTransform: "uppercase",
                        transform: `translate(${-glitchOffset}px, ${glitchOffset}px)`,
                        opacity: glitchActive ? 0.7 : 0,
                        clipPath: "inset(50% 0 10% 0)",
                        whiteSpace: "pre",
                    }}
                >
                    {text}
                </div>
                {/* Main white text */}
                <div
                    style={{
                        fontSize,
                        fontFamily: interFont,
                        fontWeight: 900,
                        color: "#FFFFFF",
                        textTransform: "uppercase",
                        transform: `scale(${entrance})`,
                        textShadow: "0 4px 8px rgba(0,0,0,0.5)",
                        whiteSpace: "pre",
                    }}
                >
                    {text}
                </div>
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// STYLE 7: NEON — bass-reactive flicker intensity
// ===========================================================================
const NeonPage: React.FC<PageRendererProps> = ({
    page,
    accentColor,
    fontSize,
    width,
    bassIntensity,
}) => {
    const frame = useCurrentFrame();
    const text = page.tokens.map((t) => t.text).join("");

    // Neon flicker entrance — bass makes it more intense
    const baseFlicker = frame < 6 ? (frame % 3 === 0 ? 0.3 : 1) : 1;
    const flicker = baseFlicker + bassIntensity * 0.2;
    const glowSize = 42 + bassIntensity * 30;

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    fontSize,
                    fontFamily: interFont,
                    fontWeight: 300,
                    color: accentColor,
                    opacity: Math.min(1, flicker),
                    textShadow: `
                        0 0 7px ${accentColor},
                        0 0 10px ${accentColor},
                        0 0 21px ${accentColor},
                        0 0 ${glowSize}px ${accentColor}88,
                        0 0 82px ${accentColor}44,
                        0 0 92px ${accentColor}22
                    `,
                    textTransform: "uppercase",
                    letterSpacing: 4,
                    whiteSpace: "pre",
                }}
            >
                {text}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// STYLE 8: COLORFUL — rainbow word-by-word with overshoot entrance
// ===========================================================================
const RAINBOW_COLORS = [
    "#FF6B6B",
    "#FFA07A",
    "#FFD93D",
    "#6BCB77",
    "#4D96FF",
    "#9B59B6",
    "#FF6B9D",
    "#00D2FF",
];

const ColorfulPage: React.FC<PageRendererProps> = ({
    page,
    fontSize,
    width,
    bassIntensity,
}) => {
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
                        ((token.fromMs - page.startMs) / 1000) * fps,
                    );
                    const delay = Math.max(0, tokenStartFrame);
                    // Playful overshoot entrance per word (timing.md)
                    const entrance = interpolate(
                        Math.max(0, frame - delay),
                        [0, 12],
                        [0, 1],
                        {
                            easing: EASE_PLAYFUL_OVERSHOOT,
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                        },
                    );
                    const rotation = (1 - entrance) * -10;
                    const scale = entrance + (i <= activeIdx ? bassIntensity * 0.05 : 0);

                    return (
                        <span
                            key={i}
                            style={{
                                fontSize,
                                fontFamily: interFont,
                                fontWeight: 900,
                                color: RAINBOW_COLORS[i % RAINBOW_COLORS.length],
                                transform: `scale(${scale}) rotate(${rotation}deg)`,
                                display: "inline-block",
                                textShadow: "0 4px 8px rgba(0,0,0,0.4)",
                                WebkitTextStroke: "1px rgba(0,0,0,0.3)",
                                paintOrder: "stroke fill",
                                opacity: i <= activeIdx + 1 ? 1 : 0.5,
                                whiteSpace: "pre",
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
// STYLE 9: MINIMAL — glass card with crisp entrance/exit (timing.md)
// ===========================================================================
const MinimalPage: React.FC<PageRendererProps> = ({ page, fontSize, width }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const text = page.tokens.map((t) => t.text).join("");

    // Crisp UI entrance (timing.md) — no spring, clean deceleration
    const entrance = interpolate(frame, [0, 12], [0, 1], {
        easing: EASE_CRISP_ENTER,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    const exit = interpolate(
        frame,
        [durationInFrames - 10, durationInFrames],
        [1, 0],
        {
            easing: Easing.in(Easing.cubic),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
        },
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
                        fontFamily: interFont,
                        fontWeight: 500,
                        color: "#FFFFFF",
                        letterSpacing: 0.5,
                        whiteSpace: "pre",
                    }}
                >
                    {text}
                </div>
            </div>
        </CaptionWrapper>
    );
};
