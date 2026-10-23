# Supervisor AI promo video

Remotion source for the 60-second promo. It renders the app's **real** components and stylesheet
from `../frontend/src` (Header, RecommendationCard, TaskChip, StatusBadge, ProgressBar, RadialScore,
Chip, and the avatar component with `avatar-core.ts` and `avatar.css`), so the video draws what the
product draws. Only screens the app has no single component for (board, workload list, chat layout,
progress form) are recreated, with the app's own classes and tokens.

## Run

```sh
cd video
npm install
npm test            # pins every number to the app's formulas
npm run typecheck
npm run studio      # preview in the browser
npm run still -- out/frame.png --frame=600
npm run render:master
npm run srt         # out/captions.srt from the burned-in cues
npm run voiceover   # out/voiceover-elevenlabs.txt, the script to paste into ElevenLabs
npm run mix         # public/audio/mix.mp3 from voiceover.mp3 and music.mp3, see Audio
```

The frontend's dependencies must be installed (`cd ../frontend && npm install`): React Router and
lucide-react are shared with the app's components so there is one router context and one icon set.

## Where things live

| Path | What |
| --- | --- |
| `src/data/scoring.ts` | The app's formulas: match score (50/15/15/10/5/5), workload, availability, project progress |
| `src/data/demo.ts` | The fictional organisation (Bramblewick Freight): people, skills, hours, tasks, chat |
| `src/data/surfaces.ts` | Where the app passes `avatarVariant` today. Flip an entry when the app starts passing it |
| `src/timeline.ts` | Act boundaries and the caption cues (also the SRT) |
| `src/theme.ts` | One easing curve, 2-frame stagger, 12-frame entrances, colours |
| `src/typography.ts` | Header font, weight, size scale, line height and tracking (every header uses `headerStyle`) |
| `src/components/` | `PersonAvatar` (the app's Avatar, always static), cursor, captions, board, chat |
| `src/scenes/` | One file per act |

## Type

| Use | Font | Weight | License |
| --- | --- | --- | --- |
| Headers (opening headlines, title cards, end-card tagline) | Instrument Sans | 700 | SIL Open Font License 1.1 |
| Recreated app UI, captions | Inter | 400-700 | SIL Open Font License 1.1 |
| Numbers | JetBrains Mono | 400-600 | SIL Open Font License 1.1 |

Instrument Sans loads through `@remotion/google-fonts` in `src/typography.ts`, and `Master16x9` waits
for it before mounting any scene, so no frame renders in a fallback font. Rendering fetches the
font files from Google Fonts, so it needs network access; nothing has to be installed locally.

## Avatars

Faces follow the app on `main` (avatar Phase 1): a person's own avatar appears only in their own
header and profile; every list draws initials. `PersonAvatar` takes a `variant`, and scenes pass
`variantOn(surface, person.avatarVariant)`, so switching faces on for a surface is a one-line data
change in `surfaces.ts`. The real RecommendationCard decides for itself, exactly as in the app.

## Audio

The video plays **one** soundtrack, `public/audio/mix.mp3`, which `npm run mix` builds:

1. `npm run voiceover` writes `out/voiceover-elevenlabs.txt`. Generate it in ElevenLabs
   (Multilingual v2 reads the `<break>` pauses) and save the MP3 as **`public/audio/voiceover.mp3`**.
2. Save the music as **`public/audio/music.mp3`** (optional).
3. `npm run mix` cuts the voiceover at its pauses and places each line where its caption starts.
   It extends the 30 s music to 60 s on its own beat grid (bar-line cuts, the track's ending at
   60 s), dips it around 2.5 kHz and ducks it while she speaks. It masters to -14 LUFS with peaks
   under -1 dBTP and writes exactly 60.0 s to `public/audio/mix.mp3`.
4. `npm run render:master`. `src/Master.tsx` adds the mix with `staticFile('audio/mix.mp3')`.

Where each line sits in the current take is listed in `LINES` in `scripts/mix-audio.ts` (found with
ffmpeg `silencedetect`), and how the music is cut is in `BED` (120 BPM, downbeat at 0.24 s); a new
take or a new track needs its table updated. Without `mix.mp3` the video renders
silent. Audio files are not committed (`public/audio/*.mp3` is ignored); keep the sources elsewhere.

## Renders

| Script | Composition | Output |
| --- | --- | --- |
| `npm run render:master` | `Master16x9`, 1920 x 1080, 60 s | `out/master-16x9.mp4` |
| `npm run render:vertical` | `Vertical9x16`, 1080 x 1920 (not built yet) | `out/vertical-9x16.mp4` |
| `npm run render:cut15` | `Cut15`, 15 s (not built yet) | `out/cut-15s.mp4` |

Each uses `--concurrency=2`. `out/` and `node_modules/` are not committed.

## Before the final render

- Build the soundtrack with `npm run mix` (see Audio).
