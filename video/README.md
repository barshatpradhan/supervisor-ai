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
| Headers (title cards, scene headlines, end-card tagline) | Instrument Sans | 700 | SIL Open Font License 1.1 |
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

The video takes **one** soundtrack: music and voiceover already mixed together.

1. Mix the voiceover over the music (duck the music about 10-12 dB under the voice; master to
   -14 LUFS integrated, -1 dBTP true peak), 60.0 s long, starting at 0:00.
2. Export it as MP3 and save it as **`video/public/audio/mix.mp3`** (create the folder if needed).
3. Run `npm run render:master`. `src/Master.tsx` adds it with `staticFile('audio/mix.mp3')`.

Without that file the video renders silent, which is how previews work until the mix exists.
Audio files are not committed (`public/audio/*.mp3` is ignored); keep the source mix elsewhere.

## Renders

| Script | Composition | Output |
| --- | --- | --- |
| `npm run render:master` | `Master16x9`, 1920 x 1080, 60 s | `out/master-16x9.mp4` |
| `npm run render:vertical` | `Vertical9x16`, 1080 x 1920 (not built yet) | `out/vertical-9x16.mp4` |
| `npm run render:cut15` | `Cut15`, 15 s (not built yet) | `out/cut-15s.mp4` |

Each uses `--concurrency=2`. `out/` and `node_modules/` are not committed.

## Before the final render

- Replace `WEBSITE_URL` in `src/scenes/Cta.tsx`.
- Put the mixed soundtrack at `public/audio/mix.mp3` (see Audio).
