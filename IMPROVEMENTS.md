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

---

## 🔧 TIER 4 — Pipeline Resilience & Error Handling

---

#### 4.1 Retry Logic for Groq API Calls

**Problem:** The pipeline makes a single Groq API call per audio chunk. If the API returns a transient 429 (rate limit) or 503 (overloaded), the entire pipeline fails and wastes 10+ minutes of compute.

**File:** `.github/workflows/process-video.yml` — Step 4 (Transcribe audio, line ~187)

**Current Code:**
```bash
HTTP_STATUS=$(curl -s -o /tmp/chunk_raw.json -w "%{http_code}" \
  -X POST "https://api.groq.com/openai/v1/audio/transcriptions" ...)
# If 429 → pipeline fails immediately
```

**Solution:** Wrap API calls in exponential backoff retry:
```python
import time, requests

def call_groq_with_retry(url, headers, files, data, max_retries=3):
    """Call Groq API with exponential backoff on transient errors."""
    for attempt in range(max_retries + 1):
        response = requests.post(url, headers=headers, files=files, data=data, timeout=120)
        
        if response.status_code == 200:
            return response.json()
        
        if response.status_code in [429, 500, 502, 503] and attempt < max_retries:
            wait = 2 ** attempt * 5  # 5s, 10s, 20s
            print(f"  ⚠️ Groq returned {response.status_code}, retrying in {wait}s (attempt {attempt + 1}/{max_retries})")
            time.sleep(wait)
            continue
        
        # Non-retryable error
        raise Exception(f"Groq API error {response.status_code}: {response.text[:300]}")
```

**Also apply to:** Step 5 (AI viral moment detection, line ~350) — the LLM analysis call.

**Expected Impact:** ⭐⭐⭐⭐⭐ — Eliminates the #1 cause of pipeline failures. Groq free tier rate-limits aggressively.

---

#### 4.2 Pipeline State Checkpointing (Resume on Failure)

**Problem:** If the pipeline fails at Step 7 (Remotion render) after 15 minutes of transcription + analysis, the entire job must restart from scratch. All the transcription and AI analysis work is lost.

**File:** `.github/workflows/process-video.yml` — All steps

**Solution:** Upload workspace state to Google Drive after each major step. On retry, download and resume from last checkpoint.

```python
# After each major step, checkpoint the workspace
CHECKPOINTS = {
    "transcribed": "workspace/audio/full_captions.json",
    "analyzed": "workspace/clips/viral_moments.json",
    "clipped": "workspace/clips/moments_metadata.json",
}

import subprocess, os

def save_checkpoint(step_name, remote_name, job_id, folder_id):
    """Upload workspace to Drive as a checkpoint."""
    subprocess.run([
        "rclone", "copy", "workspace/",
        f"{remote_name}:ClipMint/{job_id}/_checkpoints/{step_name}/",
        f"--drive-root-folder-id={folder_id}",
        "--exclude", "source/**",  # Don't re-upload the source video
        "-q"
    ], check=True)
    print(f"  💾 Checkpoint saved: {step_name}")

def load_checkpoint(step_name, remote_name, job_id, folder_id):
    """Download a checkpoint to resume from."""
    result = subprocess.run([
        "rclone", "lsjson",
        f"{remote_name}:ClipMint/{job_id}/_checkpoints/{step_name}/",
        f"--drive-root-folder-id={folder_id}"
    ], capture_output=True, text=True)
    
    if result.returncode == 0 and result.stdout.strip() != "[]":
        subprocess.run([
            "rclone", "copy",
            f"{remote_name}:ClipMint/{job_id}/_checkpoints/{step_name}/",
            "workspace/",
            f"--drive-root-folder-id={folder_id}",
            "-q"
        ], check=True)
        return True
    return False
```

**Expected Impact:** ⭐⭐⭐⭐ — Saves 10-15 minutes on retries. Critical for long videos that hit render errors.

---

#### 4.3 Granular Error Messages in Supabase

**Problem:** When the pipeline fails, the error message is always a generic `"Pipeline failed. Check GitHub Actions logs."` (line 762). Users have no idea WHAT failed.

**File:** `.github/workflows/process-video.yml` — Step 11 (line ~750)

**Solution:** Capture the actual failing step name and last error output:

```yaml
- name: Mark job as failed on error
  if: failure()
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
  run: |
    # Determine which step failed from context
    FAILED_STEP="${{ github.action }}"
    RUN_URL="https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
    
    # Capture last 500 chars of any error logs
    ERROR_DETAIL=""
    for log in /tmp/chunk_raw.json workspace/clips/viral_moments.json; do
      if [ -f "$log" ]; then
        ERROR_DETAIL=$(tail -c 500 "$log" 2>/dev/null || echo "")
        break
      fi
    done
    
    ERROR_MSG="Step '${FAILED_STEP}' failed. ${ERROR_DETAIL:+Details: ${ERROR_DETAIL}}"
    
    python3 -c "
    import json, requests, os
    requests.patch(
        f'{os.environ[\"SUPABASE_URL\"]}/rest/v1/jobs?id=eq.${{ inputs.job_id }}',
        headers={
            'apikey': os.environ['SUPABASE_SERVICE_KEY'],
            'Authorization': f'Bearer {os.environ[\"SUPABASE_SERVICE_KEY\"]}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        json={
            'status': 'failed',
            'error_message': '''${ERROR_MSG}'''[:500],
            'progress': 0,
        }
    )
    "
```

**Expected Impact:** ⭐⭐⭐ — Users can self-diagnose common issues (invalid URL, private video, API rate limit) without checking GitHub Actions.

---

#### 4.4 Video Download Validation

**Problem:** No validation that the downloaded video is actually playable. If yt-dlp outputs a corrupt or partial file, the pipeline continues and eventually fails at FFmpeg with a cryptic error.

**File:** `.github/workflows/process-video.yml` — Step 2 (line ~97)

**Solution:** Validate video integrity after download:

```bash
# After yt-dlp download, validate the file
echo "🔍 Validating downloaded video..."

# Check file exists and has size
FILE_SIZE=$(stat --printf="%s" workspace/source/source.mp4 2>/dev/null || echo "0")
if [ "$FILE_SIZE" -lt 10000 ]; then
  echo "❌ Downloaded file is too small (${FILE_SIZE} bytes) — likely corrupt"
  exit 1
fi

# Quick integrity check: try to read video metadata
if ! ffprobe -v error -show_entries format=duration,size -of json workspace/source/source.mp4 > /tmp/probe.json 2>/dev/null; then
  echo "❌ Video file is corrupt or unreadable"
  cat /tmp/probe.json || true
  exit 1
fi

# Check duration is reasonable (> 10 seconds)
VIDEO_DURATION=$(python3 -c "import json; print(json.load(open('/tmp/probe.json'))['format']['duration'])")
if python3 -c "exit(0 if float('$VIDEO_DURATION') > 10 else 1)"; then
  echo "✅ Video validated: ${FILE_SIZE} bytes, ${VIDEO_DURATION}s"
else
  echo "❌ Video too short (${VIDEO_DURATION}s) — minimum 10 seconds"
  exit 1
fi
```

**Expected Impact:** ⭐⭐⭐ — Fails fast on corrupt downloads instead of wasting 10+ minutes.

---

#### 4.5 Parallel Clip Rendering

**Problem:** Remotion renders clips sequentially (line ~492). Each clip takes 30-90 seconds. 10 clips = 5-15 minutes of serial rendering.

**File:** `.github/workflows/process-video.yml` — Step 7 (line ~485)

**Solution:** Use GNU `parallel` or background jobs to render multiple clips simultaneously:

```bash
# Render clips in parallel (4 at a time to avoid OOM)
echo "🎬 Rendering captioned clips in parallel..."

render_clip() {
  local clip="$1"
  local STYLE="$2"
  local BASENAME=$(basename "$clip" .mp4)
  local CAPTIONS_FILE="../workspace/clips/${BASENAME}.captions.json"
  local OUTPUT="../workspace/captioned/${BASENAME}_captioned.mp4"

  if [ ! -f "$CAPTIONS_FILE" ]; then
    echo "  ⚠️ No captions for $BASENAME — copying raw clip"
    cp "$clip" "$OUTPUT"
    return
  fi

  CLIP_DURATION=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$clip")
  DURATION_FRAMES=$(python3 -c "import math; print(max(1, math.ceil(${CLIP_DURATION} * 30)))")

  mkdir -p public
  cp "$clip" "public/${BASENAME}.mp4"

  python3 -c "
import json
captions = open('../workspace/clips/${BASENAME}.captions.json').read()
props = {
    'videoSrc': '${BASENAME}.mp4',
    'durationInFrames': ${DURATION_FRAMES},
    'captionsData': captions,
    'captionStyle': '$STYLE',
    'backgroundColor': '#000000',
    'accentColor': '#39E508',
    'fontSize': 68
}
print(json.dumps(props))
" > "/tmp/props_${BASENAME}.json"

  npx remotion render CaptionedClip "$OUTPUT" \
    --props="$(cat /tmp/props_${BASENAME}.json)" \
    --codec=h264 --concurrency=1 --log=error || {
      echo "  ⚠️ Remotion failed for $BASENAME — copying raw clip"
      cp "$clip" "$OUTPUT"
    }
}

export -f render_clip

ls ../workspace/clips/clip_*.mp4 | parallel -j4 render_clip {} "$STYLE"

echo "✅ Parallel rendering complete"
```

**Cost:** `sudo apt-get install -y parallel` — already available on ubuntu-latest.

**Expected Impact:** ⭐⭐⭐⭐ — 3-4x faster rendering. 10 clips: ~4 min instead of ~15 min.

---

### ⚡ TIER 5 — Remotion Rendering Quality

---

#### 5.1 Font Loading — Inter Not Available in CI

**Problem:** All caption styles reference `'Inter'` font (line 281, 320, etc.), but the GitHub Actions runner doesn't have Inter installed. The renderer silently falls back to a system font (likely DejaVu Sans), making captions look visibly different from design previews.

**File:** `remotion-captions/src/CaptionedClip.tsx` — every style component

**Solution A (recommended):** Load Inter from Google Fonts in the Remotion composition:

```tsx
// Add at the top of CaptionedClip.tsx
import { staticFile } from "remotion";

// In CaptionedClip component, add a <style> element:
<AbsoluteFill>
    <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;500;700;800;900&display=swap');`}
    </style>
    {/* existing content */}
</AbsoluteFill>
```

**Solution B (faster, no network):** Install Inter in the CI runner:

```yaml
# In process-video.yml, Step 1 (Install system dependencies)
- name: Install fonts
  run: |
    sudo apt-get install -y fonts-inter || {
      # Fallback: download from Google Fonts
      mkdir -p ~/.fonts
      wget -q "https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip" -O /tmp/inter.zip
      unzip -q /tmp/inter.zip -d ~/.fonts/
      fc-cache -f
    }
```

**Expected Impact:** ⭐⭐⭐⭐ — Renders look identical to design previews. Currently the #1 visual quality issue.

---

#### 5.2 Glitch Style Uses `Math.random()` — Non-Deterministic Renders

**Problem:** The Glitch style (line 452) uses `Math.random()`:
```tsx
const glitchOffset = frame % 8 < 2 ? (Math.random() - 0.5) * 6 : 0;
```
Remotion renders frames independently and sometimes re-renders frames. `Math.random()` produces different values each time, causing visual jitter and inconsistent output between preview and render.

**File:** `remotion-captions/src/CaptionedClip.tsx` — `GlitchPage` (line 452)

**Solution:** Use a seeded PRNG based on the frame number:

```tsx
// Replace Math.random() with deterministic noise
function seededRandom(seed: number): number {
    const x = Math.sin(seed * 9301 + 49297) * 49421;
    return x - Math.floor(x);
}

// In GlitchPage:
const glitchOffset = frame % 8 < 2
    ? (seededRandom(frame + pageIndex * 1000) - 0.5) * 6
    : 0;
```

**Expected Impact:** ⭐⭐⭐ — Deterministic renders. Critical for Remotion correctness.

---

#### 5.3 Missing `durationMs` Fallback on TikTok Pages

**Problem:** The page renderer calculates `endFrame` using `page.durationMs ?? 2000` (line 140). If `createTikTokStyleCaptions` returns pages without `durationMs` (which happens with very short pages), the 2000ms fallback causes visual overlap with the next page.

**File:** `remotion-captions/src/CaptionedClip.tsx` — line 139-142

**Solution:** Compute `durationMs` from actual token timestamps instead of arbitrary fallback:

```tsx
const endFrame = Math.round(
    ((page.startMs + (page.durationMs ??
        // Fallback: use last token's endMs, or 2000ms minimum
        Math.max(
            2000,
            page.tokens.length > 0
                ? page.tokens[page.tokens.length - 1].toMs - page.startMs
                : 2000
        )
    )) / 1000) * fps
);
```

**Expected Impact:** ⭐⭐ — Prevents occasional page overlap/gap artifacts.

---

#### 5.4 Configurable `combineTokensWithinMilliseconds`

**Problem:** The page grouping parameter is hardcoded to `1200` ms (line 89). This works well for fast speakers but creates overly long pages for slow speakers (e.g., meditation content, ASMR). There's no way for users to tune this.

**File:** `remotion-captions/src/CaptionedClip.tsx` — line 88-91

**Solution:** Add it as a prop:

```tsx
// Add to schema:
combineTokensMs: z.number().min(400).max(3000).default(1200),

// Use in computation:
const { pages } = useMemo(
    () =>
        createTikTokStyleCaptions({
            captions,
            combineTokensWithinMilliseconds: combineTokensMs,
        }),
    [captions, combineTokensMs]
);
```

**Expected Impact:** ⭐⭐ — Better caption pacing for different content types.

---

#### 5.5 Render Output Validation

**Problem:** No check that Remotion actually produced a valid video. If it outputs a 0-byte file or a corrupt video, the pipeline uploads it to Drive and marks the clip as "ready."

**File:** `.github/workflows/process-video.yml` — after Step 7 (line ~543)

**Solution:** Add a validation step:

```bash
- name: Validate rendered clips
  run: |
    echo "🔍 Validating rendered clips..."
    VALID=0
    INVALID=0
    
    for clip in workspace/captioned/*_captioned.mp4; do
      [ -f "$clip" ] || continue
      SIZE=$(stat --printf="%s" "$clip")
      
      if [ "$SIZE" -lt 50000 ]; then
        echo "  ❌ $(basename "$clip"): too small (${SIZE} bytes) — likely corrupt"
        INVALID=$((INVALID + 1))
        # Replace with raw clip as fallback
        RAW="workspace/clips/$(basename "$clip" _captioned.mp4).mp4"
        [ -f "$RAW" ] && cp "$RAW" "$clip"
      else
        # Quick probe
        if ffprobe -v error -show_entries format=duration "$clip" > /dev/null 2>&1; then
          echo "  ✅ $(basename "$clip"): ${SIZE} bytes"
          VALID=$((VALID + 1))
        else
          echo "  ❌ $(basename "$clip"): ffprobe failed — corrupt"
          INVALID=$((INVALID + 1))
          RAW="workspace/clips/$(basename "$clip" _captioned.mp4).mp4"
          [ -f "$RAW" ] && cp "$RAW" "$clip"
        fi
      fi
    done
    
    echo "✅ Validation: ${VALID} valid, ${INVALID} invalid (replaced with raw)"
```

**Expected Impact:** ⭐⭐⭐ — Never uploads corrupt clips. Falls back to raw (uncaptioned) instead.

---

### 🔒 TIER 6 — API Gateway & Security

---

#### 6.1 Input Sanitization on `video_url`

**Problem:** The API gateway passes `body.video_url` directly to GitHub Actions (line 199) without any URL validation. Malicious input could inject shell commands via the URL when it's used in `yt-dlp` (line 121), or trigger SSRF by targeting internal services.

**File:** `api-gateway/src/index.ts` — `handleCreateJob()` (line 129)

**Solution:** Validate and sanitize the URL:

```typescript
function validateVideoUrl(url: string): { valid: boolean; error?: string } {
    try {
        const parsed = new URL(url);
        
        // Only allow HTTPS
        if (parsed.protocol !== "https:") {
            return { valid: false, error: "Only HTTPS URLs are supported" };
        }
        
        // Whitelist supported platforms
        const ALLOWED_HOSTS = [
            "youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com",
            "instagram.com", "www.instagram.com",
            "tiktok.com", "www.tiktok.com", "vm.tiktok.com",
            "twitter.com", "x.com",
            "vimeo.com", "www.vimeo.com",
        ];
        
        const host = parsed.hostname.toLowerCase();
        if (!ALLOWED_HOSTS.some(h => host === h || host.endsWith("." + h))) {
            return { valid: false, error: `Unsupported platform: ${host}. Supported: YouTube, Instagram, TikTok, Twitter/X, Vimeo` };
        }
        
        // Block private/internal IPs
        if (host === "localhost" || host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("127.")) {
            return { valid: false, error: "Internal URLs are not allowed" };
        }
        
        // Limit URL length
        if (url.length > 2048) {
            return { valid: false, error: "URL too long (max 2048 characters)" };
        }
        
        return { valid: true };
    } catch {
        return { valid: false, error: "Invalid URL format" };
    }
}

// In handleCreateJob():
const urlCheck = validateVideoUrl(body.video_url);
if (!urlCheck.valid) {
    return errorResponse(urlCheck.error!, 400, env);
}
```

**Expected Impact:** ⭐⭐⭐⭐⭐ — Prevents SSRF, command injection, and abuse. **Critical security fix.**

---

#### 6.2 Bare `except:` in Pipeline (Silent Error Swallowing)

**Problem:** In Step 10 (line 678), there's a bare `except: pass` that silently swallows errors when loading moments metadata:

```python
try:
    with open("workspace/clips/moments_metadata.json") as f:
        moments = json.load(f)
except:
    pass
```

This hides bugs. If the file exists but has invalid JSON, the pipeline silently inserts clips with no titles, descriptions, or viral scores.

**File:** `.github/workflows/process-video.yml` — Step 10 (line 675-679)

**Solution:** Be specific about what you're catching:

```python
try:
    with open("workspace/clips/moments_metadata.json") as f:
        moments = json.load(f)
except FileNotFoundError:
    print("⚠️ moments_metadata.json not found — clips will have default metadata")
    moments = []
except json.JSONDecodeError as e:
    print(f"❌ moments_metadata.json is invalid JSON: {e}")
    moments = []
```

**Expected Impact:** ⭐⭐ — Better debugging. No hidden failures.

---

#### 6.3 API Key Last-Used-At Not Updated

**Problem:** The `api_keys` table has a `last_used_at` column (schema.sql line 55), but the API gateway never updates it during authentication (line 65-109). Users can't tell if their API key is working or when it was last used.

**File:** `api-gateway/src/index.ts` — `authenticateRequest()` (line 65)

**Solution:** Update `last_used_at` on successful authentication:

```typescript
// After line 108 (successful auth):
// Fire-and-forget: update last_used_at
fetch(
    `${env.SUPABASE_URL}/rest/v1/api_keys?key_hash=eq.${hashHex}`,
    {
        method: "PATCH",
        headers: {
            apikey: env.SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
        },
        body: JSON.stringify({ last_used_at: new Date().toISOString() }),
    }
);  // No await — non-blocking
```

**Expected Impact:** ⭐⭐ — Better API key management for users.

---

#### 6.4 Missing Request Body Size Limit

**Problem:** The API gateway doesn't limit request body size. An attacker could send a huge JSON payload to `POST /api/v1/jobs` and cause memory issues on the Cloudflare Worker.

**File:** `api-gateway/src/index.ts` — `handleCreateJob()` (line 143)

**Solution:** Add body size check:

```typescript
// Before parsing JSON body:
const contentLength = parseInt(request.headers.get("Content-Length") || "0");
if (contentLength > 10000) {  // 10KB max
    return errorResponse("Request body too large (max 10KB)", 413, env);
}
```

**Expected Impact:** ⭐⭐ — Prevents abuse and DoS via large payloads.

---

### 🗄️ TIER 7 — Database & Schema Improvements

---

#### 7.1 Race Condition in `increment_videos_used` RPC

**Problem:** The function exists in `migration_phase4.sql` ✅ — but it has a **race condition**: it increments `videos_used` without checking `videos_used < videos_limit`. If two API calls fire simultaneously, both can succeed and push the user past their quota. The API gateway checks the limit *before* calling the RPC (line 135), but there's a TOCTOU window between the quota check and the increment.

**File:** `supabase/migration_phase4.sql` — existing function (line 8-16)

**Current Code:**
```sql
-- Current: increments unconditionally
UPDATE public.profiles
SET videos_used = videos_used + 1, updated_at = now()
WHERE id = p_user_id;
```

**Solution:** Add a limit guard inside the atomic UPDATE:

```sql
CREATE OR REPLACE FUNCTION public.increment_videos_used(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET videos_used = videos_used + 1,
        updated_at = now()
    WHERE id = p_user_id
      AND videos_used < videos_limit;  -- ← Atomic guard: prevents exceeding limit
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % has reached video limit or does not exist', p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Expected Impact:** ⭐⭐⭐ — Prevents race-condition quota bypass. Low severity since the API also checks, but defense-in-depth matters.

---

#### 7.2 Missing `updated_at` Trigger on `clips` Table

**Problem:** Profiles and jobs have `updated_at` auto-triggers (lines 225-231), but the clips table doesn't. If a clip's status changes (ready → published), `updated_at` doesn't update.

**File:** `supabase/schema.sql` — missing trigger for clips table

**Solution:**

```sql
-- Add updated_at column and trigger to clips
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.clips
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

**Expected Impact:** ⭐ — Better data hygiene. Useful for debugging and audit trails.

---

#### 7.3 Stale `transcript_srt` Column

**Problem:** The jobs table has a `transcript_srt TEXT` column (schema.sql line 96) but the pipeline no longer produces SRT — it produces Caption[] JSON. This column is never written to and wastes schema space.

**File:** `supabase/schema.sql` — line 96

**Solution:** Either:
- **Option A:** Rename to `transcript_json JSONB` and store the caption data there (useful for re-rendering).
- **Option B:** Remove the column entirely if transcripts don't need to be stored.

```sql
-- Option A: Replace with JSON
ALTER TABLE public.jobs RENAME COLUMN transcript_srt TO transcript_json;
ALTER TABLE public.jobs ALTER COLUMN transcript_json TYPE JSONB USING transcript_json::jsonb;

-- Option B: Drop
ALTER TABLE public.jobs DROP COLUMN IF EXISTS transcript_srt;
```

**Expected Impact:** ⭐⭐ — Cleaner schema. Option A enables clip re-rendering without re-transcription.

---

#### 7.4 No Database Index for Clip Lookup by `drive_file_id`

**Problem:** When serving clip previews or downloads, the dashboard fetches clips by `drive_file_id`. Without an index, this becomes a sequential scan on larger datasets.

**File:** `supabase/schema.sql`

**Solution:**

```sql
CREATE INDEX idx_clips_drive_file ON public.clips(drive_file_id) WHERE drive_file_id IS NOT NULL;
```

**Expected Impact:** ⭐ — Only relevant at scale. Proactive optimization.

---

### 🎨 TIER 8 — Dashboard UX & Frontend

---

#### 8.1 No Real-Time Job Status Updates

**Problem:** Once a user submits a job, they have to manually refresh the dashboard to see progress updates. The pipeline updates progress in Supabase (5% → 20% → 40% → etc.), but the dashboard doesn't poll or subscribe.

**File:** `dashboard/src/app/dashboard/` — job detail pages

**Solution:** Use Supabase Realtime to subscribe to job changes:

```tsx
// In the job status component
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Job } from "@/lib/types";

function useJobRealtime(jobId: string, initialJob: Job) {
    const [job, setJob] = useState(initialJob);
    
    useEffect(() => {
        const channel = supabase
            .channel(`job-${jobId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "jobs",
                    filter: `id=eq.${jobId}`,
                },
                (payload) => {
                    setJob((prev) => ({ ...prev, ...payload.new } as Job));
                }
            )
            .subscribe();
        
        return () => { supabase.removeChannel(channel); };
    }, [jobId]);
    
    return job;
}
```

**Expected Impact:** ⭐⭐⭐⭐ — Live progress bars. Makes the app feel premium and professional.

---

#### 8.2 No Clip Preview in Dashboard

**Problem:** Users can see clip metadata (title, viral score, hashtags) but can't preview the actual video without downloading from Google Drive. There's no embedded player.

**File:** Dashboard clip listing pages

**Solution:** Embed Google Drive video preview using the file ID:

```tsx
function ClipPreview({ driveFileId }: { driveFileId: string }) {
    if (!driveFileId) return <div>No preview available</div>;
    
    return (
        <div className="clip-preview" style={{ aspectRatio: "9/16", maxHeight: 400 }}>
            <iframe
                src={`https://drive.google.com/file/d/${driveFileId}/preview`}
                width="100%"
                height="100%"
                allow="autoplay"
                style={{ border: "none", borderRadius: 12 }}
            />
        </div>
    );
}
```

> [!NOTE]
> Google Drive preview requires the file to be shared with "Anyone with the link." The pipeline should set this permission during upload via rclone `--drive-shared-with-me` or Google Drive API.

**Expected Impact:** ⭐⭐⭐⭐ — Instant clip preview without downloading. Major UX improvement.

---

#### 8.3 Missing Video Duration in Clip Records

**Problem:** The clips table has `duration_seconds REAL` (schema.sql line 124), but the pipeline never writes clip duration. The dashboard can't show clip length.

**File:** `.github/workflows/process-video.yml` — Step 10 (line ~714-742)

**Solution:** Calculate and store clip duration during insert:

```python
# In Step 10, before inserting clip records:
import subprocess

for i, clip in enumerate(clips):
    moment = moments[i] if i < len(moments) else {}
    
    # Get actual rendered clip duration
    clip_path = f"workspace/captioned/{clip['name']}"
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", clip_path],
            capture_output=True, text=True
        )
        duration = float(result.stdout.strip()) if result.stdout.strip() else None
    except:
        duration = None
    
    clip_data = {
        # ... existing fields ...
        "duration_seconds": duration,
    }
```

**Expected Impact:** ⭐⭐ — Dashboard can show "0:32" duration badge on each clip card.

---

#### 8.4 No Bulk Download Option

**Problem:** Users must click each clip's Google Drive link individually. For 10 clips, that's 10 separate download actions.

**File:** Dashboard clips page

**Solution:** Add "Download All" button that creates a ZIP via a serverless function, or provides a Google Drive folder link:

```tsx
function DownloadAllButton({ driveFolderId, jobId }: { driveFolderId: string; jobId: string }) {
    const folderUrl = `https://drive.google.com/drive/folders/${driveFolderId}`;
    
    return (
        <a
            href={folderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="download-all-btn"
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                background: "linear-gradient(135deg, #39E508, #28B706)",
                color: "#000",
                borderRadius: 8,
                fontWeight: 700,
                textDecoration: "none",
            }}
        >
            📦 Open All Clips in Drive
        </a>
    );
}
```

**Expected Impact:** ⭐⭐⭐ — One-click access to all clips.

---

#### 8.5 No Webhook / Notification on Job Completion

**Problem:** The pipeline sends a Discord notification (line 767), but users who don't monitor Discord have no way to know their clips are ready. No email, no push notification, no webhook.

**File:** `.github/workflows/process-video.yml` — Step 12 (line ~767)

**Solution:** Add user-configurable webhook support:

```sql
-- Schema addition
ALTER TABLE public.profiles ADD COLUMN webhook_url TEXT;
ALTER TABLE public.profiles ADD COLUMN notification_email BOOLEAN DEFAULT true;
```

```python
# In Step 10, after updating job status to "done":
# Fetch user's webhook URL
profile_resp = requests.get(
    f"{supabase_url}/rest/v1/profiles?id=eq.{user_id}&select=webhook_url",
    headers={"apikey": service_key, "Authorization": f"Bearer {service_key}"}
)
profiles = profile_resp.json()
webhook_url = profiles[0].get("webhook_url") if profiles else None

if webhook_url:
    try:
        requests.post(webhook_url, json={
            "event": "job.completed",
            "job_id": job_id,
            "clips_count": clips_count,
            "clips": [{"title": c.get("title"), "url": c.get("url")} for c in clips],
            "timestamp": now,
        }, timeout=10)
        print(f"📬 Webhook sent to {webhook_url}")
    except Exception as e:
        print(f"⚠️ Webhook failed: {e}")
```

**Expected Impact:** ⭐⭐⭐ — Enables Zapier/Make.com integrations. Professional API feature.

---

## Updated Production Roadmap

```
Week 1-2: TIER 1 (Pipeline Intelligence) — existing
├── 1.1 Sliding window transcript analysis
├── 1.2 Two-pass AI scoring with rubric
├── 1.3 Audio energy analysis + score boosting
└── 1.4 Silence-based clip boundary snapping

Week 2-3: TIER 4 (Pipeline Resilience) — NEW
├── 4.1 Retry logic for Groq API calls ⚡ CRITICAL
├── 4.2 Pipeline state checkpointing
├── 4.3 Granular error messages
├── 4.4 Video download validation
└── 4.5 Parallel clip rendering

Week 3-4: TIER 2 (Polish & Platform) — existing
├── 2.1 Visual scene change detection
├── 2.2 YouTube metadata integration
├── 2.3 Smart clip length optimization
└── 2.4 Caption quality validation

Week 4-5: TIER 5 (Remotion Quality) + TIER 6 (API Security) — NEW
├── 5.1 Font loading (Inter in CI) ⚡ CRITICAL
├── 5.2 Deterministic glitch style
├── 5.3 Page duration fallback fix
├── 5.4 Configurable caption pacing
├── 5.5 Render output validation
├── 6.1 URL input sanitization ⚡ CRITICAL SECURITY
├── 6.2 Fix bare except: in pipeline
├── 6.3 API key last_used_at tracking
└── 6.4 Request body size limit

Week 5-6: TIER 7 (Database) + TIER 8 (Dashboard) — NEW
├── 7.1 Add increment_videos_used RPC ⚡ CRITICAL
├── 7.2 Add updated_at trigger on clips
├── 7.3 Fix stale transcript_srt column
├── 7.4 Index for drive_file_id lookup
├── 8.1 Real-time job status (Supabase Realtime)
├── 8.2 Clip video preview embed
├── 8.3 Store clip duration_seconds
├── 8.4 Bulk download / Drive folder link
└── 8.5 Webhook notification on completion

Week 7-8: TIER 3 (Advanced) — existing
├── 3.1 Gemini 2.5 multimodal analysis
├── 3.2 Speaker diarization
├── 3.3 Performance feedback loop
├── 3.4 Multi-format rendering
└── 3.5 AI thumbnail generation
```

---

## Critical Fixes Summary (Do First)

> [!CAUTION]
> These issues can cause data loss, security vulnerabilities, or broken billing. Fix ASAP.

| # | Issue | Severity | File |
|---|-------|----------|------|
| 7.1 | `increment_videos_used` RPC missing — free tier has no limit enforcement | 🔴 CRITICAL | `schema.sql` |
| 6.1 | No URL validation — SSRF/injection risk via `video_url` | 🔴 CRITICAL | `api-gateway/src/index.ts` |
| 4.1 | No retry on Groq API — pipeline fails on any transient 429/503 | 🟡 HIGH | `process-video.yml` |
| 5.1 | Inter font not loaded in CI — captions render with wrong font | 🟡 HIGH | `CaptionedClip.tsx` + `process-video.yml` |
| 5.2 | `Math.random()` in Glitch style — non-deterministic renders | 🟡 HIGH | `CaptionedClip.tsx` |

---

### 🎥 TIER 9 — Remotion Ecosystem Upgrades

> [!NOTE]
> ClipMint currently uses only 3 Remotion packages: `@remotion/cli`, `@remotion/captions`, and `@remotion/zod-types`. The Remotion ecosystem has **80+ packages** — many directly applicable. This tier leverages official packages to dramatically improve rendering quality, visual polish, and performance.

---

#### 9.1 Use `@remotion/google-fonts` Instead of CSS @import

**Problem:** Improvement 5.1 proposes loading Inter via a CSS `@import url()` inside a `<style>` tag, or installing fonts in CI. Both approaches are fragile:
- CSS `@import` in Remotion has race conditions — the font may not load before the first frame renders, causing fallback font flicker.
- CI font installation adds build time and can break on different runner images.

Remotion has a **dedicated package** for this exact problem: `@remotion/google-fonts`. It provides typed imports for every Google Font, with a `waitUntilDone()` API that **guarantees** fonts are loaded before rendering begins.

**Package:** `@remotion/google-fonts` (MIT, 1,500+ fonts supported)

**Installation:**
```bash
npm i --save-exact @remotion/google-fonts@4.0.0
```

**Implementation:**
```tsx
// fonts.ts — Central font loading module
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadRobotoMono } from "@remotion/google-fonts/RobotoMono";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";

// Load Inter with all weights used in caption styles
const inter = loadInter("normal", {
    weights: ["300", "500", "700", "800", "900"],
    subsets: ["latin"],
});

// Monospace for code-style captions
const mono = loadRobotoMono("normal", {
    weights: ["400", "700"],
    subsets: ["latin"],
});

// Alternative display font
const poppins = loadPoppins("normal", {
    weights: ["600", "700", "800"],
    subsets: ["latin"],
});

export const interFamily = inter.fontFamily;    // "Inter"
export const monoFamily = mono.fontFamily;      // "Roboto Mono"
export const poppinsFamily = poppins.fontFamily; // "Poppins"

// Guarantee all fonts loaded before render starts
export const waitForFonts = async () => {
    await Promise.all([
        inter.waitUntilDone(),
        mono.waitUntilDone(),
        poppins.waitUntilDone(),
    ]);
};
```

```tsx
// In CaptionedClip.tsx — use the exported font families
import { interFamily, waitForFonts } from "./fonts";
import { delayRender, continueRender } from "remotion";

// At component top level:
const [handle] = useState(() => delayRender("Loading fonts"));
useEffect(() => {
    waitForFonts().then(() => continueRender(handle));
}, [handle]);

// In style objects, replace all 'Inter' strings:
fontFamily: interFamily,  // Typed, guaranteed loaded
```

**Why This Supersedes 5.1:**
- ✅ No CI font installation needed
- ✅ No CSS `@import` race conditions
- ✅ `waitUntilDone()` guarantees fonts load before any frame renders
- ✅ TypeScript autocomplete for font names
- ✅ Only loads the weights/subsets actually used (smaller download)

**Expected Impact:** ⭐⭐⭐⭐⭐ — Eliminates the #1 visual quality issue with a purpose-built Remotion solution.

---

#### 9.2 Clip Transitions with `@remotion/transitions`

**Problem:** Clips start and end with hard cuts. No intro/outro animation. Every clip looks the same at the edges — abrupt start, abrupt end. Professional clipping tools add fade-ins, slide transitions, and outros.

**Package:** `@remotion/transitions` (available from v4.0.53)

**Available Transition Effects:**
| Effect | Description | Best For |
|--------|-------------|----------|
| `fade()` | Animate opacity in/out | Universal — works with any content |
| `slide()` | Slide in and push out | Energetic content, reels |
| `wipe()` | Slide over the previous scene | Clean, professional look |
| `flip()` | 3D rotate effect | Eye-catching intros |
| `clockWipe()` | Circular reveal animation | Dramatic reveals |
| `iris()` | Circular mask from center | Focus-drawing intros |

**Implementation:**
```tsx
import { TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { springTiming, linearTiming } from "@remotion/transitions";

// Wrap the clip content in a TransitionSeries for intro/outro animations
const CaptionedClipWithTransitions: React.FC<Props> = (props) => {
    const fps = 30;
    const introFrames = Math.round(fps * 0.5);   // 0.5s intro
    const outroFrames = Math.round(fps * 0.8);    // 0.8s outro
    const mainFrames = props.durationInFrames - introFrames - outroFrames;

    return (
        <TransitionSeries>
            {/* Intro: fade in with spring timing */}
            <TransitionSeries.Sequence durationInFrames={introFrames}>
                <IntroCard title={props.clipTitle} />
            </TransitionSeries.Sequence>

            <TransitionSeries.Transition
                presentation={fade()}
                timing={springTiming({ config: { damping: 200 } })}
            />

            {/* Main clip content */}
            <TransitionSeries.Sequence durationInFrames={mainFrames}>
                <MainClipContent {...props} />
            </TransitionSeries.Sequence>

            <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: outroFrames })}
            />

            {/* Outro: branding card */}
            <TransitionSeries.Sequence durationInFrames={outroFrames}>
                <OutroCard brandName="ClipMint" />
            </TransitionSeries.Sequence>
        </TransitionSeries>
    );
};
```

**Add as Schema Prop (user-selectable):**
```tsx
// In captioned clip schema:
transitionStyle: z.enum(["none", "fade", "slide", "wipe", "flip"]).default("fade"),
```

**Cost:** Zero — MIT license, no additional API calls.

**Expected Impact:** ⭐⭐⭐⭐ — Professional intro/outro transitions make clips feel polished. Opus Clip and Vidyo.ai both do this.

---

#### 9.3 Dynamic Caption Sizing with `@remotion/layout-utils`

**Problem:** Caption font size is hardcoded at 68px (line 956 in process-video.yml). Long words like "CRYPTOCURRENCY" overflow the screen on vertical videos. Short words look tiny and waste space. There's no adaptive sizing.

**Package:** `@remotion/layout-utils` — provides `fitText()`, `measureText()`, `fillTextBox()`, and `fitTextOnNLines()`

**Implementation:**
```tsx
import { fitText } from "@remotion/layout-utils";

// In the caption page renderer:
const CaptionPage: React.FC<{ text: string; containerWidth: number }> = ({
    text,
    containerWidth,
}) => {
    // Dynamically compute font size to fit the container
    const { fontSize } = fitText({
        fontFamily: interFamily,
        fontWeight: "800",
        text: text,
        withinWidth: containerWidth * 0.85,  // 85% of screen width
    });

    // Clamp to reasonable range
    const clampedSize = Math.min(Math.max(fontSize, 40), 90);

    return (
        <div style={{
            fontSize: clampedSize,
            fontFamily: interFamily,
            fontWeight: 800,
            textAlign: "center",
            padding: "0 8%",
        }}>
            {text}
        </div>
    );
};
```

**Advanced: Fit Text on N Lines:**
```tsx
import { fitTextOnNLines } from "@remotion/layout-utils";

// Force caption to exactly 2 lines for visual consistency
const { fontSize } = fitTextOnNLines({
    fontFamily: interFamily,
    fontWeight: "800",
    text: pageText,
    withinWidth: 1080 * 0.85,
    maxLines: 2,
});
```

**Expected Impact:** ⭐⭐⭐⭐ — Captions auto-scale to content length. No more overflow or wasted space. Significant visual quality improvement.

---

#### 9.4 Deterministic Noise with `@remotion/noise`

**Problem:** Improvement 5.2 identified that the Glitch style uses `Math.random()`, causing non-deterministic renders. The proposed fix was a hand-rolled `seededRandom()` using `Math.sin()`. This works but is mathematically weak and doesn't produce smooth visual noise.

**Package:** `@remotion/noise` — provides `noise2D()`, `noise3D()`, and `noise4D()` functions using Simplex noise. These are:
- **Deterministic** — same input always gives same output ✅
- **Smooth** — values change gradually, not randomly ✅
- **Seedable** — pass different seeds for different patterns ✅

**Implementation:**
```tsx
import { noise2D } from "@remotion/noise";

// BEFORE (broken — non-deterministic):
const glitchOffset = frame % 8 < 2 ? (Math.random() - 0.5) * 6 : 0;

// AFTER (deterministic + visually smooth):
const GLITCH_SEED = "clipmint-glitch";
const glitchOffset = frame % 8 < 2
    ? noise2D(GLITCH_SEED, frame * 0.1, pageIndex * 100) * 6
    : 0;

// Can also create organic color shifts:
const hueShift = noise2D("hue-shift", frame * 0.05, 0) * 15;  // ±15° hue variation
const scaleJitter = 1 + noise2D("scale", frame * 0.08, 0) * 0.03;  // ±3% scale
```

**Use in Other Styles Too:**
```tsx
// Neon style — flickering glow intensity
const glowIntensity = 15 + noise2D("neon-flicker", frame * 0.2, 0) * 5; // 10-20px glow

// Bounce style — organic wobble instead of rigid sine wave
const wobble = noise2D("bounce-wobble", frame * 0.15, 0) * 2; // degrees rotation

// Typewriter style — slightly varied keystroke timing
const typeDelay = noise2D("type-delay", charIndex * 0.5, frame * 0.01) * 30; // ms variation
```

**Why This Supersedes 5.2:** The proposed `Math.sin(seed * 9301 + 49297) * 49421` is a hash function, not noise. It produces scattered values, not smooth visual gradients. `@remotion/noise` uses Simplex noise — the same algorithm used in film VFX for procedural textures.

**Expected Impact:** ⭐⭐⭐ — Deterministic renders + visually superior noise patterns for all animated styles.

---

#### 9.5 Caption Animation Utilities with `@remotion/animation-utils`

**Problem:** Current caption styles use raw CSS transforms constructed with string concatenation:
```tsx
transform: `translateY(${bounceY}px) scale(${scale}) rotate(${wobble}deg)`
```
This is error-prone (missing spaces, wrong order) and doesn't support interpolation between states.

**Package:** `@remotion/animation-utils` — provides `makeTransform()` and `interpolateStyles()`

**Implementation:**
```tsx
import { makeTransform, interpolateStyles } from "@remotion/animation-utils";
import { interpolate, useCurrentFrame } from "remotion";

// BEFORE (string concatenation):
const transform = `translateY(${bounceY}px) scale(${scale}) rotate(${wobble}deg)`;

// AFTER (type-safe, composable):
const transform = makeTransform([
    ["translateY", `${bounceY}px`],
    ["scale", scale],
    ["rotate", `${wobble}deg`],
]);

// Animate between two complete CSS style states:
const frame = useCurrentFrame();
const animatedStyle = interpolateStyles(
    frame,
    [0, 10, 20],  // keyframes
    [
        { opacity: 0, transform: makeTransform([["translateY", "20px"], ["scale", 0.8]]) },
        { opacity: 1, transform: makeTransform([["translateY", "0px"], ["scale", 1.1]]) },
        { opacity: 1, transform: makeTransform([["translateY", "0px"], ["scale", 1.0]]) },
    ]
);
// Returns complete interpolated CSS styles at the current frame
```

**Expected Impact:** ⭐⭐ — Cleaner animation code, fewer transform bugs, smoother multi-property animations.

---

#### 9.6 Motion Blur for Caption Animations with `@remotion/motion-blur`

**Problem:** Caption entrance/exit animations (scale up, slide in, bounce) look flat and digital. Real video has motion blur on fast-moving elements, but CSS animations don't.

**Package:** `@remotion/motion-blur` — provides `<Trail>` and `<CameraMotionBlur>` HOCs

**Implementation:**
```tsx
import { Trail } from "@remotion/motion-blur";

// Wrap the caption word highlight in a Trail for motion blur during entrance
const HighlightedWord: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Trail
        layers={4}        // Number of motion blur layers
        lagInFrames={0.1} // How far behind each trail layer is
        trailOpacity={0.5} // Opacity of trail layers
    >
        <span style={{
            display: "inline-block",
            color: accentColor,
            transform: makeTransform([["scale", highlightScale]]),
        }}>
            {children}
        </span>
    </Trail>
);
```

> [!WARNING]
> Motion blur renders each frame multiple times (once per layer). With `layers: 4`, render time increases ~4x per element. Use sparingly — only on the actively highlighted word, not the entire caption block.

**Expected Impact:** ⭐⭐ — Cinematic feel on word highlight animations. Subtle but premium.

---

#### 9.7 Video Preloading with `@remotion/preload`

**Problem:** When the Remotion composition mounts, the source video file starts loading. The first few frames may render before the video is available, causing black frames or a flash of the background color at the start of clips.

**Package:** `@remotion/preload` — prefetch media assets before the composition starts rendering

**Implementation:**
```tsx
import { preloadVideo, preloadAudio } from "@remotion/preload";
import { delayRender, continueRender, staticFile } from "remotion";

// In CaptionedClip component:
const [handle] = useState(() => delayRender("Preloading video"));

useEffect(() => {
    const videoSrc = staticFile(props.videoSrc);

    // Start preloading
    const cancelPreload = preloadVideo(videoSrc);

    // Create a hidden video element to detect when it's ready
    const video = document.createElement("video");
    video.src = videoSrc;
    video.oncanplaythrough = () => {
        continueRender(handle);
    };
    video.onerror = () => {
        // Don't block render on preload failure
        continueRender(handle);
    };

    return () => {
        cancelPreload.free();
    };
}, [props.videoSrc, handle]);
```

**Expected Impact:** ⭐⭐⭐ — Eliminates black frame flicker at clip start. Consistent first-frame quality.

---

#### 9.8 Add `@remotion/openai-whisper` for Direct Transcript Parsing

**Problem:** The pipeline uses Python scripts to parse Groq Whisper's `verbose_json` output into Remotion's `Caption[]` format. This parser is custom code that runs in the GitHub Actions workflow — it has to handle word-level timing extraction, edge cases with missing words, and format normalization.

**Package:** `@remotion/openai-whisper` — directly converts OpenAI/Groq Whisper API output to Remotion's `Caption[]` format. Since Groq's API is OpenAI-compatible, this works out of the box.

**Implementation:**
```tsx
import { openAiWhisperApiToCaptions } from "@remotion/openai-whisper";

// In the pipeline (Node.js context, or pre-render script):
const whisperResponse = JSON.parse(
    fs.readFileSync("workspace/audio/full_captions.json", "utf-8")
);

// Direct conversion — handles all edge cases
const { captions } = openAiWhisperApiToCaptions({
    transcription: whisperResponse,
});

// Write Remotion-native format
fs.writeFileSync(
    "workspace/clips/clip_001.captions.json",
    JSON.stringify(captions)
);
```

**Why This Matters:**
- The current Python parser (`process-video.yml` Step 4) manually extracts `word.start` and `word.end` from Groq's response. This package handles it natively.
- Handles edge cases: missing words, words spanning segment boundaries, punctuation-only entries.
- If Groq/OpenAI changes their Whisper output format, Remotion will update the parser — ClipMint doesn't have to.

**Expected Impact:** ⭐⭐⭐ — Eliminates custom parsing code. More robust transcript-to-caption conversion.

---

#### 9.9 Lambda/Cloud Run for Parallel Rendering at Scale

**Problem:** Currently all rendering happens on a single GitHub Actions runner (2 vCPU, 7GB RAM). Improvement 4.5 proposes `parallel -j4` but 4 Remotion renders on 2 vCPU will thrash the CPU and may OOM. There's a hard ceiling on rendering speed.

**Packages:** `@remotion/lambda` (AWS) or `@remotion/cloudrun` (GCP)

> [!IMPORTANT]
> These packages require a Remotion license for production use. The free tier allows limited renders for evaluation. This improvement is for the **paid tier** roadmap.

**Architecture:**
```
Current:
  GitHub Actions (2 vCPU) → Remotion render (serial) → 10 clips = ~15 min

With Lambda/Cloud Run:
  GitHub Actions → trigger 10 parallel Lambda/Cloud Run renders
                  → each clip renders independently (~30s)
                  → total = ~1-2 min
```

**Implementation Sketch (Lambda):**
```tsx
import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda-client";

// Trigger parallel renders for all clips
const renderPromises = clips.map((clip) =>
    renderMediaOnLambda({
        region: "ap-south-1",  // Mumbai for Indian market
        functionName: "remotion-render-clipmint",
        composition: "CaptionedClip",
        inputProps: {
            videoSrc: clip.driveUrl,
            captionsData: clip.captions,
            captionStyle: style,
        },
        codec: "h264",
    })
);

const renders = await Promise.all(renderPromises);

// Poll for completion
for (const render of renders) {
    let progress = 0;
    while (progress < 1) {
        const status = await getRenderProgress({
            renderId: render.renderId,
            functionName: "remotion-render-clipmint",
            region: "ap-south-1",
        });
        progress = status.overallProgress;
    }
}
```

**Cost Estimate:**
- AWS Lambda: ~$0.008 per 30s clip render (128MB, 30s duration)
- 10 clips = $0.08 per job
- 100 jobs/month = $8/month
- Cloud Run: similar pricing

**Expected Impact:** ⭐⭐⭐⭐ — 10x faster rendering. Enables real-time clip generation for premium users.

---

## TIER 9 — Dependency Impact Summary

| Package | Install Size | License | Cost | Effort |
|---------|-------------|---------|------|--------|
| `@remotion/google-fonts` | ~2MB | MIT | Free | ⚡ Easy |
| `@remotion/transitions` | ~50KB | MIT | Free | 🔧 Medium |
| `@remotion/layout-utils` | ~30KB | MIT | Free | 🔧 Medium |
| `@remotion/noise` | ~15KB | MIT | Free | ⚡ Easy |
| `@remotion/animation-utils` | ~20KB | MIT | Free | ⚡ Easy |
| `@remotion/motion-blur` | ~25KB | MIT | Free | ⚡ Easy |
| `@remotion/preload` | ~10KB | MIT | Free | ⚡ Easy |
| `@remotion/openai-whisper` | ~15KB | MIT | Free | ⚡ Easy |
| `@remotion/lambda` | ~500KB | License | ~$8/mo | 🔨 Hard |

**Updated `package.json` (after all TIER 9 additions):**
```json
{
    "dependencies": {
        "@remotion/cli": "^4.0.0",
        "@remotion/captions": "^4.0.0",
        "@remotion/zod-types": "^4.0.0",
        "@remotion/google-fonts": "^4.0.0",
        "@remotion/transitions": "^4.0.0",
        "@remotion/layout-utils": "^4.0.0",
        "@remotion/noise": "^4.0.0",
        "@remotion/animation-utils": "^4.0.0",
        "@remotion/motion-blur": "^4.0.0",
        "@remotion/preload": "^4.0.0",
        "@remotion/openai-whisper": "^4.0.0",
        "remotion": "^4.0.0",
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "zod": "^4.0.0"
    }
}
```

---

## Updated Production Roadmap (v2)

```
Week 1-2: TIER 1 (Pipeline Intelligence) — existing
├── 1.1 Sliding window transcript analysis
├── 1.2 Two-pass AI scoring with rubric
├── 1.3 Audio energy analysis + score boosting
└── 1.4 Silence-based clip boundary snapping

Week 2-3: TIER 4 (Pipeline Resilience) + TIER 9a (Quick Remotion Wins) — NEW
├── 4.1 Retry logic for Groq API calls ⚡ CRITICAL
├── 4.2 Pipeline state checkpointing
├── 4.3 Granular error messages
├── 4.4 Video download validation
├── 4.5 Parallel clip rendering
├── 9.1 @remotion/google-fonts ⚡ SUPERSEDES 5.1
├── 9.4 @remotion/noise (deterministic effects) ⚡ SUPERSEDES 5.2
├── 9.7 @remotion/preload (no black first frames)
└── 9.8 @remotion/openai-whisper (replace custom parser)

Week 3-4: TIER 2 (Polish & Platform) + TIER 9b (Visual Polish) — existing + NEW
├── 2.1 Visual scene change detection
├── 2.2 YouTube metadata integration
├── 2.3 Smart clip length optimization
├── 2.4 Caption quality validation
├── 9.2 @remotion/transitions (intro/outro)
├── 9.3 @remotion/layout-utils (auto font sizing)
├── 9.5 @remotion/animation-utils (cleaner transforms)
└── 9.6 @remotion/motion-blur (word highlight blur)

Week 4-5: TIER 5 (Remotion Quality) + TIER 6 (API Security) — existing
├── 5.3 Page duration fallback fix
├── 5.4 Configurable caption pacing
├── 5.5 Render output validation
├── 6.1 URL input sanitization ⚡ CRITICAL SECURITY
├── 6.2 Fix bare except: in pipeline
├── 6.3 API key last_used_at tracking
└── 6.4 Request body size limit

Week 5-6: TIER 7 (Database) + TIER 8 (Dashboard) — existing
├── 7.1 Add increment_videos_used RPC ⚡ CRITICAL
├── 7.2 Add updated_at trigger on clips
├── 7.3 Fix stale transcript_srt column
├── 7.4 Index for drive_file_id lookup
├── 8.1 Real-time job status (Supabase Realtime)
├── 8.2 Clip video preview embed
├── 8.3 Store clip duration_seconds
├── 8.4 Bulk download / Drive folder link
└── 8.5 Webhook notification on completion

Week 7-8: TIER 3 (Advanced) — existing
├── 3.1 Gemini 2.5 multimodal analysis
├── 3.2 Speaker diarization
├── 3.3 Performance feedback loop
├── 3.4 Multi-format rendering
└── 3.5 AI thumbnail generation

Week 9+: TIER 9c (Scale) — NEW
└── 9.9 Lambda/Cloud Run parallel rendering (paid tier)
```

---

## Updated Critical Fixes Summary (Do First)

> [!CAUTION]
> These issues can cause data loss, security vulnerabilities, or broken billing. Fix ASAP.

| # | Issue | Severity | File |
|---|-------|----------|------|
| 7.1 | `increment_videos_used` RPC missing — free tier has no limit enforcement | 🔴 CRITICAL | `schema.sql` |
| 6.1 | No URL validation — SSRF/injection risk via `video_url` | 🔴 CRITICAL | `api-gateway/src/index.ts` |
| 4.1 | No retry on Groq API — pipeline fails on any transient 429/503 | 🟡 HIGH | `process-video.yml` |
| 9.1 | Font loading broken — `@remotion/google-fonts` is the correct fix | 🟡 HIGH | `CaptionedClip.tsx` |
| 9.4 | `Math.random()` in Glitch — use `@remotion/noise` for deterministic renders | 🟡 HIGH | `CaptionedClip.tsx` |
| 9.7 | No video preloading — black first frames on clips | 🟠 MEDIUM | `CaptionedClip.tsx` |

---

## Package Count: Current vs After All Tiers

```
Current Remotion Packages (3):
  @remotion/cli, @remotion/captions, @remotion/zod-types

After TIER 9 (11):
  + @remotion/google-fonts     (fonts)
  + @remotion/transitions      (intro/outro)
  + @remotion/layout-utils     (auto font sizing)
  + @remotion/noise            (deterministic effects)
  + @remotion/animation-utils  (clean transforms)
  + @remotion/motion-blur      (word highlight blur)
  + @remotion/preload          (video prefetch)
  + @remotion/openai-whisper   (transcript parsing)
```

---

*Last updated: March 8, 2026*
