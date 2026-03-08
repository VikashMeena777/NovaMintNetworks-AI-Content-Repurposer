# 🚀 ClipMint — Quality Improvements & Production Roadmap

**Version:** 1.0 | **Date:** March 8, 2026  
**Purpose:** Transform ClipMint from a basic AI clipper into a production-grade viral content engine that competes with Opus Clip, Vidyo.ai, and Descript.

---

## Current State: What We Have

```
Audio → Groq Whisper (transcript text) → Groq LLaMA 3.3 (text analysis) → clip timestamps
```

**Limitations of the current approach:**

| Weakness | Impact |
|----------|--------|
| Text-only analysis — ignores audio energy & visual cues | Misses shouting, laughter, applause, facial reactions |
| 8K char transcript limit — only sees first ~15 min | Completely misses viral moments in the back half of long videos |
| Single-pass AI — one LLM call, one opinion | No cross-validation, inconsistent scoring |
| No scene detection — cuts at word boundaries only | Clips can start mid-visual-cut or during B-roll |
| No engagement signals | Can't leverage YouTube "most replayed" or audience retention data |
| No clip quality validation | Can't verify the rendered output meets quality standards |

---

## Improvement Tiers

### 🔴 TIER 1 — High Impact, Easy to Implement (Week 1-2)

---

#### 1.1 Full Transcript Coverage (Sliding Window)

**Problem:** Current pipeline truncates transcript at 8,000 characters (~15 min of speech). A 60-min podcast has ~50K characters — the AI never sees minutes 15–60.

**Solution:** Sliding window analysis with overlap.

**Tool:** Python (already in pipeline)

**Implementation:**
```python
# In process-video.yml Step 5 (AI viral moment detection)
WINDOW_SIZE = 6000       # chars per window
OVERLAP = 1000           # chars overlap between windows
MIN_VIRAL_SCORE = 60     # minimum score to keep

transcript = ' '.join(c['text'] for c in captions)
windows = []
for i in range(0, len(transcript), WINDOW_SIZE - OVERLAP):
    chunk = transcript[i:i + WINDOW_SIZE]
    window_start_sec = find_timestamp_at_char_position(captions, i)
    window_end_sec = find_timestamp_at_char_position(captions, i + len(chunk))
    windows.append({
        'text': chunk,
        'start_sec': window_start_sec,
        'end_sec': window_end_sec,
        'window_index': len(windows)
    })

# Send each window to Groq LLaMA in parallel (or sequential)
all_moments = []
for window in windows:
    moments = call_groq(window)
    all_moments.extend(moments)

# Deduplicate: merge moments with overlapping timestamps (within 5s)
final_moments = deduplicate_moments(all_moments, overlap_threshold_sec=5)

# Take top N by viral_score
final_moments.sort(key=lambda m: m['viral_score'], reverse=True)
clips = final_moments[:max_clips]
```

**Cost:** Same free tier — each window = 1 Groq API call. A 60-min video = ~8 windows = 8 API calls (well within 14.4K/day free limit).

**Expected Impact:** ⭐⭐⭐⭐⭐ — Guarantees no content is missed regardless of video length.

---

#### 1.2 Two-Pass AI Scoring (Find → Rank)

**Problem:** Single AI call tries to both discover AND rank moments. It often picks "safe" moments clustered near the start.

**Solution:** Two-pass approach that mimics how human editors work.

**Tool:** Groq API (same LLaMA 3.3 70B)

**Implementation:**

**Pass 1 — Discovery (generous):**
```
"Find ALL interesting moments in this transcript section. 
Be generous — include anything that MIGHT work as a standalone clip.
Return 20-30 candidates with approximate timestamps and a brief reason."
```

**Pass 2 — Ranking (strict):**
```
"Here are 25 candidate moments. Rank them strictly using this rubric:

1. HOOK STRENGTH (1-20): Does it grab attention in the first 3 seconds?
   - 20: Shocking statement, controversial claim, or "wait, what?"
   - 10: Interesting but needs context to appreciate
   - 1: Boring opening, no hook

2. STANDALONE VALUE (1-20): Does the clip make sense WITHOUT the full video?
   - 20: Complete story arc, self-contained insight
   - 10: Mostly makes sense but references earlier context
   - 1: Completely confusing without context

3. EMOTIONAL PEAK (1-20): Is there humor, surprise, controversy, or deep insight?
   - 20: Guaranteed emotional reaction (laughter, shock, "wow")
   - 10: Mildly interesting
   - 1: Flat, no emotional charge

4. SHAREABILITY (1-20): Would someone tag a friend or repost this?
   - 20: "I NEED to send this to 5 people right now"
   - 10: Worth a like but not a share
   - 1: No one would share this

5. COMPLETION (1-20): Does it have a natural start and end point?
   - 20: Perfect clip boundaries — starts clean, ends satisfying
   - 10: Starts or ends a bit awkwardly
   - 1: Cuts mid-sentence or mid-thought

Return the top 10 with total_score (sum of all 5) as viral_score."
```

**Cost:** 2x Groq API calls per window instead of 1x. Still well within free tier.

**Expected Impact:** ⭐⭐⭐⭐⭐ — Dramatically better clip selection. The structured rubric eliminates subjective/inconsistent scoring.

---

#### 1.3 Audio Energy Analysis

**Problem:** Text analysis can't detect acoustic signals like shouting, laughter, applause, music drops, or silence gaps. A sentence typed in lowercase looks the same as one screamed at the top of someone's lungs.

**Solution:** FFmpeg audio loudness analysis to create an "energy curve" — then combine with AI text scores.

**Tool:** FFmpeg `astats` filter + Python (already installed in pipeline)

**Implementation:**
```bash
# Step: Analyze audio energy (add between Step 3 and Step 4)
# Compute RMS energy per 1-second window
ffmpeg -i workspace/audio/audio.wav \
  -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=workspace/audio/energy.txt" \
  -f null - 2>/dev/null
```

```python
# Parse energy.txt into per-second energy values
import re

energy_data = []
with open('workspace/audio/energy.txt') as f:
    for line in f:
        match = re.search(r'pts_time:(\d+\.?\d*)', line)
        if match:
            timestamp = float(match.group(1))
        match = re.search(r'RMS_level=(-?\d+\.?\d*)', line)
        if match:
            rms = float(match.group(1))
            energy_data.append({'time': timestamp, 'rms_db': rms})

# Find energy peaks (moments louder than average + 1 standard deviation)
import statistics
rms_values = [e['rms_db'] for e in energy_data if e['rms_db'] > -100]
mean_rms = statistics.mean(rms_values)
std_rms = statistics.stdev(rms_values)
threshold = mean_rms + std_rms

energy_peaks = [e for e in energy_data if e['rms_db'] > threshold]

# Boost viral_score for moments that overlap with energy peaks
for moment in viral_moments:
    start, end = moment['start_time'], moment['end_time']
    peak_count = sum(1 for p in energy_peaks if start <= p['time'] <= end)
    energy_bonus = min(15, peak_count * 3)  # up to +15 points
    moment['viral_score'] = min(100, moment['viral_score'] + energy_bonus)
    moment['energy_peaks'] = peak_count
```

**Cost:** Zero — FFmpeg is already installed. Processing takes ~2 seconds.

**Expected Impact:** ⭐⭐⭐⭐ — Moments with both strong text AND high audio energy are almost certainly the best clips. This is the #1 signal that distinguishes Opus Clip from basic text-only clippers.

---

#### 1.4 Silence Detection for Clean Cut Points

**Problem:** Clips sometimes start/end mid-word or mid-sentence because timestamps come from the AI's rough estimate.

**Solution:** Use FFmpeg silence detection to find natural pauses, then snap clip boundaries to the nearest silence gap.

**Tool:** FFmpeg `silencedetect` filter

**Implementation:**
```bash
# Detect all silence gaps (>300ms of audio below -35dB)
ffmpeg -i workspace/audio/audio.wav \
  -af "silencedetect=noise=-35dB:d=0.3" \
  -f null - 2>&1 | grep "silence_" > workspace/audio/silences.txt
```

```python
# Parse silence gaps
silences = []
with open('workspace/audio/silences.txt') as f:
    for line in f:
        if 'silence_start' in line:
            start = float(re.search(r'silence_start: (\d+\.?\d*)', line).group(1))
        elif 'silence_end' in line:
            end = float(re.search(r'silence_end: (\d+\.?\d*)', line).group(1))
            silences.append((start, end))

def snap_to_silence(timestamp, silences, direction='nearest', max_shift=2.0):
    """Snap a timestamp to the nearest silence gap within max_shift seconds."""
    best = timestamp
    best_dist = float('inf')
    for s_start, s_end in silences:
        midpoint = (s_start + s_end) / 2
        dist = abs(midpoint - timestamp)
        if dist < best_dist and dist <= max_shift:
            best_dist = dist
            best = midpoint
    return best

# Snap clip start/end to silence gaps
for moment in viral_moments:
    moment['start_time'] = snap_to_silence(moment['start_time'], silences)
    moment['end_time'] = snap_to_silence(moment['end_time'], silences)
```

**Cost:** Zero — FFmpeg already installed.

**Expected Impact:** ⭐⭐⭐ — Eliminates jarring mid-word cuts. Professional feel.

---

### 🟡 TIER 2 — Medium Impact, Moderate Effort (Week 3-4)

---

#### 2.1 Visual Scene Detection with FFmpeg

**Problem:** Clips can start during B-roll or cut in the middle of a camera transition.

**Solution:** Detect visual scene changes and use them as clip boundary candidates.

**Tool:** FFmpeg `select` filter with scene change detection (no extra install needed)

**Implementation:**
```bash
# Detect scene changes (threshold 0.3 = moderate sensitivity)
ffmpeg -i workspace/source/source.mp4 \
  -filter:v "select='gt(scene,0.3)',showinfo" \
  -f null - 2>&1 | grep "showinfo" | \
  awk -F'pts_time:' '{print $2}' | awk '{print $1}' \
  > workspace/clips/scene_changes.txt
```

```python
# Read scene change timestamps
with open('workspace/clips/scene_changes.txt') as f:
    scene_changes = [float(line.strip()) for line in f if line.strip()]

# Prefer clip starts that align with scene changes (within 1.5 seconds)
for moment in viral_moments:
    for sc in scene_changes:
        if abs(sc - moment['start_time']) < 1.5:
            moment['start_time'] = sc
            moment['visual_aligned'] = True
            break
```

**Cost:** Zero — FFmpeg already installed. ~5 seconds processing.

**Alternative (more accurate):** Install PySceneDetect for content-aware detection:
```bash
pip install scenedetect[opencv]
scenedetect -i workspace/source/source.mp4 detect-content list-scenes
```

**Expected Impact:** ⭐⭐⭐ — Clips start at natural visual boundaries (camera cuts, new shots).

---

#### 2.2 YouTube Metadata Integration

**Problem:** We're not leveraging platform-specific signals that YouTube itself provides.

**Solution:** Extract chapters, description, and title from the source video for AI context.

**Tool:** yt-dlp `--dump-json` (already installed)

**Implementation:**
```bash
# Already downloading with yt-dlp — add metadata extraction
yt-dlp --dump-json --no-download "$VIDEO_URL" > workspace/source/metadata.json
```

```python
import json
with open('workspace/source/metadata.json') as f:
    meta = json.load(f)

# Extract useful signals
chapters = meta.get('chapters', [])        # Creator-defined segments
description = meta.get('description', '')  # Often contains timestamps
title = meta.get('title', '')
tags = meta.get('tags', [])
duration = meta.get('duration', 0)
view_count = meta.get('view_count', 0)

# Feed chapters to the AI as hints
if chapters:
    chapter_text = '\n'.join(
        f"- [{c['start_time']:.0f}s - {c['end_time']:.0f}s] {c['title']}"
        for c in chapters
    )
    # Add to AI prompt: "The creator marked these chapters: {chapter_text}"
```

**Cost:** Zero — yt-dlp already installed, metadata extraction is instant.

**Expected Impact:** ⭐⭐⭐ — Chapters tell the AI exactly where topic changes happen. The AI can make much better clip boundary decisions.

---

#### 2.3 Smart Clip Length Optimization

**Problem:** Currently all clips are forced between 15–60 seconds. But different content types have optimal lengths.

**Solution:** Let the AI recommend clip length based on content type, then validate.

**Implementation — Add to AI prompt:**
```
For each clip, also recommend an ideal_duration based on content type:
- HOOK / PUNCHLINE / QUOTE: 15-20 seconds
- STORY / ANECDOTE: 25-40 seconds  
- EXPLANATION / TUTORIAL: 40-55 seconds
- RANT / CONTROVERSIAL TAKE: 30-45 seconds
- EMOTIONAL MOMENT: 20-35 seconds
```

**Expected Impact:** ⭐⭐⭐ — Platform algorithms reward watching-to-completion. Right-sized clips get better retention rates.

---

#### 2.4 Caption Quality Validation

**Problem:** No automated check that captions render correctly. Issues like overlapping pages, single-word pages, or empty captions go undetected.

**Solution:** Post-render validation step.

**Implementation:**
```python
# After creating clip captions JSON, validate before Remotion render
def validate_captions(captions):
    issues = []
    
    for i, cap in enumerate(captions):
        # Check for empty words
        if not cap['text'].strip():
            issues.append(f"Empty caption at index {i}")
        
        # Check for negative timestamps
        if cap['startMs'] < 0:
            issues.append(f"Negative startMs at index {i}: {cap['startMs']}")
        
        # Check for zero-duration captions
        if cap['endMs'] <= cap['startMs']:
            issues.append(f"Zero/negative duration at index {i}")
        
        # Check for overlapping captions
        if i > 0 and cap['startMs'] < captions[i-1]['endMs'] - 50:
            issues.append(f"Overlap at index {i}: starts {cap['startMs']}ms, prev ends {captions[i-1]['endMs']}ms")
    
    # Check overall coverage
    if captions:
        total_duration = captions[-1]['endMs'] - captions[0]['startMs']
        total_spoken = sum(c['endMs'] - c['startMs'] for c in captions)
        coverage = total_spoken / total_duration if total_duration > 0 else 0
        if coverage < 0.3:
            issues.append(f"Low caption coverage: {coverage:.1%}")
    
    return issues

issues = validate_captions(clip_captions)
if issues:
    print(f"  ⚠️ Caption issues: {issues}")
```

**Expected Impact:** ⭐⭐ — Catches broken captions before they reach the user.

---

### 🟢 TIER 3 — Advanced / Phase 2 (Week 5-8)

---

#### 3.1 Multimodal AI Analysis with Gemini Vision

**Problem:** Text-only analysis misses visual moments — product demos, reactions, dramatic gestures, visual props, screen shares.

**Solution:** Extract key frames from the video and send them alongside the transcript to Gemini 2.5 Flash for multimodal analysis.

**Tool:** Gemini 2.5 Flash (Google AI Studio, free tier: 1,500 req/day)

> [!NOTE]  
> Gemini 2.0 Flash retires June 2026. Use `gemini-2.5-flash-lite` going forward.

**Implementation:**
```python
# Extract 1 keyframe every 10 seconds
import subprocess, base64, requests

# Generate frames
subprocess.run([
    'ffmpeg', '-i', 'workspace/source/source.mp4',
    '-vf', 'fps=1/10,scale=320:-1',
    'workspace/frames/frame_%04d.jpg',
    '-y', '-loglevel', 'warning'
], check=True)

# Encode frames to base64 for Gemini API
frames = sorted(glob.glob('workspace/frames/frame_*.jpg'))
frame_data = []
for i, frame_path in enumerate(frames[:60]):  # Max 60 frames (10 min)
    with open(frame_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    frame_data.append({
        'timestamp_sec': i * 10,
        'base64': b64
    })

# Call Gemini with transcript + frames
response = requests.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    params={'key': GEMINI_API_KEY},
    json={
        'contents': [{
            'parts': [
                {'text': f'Transcript: {transcript[:10000]}'},
                *[{'inline_data': {'mime_type': 'image/jpeg', 'data': f['base64']}}
                  for f in frame_data],
                {'text': '''Analyze both the transcript AND the video frames.
                Find moments where VISUAL + SPOKEN content combine for maximum impact.
                Score moments higher if they have:
                - Dramatic facial expressions or gestures
                - Visual demonstrations or reveals
                - Text/graphics on screen
                - Multiple people reacting
                - Camera movement or interesting framing'''}
            ]
        }]
    }
)
```

**Cost:** Free tier: 1,500 req/day. Each video = ~1-2 requests. Plenty of headroom.

**Expected Impact:** ⭐⭐⭐⭐⭐ — This is the single biggest quality leap. Opus Clip's "ClipAnything™" is essentially this — multimodal analysis. This puts ClipMint on par with $15/mo competitors.

---

#### 3.2 Speaker Diarization

**Problem:** Multi-speaker videos (podcasts, interviews) need to know WHO is speaking WHEN. The AI can't distinguish speakers from plain text.

**Solution:** Add speaker diarization using `pyannote.audio` or Groq's upcoming diarization support.

**Tool Options:**

| Tool | Cost | Quality | Speed |
|------|------|---------|-------|
| `pyannote/speaker-diarization-3.1` (HuggingFace) | Free (HF Inference) | Excellent | ~30s |
| Groq Whisper + diarization (coming soon) | Free tier | Good | ~5s |
| AssemblyAI diarization | $0.006/min | Excellent | ~10s |

**Implementation (pyannote via HuggingFace):**
```python
# Requires: pip install pyannote.audio torch
from pyannote.audio import Pipeline

pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
    use_auth_token="HF_TOKEN"
)

diarization = pipeline("workspace/audio/audio.wav")

speakers = []
for turn, _, speaker in diarization.itertracks(yield_label=True):
    speakers.append({
        'speaker': speaker,
        'start': turn.start,
        'end': turn.end
    })

# Merge with captions
for caption in captions:
    start_sec = caption['startMs'] / 1000
    for s in speakers:
        if s['start'] <= start_sec <= s['end']:
            caption['speaker'] = s['speaker']
            break
```

**Use in AI analysis:**
```
"Speaker A is the host, Speaker B is the guest.
Prefer clips where a single speaker delivers a complete thought.
Avoid clips that start mid-conversation or cut during a speaker transition."
```

**Expected Impact:** ⭐⭐⭐⭐ — Essential for podcast clips. Knowing who's speaking transforms clip quality.

---

#### 3.3 A/B Testing & Performance Feedback Loop

**Problem:** We assign viral_scores but never validate if they actually predict performance.

**Solution:** Track actual clip performance (views, shares) and use the data to improve scoring.

**Database Changes:**
```sql
-- Add performance tracking columns to clips
ALTER TABLE public.clips ADD COLUMN actual_views INTEGER DEFAULT 0;
ALTER TABLE public.clips ADD COLUMN actual_likes INTEGER DEFAULT 0;
ALTER TABLE public.clips ADD COLUMN actual_shares INTEGER DEFAULT 0;
ALTER TABLE public.clips ADD COLUMN actual_retention REAL DEFAULT 0;
ALTER TABLE public.clips ADD COLUMN performance_score REAL;
ALTER TABLE public.clips ADD COLUMN feedback_notes TEXT;
```

**Dashboard Addition:**
- After publishing, users can input actual view/engagement counts
- System calculates `performance_score = f(views, likes, shares, retention)`
- Over time, show users: "Your high-scored clips performed 3.2x better than low-scored ones"

**AI Improvement:**
- After 50+ clips with performance data, include examples in the AI prompt:
```
"Here are clips that actually went viral (>100K views):
[examples with transcripts and scores]

And clips that flopped (<1K views):
[examples with transcripts and scores]

Learn from these patterns when scoring new clips."
```

**Expected Impact:** ⭐⭐⭐⭐ — Long-term compounding improvement. Each batch of user data makes future clips better.

---

#### 3.4 Multi-Format Rendering (Platform-Specific)

**Problem:** Currently all clips are rendered in 9:16 (vertical). YouTube Shorts, Instagram Reels, Twitter/X, and Feed posts want different aspect ratios.

**Solution:** Render each clip in multiple formats using FFmpeg + Remotion.

**Format Matrix:**

| Platform | Aspect Ratio | Resolution | Max Duration |
|----------|-------------|------------|--------------|
| Instagram Reels | 9:16 | 1080×1920 | 90s |
| YouTube Shorts | 9:16 | 1080×1920 | 60s |
| TikTok | 9:16 | 1080×1920 | 60s |
| Twitter/X | 16:9 | 1920×1080 | 140s |
| LinkedIn Feed | 1:1 | 1080×1080 | 60s |
| YouTube Video | 16:9 | 1920×1080 | any |

**Implementation:**
```python
formats = {
    'reels': {'width': 1080, 'height': 1920, 'name': 'vertical'},
    'feed':  {'width': 1080, 'height': 1080, 'name': 'square'},
    'wide':  {'width': 1920, 'height': 1080, 'name': 'horizontal'}
}

for fmt_key, fmt in formats.items():
    ffmpeg_cmd = [
        'ffmpeg', '-i', clip_path,
        '-vf', f"scale={fmt['width']}:{fmt['height']}:force_original_aspect_ratio=decrease,"
               f"pad={fmt['width']}:{fmt['height']}:(ow-iw)/2:(oh-ih)/2:black",
        '-c:v', 'libx264', '-preset', 'fast',
        f"workspace/captioned/{basename}_{fmt['name']}.mp4",
        '-y', '-loglevel', 'warning'
    ]
```

**Expected Impact:** ⭐⭐⭐ — One click to get clips ready for every platform. Major time-saver for users.

---

#### 3.5 Thumbnail Generation with AI Text Overlays

**Problem:** Current thumbnails are just a raw frame extraction. They don't have text overlays, branding, or visual hooks.

**Solution:** Use ImageMagick (already installed in pipeline) to add title text, gradient overlays, and branding.

**Implementation:**
```bash
# Extract best frame (from energy peak moment within clip)
PEAK_TIME=$(python3 -c "print(find_peak_frame_time('${CLIP}'))")

ffmpeg -ss "$PEAK_TIME" -i "$clip" -frames:v 1 -q:v 2 \
  "/tmp/thumb_raw.jpg" -y -loglevel warning

# Add gradient overlay + title text with ImageMagick
convert "/tmp/thumb_raw.jpg" \
  -resize 1080x1920^ -gravity center -extent 1080x1920 \
  \( -size 1080x600 gradient:none-"rgba(0,0,0,0.7)" \) \
  -gravity south -composite \
  -gravity south -pointsize 64 -fill white -font "Inter-Bold" \
  -annotate +0+120 "${CLIP_TITLE}" \
  -pointsize 36 -fill "#39E508" \
  -annotate +0+60 "CLIPMINT" \
  "workspace/thumbnails/${BASENAME}_thumb.jpg"
```

**Expected Impact:** ⭐⭐⭐ — Professional thumbnails with text = significantly higher click rates.

---

## Production Roadmap

```
Week 1-2: TIER 1 (Pipeline Intelligence)
├── 1.1 Sliding window transcript analysis
├── 1.2 Two-pass AI scoring with rubric
├── 1.3 Audio energy analysis + score boosting
└── 1.4 Silence-based clip boundary snapping

Week 3-4: TIER 2 (Polish & Platform)
├── 2.1 Visual scene change detection
├── 2.2 YouTube metadata integration (chapters, tags)
├── 2.3 Smart clip length optimization
└── 2.4 Caption quality validation

Week 5-6: TIER 3a (Multimodal & Speaker)
├── 3.1 Gemini 2.5 multimodal analysis (frames + text)
├── 3.2 Speaker diarization (pyannote)
└── 3.5 AI thumbnail generation

Week 7-8: TIER 3b (Scale & Feedback)
├── 3.3 Performance feedback loop (track actual views)
├── 3.4 Multi-format rendering (9:16, 16:9, 1:1)
└── End-to-end testing of complete upgraded pipeline
```

---

## Impact Comparison: Before vs After

| Metric | Current (v1) | After Tier 1 | After All Tiers |
|--------|-------------|--------------|-----------------|
| Transcript coverage | ~25% (8K chars) | 100% (sliding window) | 100% |
| Scoring dimensions | 1 (text vibes) | 5 (structured rubric) | 7+ (multimodal) |
| Audio signals used | ❌ None | ✅ Energy peaks | ✅ Energy + silence |
| Visual signals used | ❌ None | ❌ None | ✅ Scene detection + frames |
| Speaker awareness | ❌ None | ❌ None | ✅ Diarization |
| Cut quality | Random word boundary | Silence-snapped | Scene + silence aligned |
| Thumbnail quality | Raw frame | Raw frame | AI text overlay |
| Formats per clip | 1 (vertical) | 1 (vertical) | 3 (vertical, square, wide) |
| Comparable to | Basic script | Vidyo.ai level | Opus Clip level |

---

## Competitive Analysis

### What Opus Clip Does That We Should Match

| Feature | Opus Clip | ClipMint Current | After Improvements |
|---------|-----------|-----------------|-------------------|
| Multimodal AI (ClipAnything™) | ✅ | ❌ | ✅ (Tier 3.1) |
| Virality scoring 1-100 | ✅ | ✅ | ✅ (improved rubric) |
| Auto-reframe for platforms | ✅ | ❌ | ✅ (Tier 3.4) |
| Dynamic captions | ✅ | ✅ 9 styles | ✅ 9 styles |
| Speaker detection | ✅ | ❌ | ✅ (Tier 3.2) |
| AI B-roll/transitions | ✅ | ❌ | Phase 3 |
| Bulk processing | ❌ Premium | ❌ | Phase 2 |
| Free tier | 10 clips | 5 clips | 5 clips |
| Pricing | $15-39/mo | ₹0-499/mo | ₹0-499/mo |

### Key Competitive Advantage: Cost

ClipMint runs on **$0/month infrastructure**. Opus Clip charges $15-39/month and has significant compute costs. By using:
- Groq free tier (14.4K req/day) 
- Gemini free tier (1,500 req/day)
- GitHub Actions (2,000 min/month)
- Google Drive (15GB free)

We can offer comparable quality at **₹0 (free) to ₹499/month** — a 10x price advantage in the Indian market.

---

## Tool/Dependency Summary

| Tool | Purpose | Install | Cost |
|------|---------|---------|------|
| FFmpeg `astats` | Audio energy analysis | Already installed | Free |
| FFmpeg `silencedetect` | Silence gap detection | Already installed | Free |
| FFmpeg `select` scene filter | Visual scene changes | Already installed | Free |
| yt-dlp `--dump-json` | Video metadata/chapters | Already installed | Free |
| Groq LLaMA 3.3 | Two-pass text analysis | Already configured | Free tier |
| Gemini 2.5 Flash | Multimodal vision analysis | Needs API key | Free tier |
| `pyannote/speaker-diarization-3.1` | Speaker detection | `pip install pyannote.audio` | Free (HF) |
| ImageMagick | AI thumbnail rendering | Already installed | Free |
| Python `statistics` | Energy peak detection | Built-in | Free |
| PySceneDetect (optional) | Advanced scene detection | `pip install scenedetect` | Free |

---

*Last updated: March 8, 2026*
