/**
 * Supervisor AI avatar system, v1.
 *
 * Framework-free core: preset data, the stored-ID format, and a renderer that
 * turns a config into four small SVG layers (disc, body, face, hand). The React
 * component and any server/email code share this file, so every surface draws
 * identical avatars.
 *
 * All markup is built from the constants below and validated integer indices,
 * never from user text, so it is safe to inject with innerHTML.
 */

/* ------------------------------------------------------------------ sizes */

// Design sizes are 24, 32, 40, 64 and 128 px; the component accepts any size and picks a tier.

/** Detail tier per size. Smaller tiers zoom in on the face and drop fine detail. */
type Tier = "xs" | "sm" | "md" | "lg";
export function tierFor(size: number): Tier {
  if (size <= 24) return "xs";
  if (size <= 40) return "sm";
  if (size <= 64) return "md";
  return "lg";
}

/** Character viewBox per tier: xs and sm crop toward the face so it stays legible. */
const VIEWBOX: Record<Tier, string> = {
  xs: "19 18 62 62",
  sm: "10 9 80 80",
  md: "2 1 96 96",
  lg: "0 0 100 100",
};

/* ----------------------------------------------------------------- palette */

interface SkinTone { id: number; name: string; base: string; shade: string }
export const SKIN_TONES: SkinTone[] = [
  { id: 1, name: "Light", base: "#F5D5BF", shade: "#E2B396" },
  { id: 2, name: "Light medium", base: "#EBB993", shade: "#D39871" },
  { id: 3, name: "Medium", base: "#D29A6C", shade: "#B67B50" },
  { id: 4, name: "Medium deep", base: "#AE6F45", shade: "#8F5533" },
  { id: 5, name: "Deep", base: "#86522F", shade: "#6B3F22" },
  { id: 6, name: "Very deep", base: "#5E3822", shade: "#472816" },
];

/** Disc colors. tint = disc face, mid = disc edge, ink = initials text. No violet: it's reserved for AI. */
interface DiscColor { id: number; name: string; tint: string; mid: string; ink: string }
export const DISC_COLORS: DiscColor[] = [
  { id: 1, name: "Indigo", tint: "#EBEFFF", mid: "#C6CFF5", ink: "#2E3F86" },
  { id: 2, name: "Lagoon", tint: "#E1F3F0", mid: "#B3DBD5", ink: "#1E5C57" },
  { id: 3, name: "Peach", tint: "#FDEBDF", mid: "#F4C7AA", ink: "#8A4020" },
  { id: 4, name: "Sun", tint: "#FBF2D4", mid: "#EED78F", ink: "#6E500A" },
  { id: 5, name: "Sage", tint: "#E6F0E3", mid: "#BDD6B8", ink: "#335A3C" },
  { id: 6, name: "Stone", tint: "#EFEEE9", mid: "#D5D2C8", ink: "#48453D" },
];

export interface Accessory { id: number; name: string }
export const ACCESSORIES: Accessory[] = [
  { id: 0, name: "None" },
  { id: 1, name: "Glasses" },
  { id: 2, name: "Headphones" },
  { id: 3, name: "Earrings" },
];

/* ----------------------------------------------------------------- presets */

type Hair =
  | "crop" | "waves" | "hijab" | "turban" | "afro" | "bun"
  | "headwrap" | "cap" | "bald" | "bob" | "locs" | "sidepart";
type Clothing = "crew" | "collar" | "hoodie" | "turtleneck";

interface Preset {
  id: number;
  name: string;
  /** Short description used in aria-labels and the picker. */
  description: string;
  hair: Hair;
  hairColor: string;
  /** Secondary color: covering accents, cap brim, headwrap pattern. */
  accent?: string;
  clothing: Clothing;
  clothingColor: string;
  beard?: string;
  brows: boolean;
  /** Ears hidden: earrings are not offered. */
  coversEars?: boolean;
  defaults: { skin: number; color: number; accessory: number };
}

export const PRESETS: Preset[] = [
  { id: 1, name: "Crop", description: "short cropped hair, crew-neck sweater", hair: "crop", hairColor: "#3B2A20", clothing: "crew", clothingColor: "#4157AD", brows: true, defaults: { skin: 2, color: 1, accessory: 0 } },
  { id: 2, name: "Waves", description: "long wavy hair, collared shirt", hair: "waves", hairColor: "#221A1B", clothing: "collar", clothingColor: "#B85A38", brows: true, defaults: { skin: 3, color: 3, accessory: 3 } },
  { id: 3, name: "Hijab", description: "hijab with an under-scarf", hair: "hijab", hairColor: "#B04D66", accent: "#F2D9DF", clothing: "crew", clothingColor: "#3D3F4A", brows: true, coversEars: true, defaults: { skin: 4, color: 2, accessory: 0 } },
  { id: 4, name: "Turban", description: "turban and beard, collared shirt", hair: "turban", hairColor: "#C38A1B", clothing: "collar", clothingColor: "#2C3A63", beard: "#221A1B", brows: true, defaults: { skin: 4, color: 1, accessory: 0 } },
  { id: 5, name: "Afro", description: "rounded afro, hoodie", hair: "afro", hairColor: "#2A1E1A", clothing: "hoodie", clothingColor: "#4B7A56", brows: true, defaults: { skin: 5, color: 4, accessory: 2 } },
  { id: 6, name: "Bun", description: "hair in a top bun, crew-neck sweater", hair: "bun", hairColor: "#8A4425", clothing: "crew", clothingColor: "#B04D66", brows: true, defaults: { skin: 1, color: 5, accessory: 1 } },
  { id: 7, name: "Headwrap", description: "patterned headwrap", hair: "headwrap", hairColor: "#B85A38", accent: "#F2C14E", clothing: "crew", clothingColor: "#2F7A74", brows: true, defaults: { skin: 6, color: 6, accessory: 3 } },
  { id: 8, name: "Cap", description: "baseball cap, hoodie", hair: "cap", hairColor: "#5A3A26", accent: "#4157AD", clothing: "hoodie", clothingColor: "#3D3F4A", brows: false, defaults: { skin: 3, color: 4, accessory: 0 } },
  { id: 9, name: "Beard", description: "shaved head and full beard, crew-neck sweater", hair: "bald", hairColor: "#4A3426", clothing: "crew", clothingColor: "#2F7A74", beard: "#4A3426", brows: true, defaults: { skin: 5, color: 6, accessory: 1 } },
  { id: 10, name: "Bob", description: "bob haircut with bangs, turtleneck", hair: "bob", hairColor: "#221A1B", clothing: "turtleneck", clothingColor: "#A87412", brows: false, defaults: { skin: 2, color: 2, accessory: 0 } },
  { id: 11, name: "Locs", description: "shoulder-length locs, collared shirt", hair: "locs", hairColor: "#2A1E1A", clothing: "collar", clothingColor: "#4157AD", brows: true, defaults: { skin: 6, color: 5, accessory: 2 } },
  { id: 12, name: "Silver", description: "short silver hair with a side part, cardigan", hair: "sidepart", hairColor: "#C4C0B8", clothing: "collar", clothingColor: "#2C3A63", brows: true, defaults: { skin: 1, color: 3, accessory: 1 } },
];

/* --------------------------------------------------------------- stored ID */

export interface AvatarConfig { preset: number; skin: number; color: number; accessory: number }

/**
 * Stored format: "p03-s4-c2-a1". 12 characters, fits a text column with a check constraint.
 * Must match AVATAR_ID_PATTERN in backend/src/utils/avatarVariant.ts (its test reads this line).
 * @public
 */
export const AVATAR_ID_PATTERN = /^p(0[1-9]|1[0-2])-s([1-6])-c([1-6])-a([0-3])$/;

export function parseAvatarId(id: string | null | undefined): AvatarConfig | null {
  if (!id) return null;
  const m = AVATAR_ID_PATTERN.exec(id.trim());
  if (!m) return null;
  return normalizeConfig({ preset: +m[1], skin: +m[2], color: +m[3], accessory: +m[4] });
}

export function formatAvatarId(c: AvatarConfig): string {
  const n = normalizeConfig(c);
  return `p${String(n.preset).padStart(2, "0")}-s${n.skin}-c${n.color}-a${n.accessory}`;
}

/** Clamp to valid ranges and drop accessories a preset can't show. */
export function normalizeConfig(c: AvatarConfig): AvatarConfig {
  const preset = clampInt(c.preset, 1, PRESETS.length);
  const p = PRESETS[preset - 1];
  let accessory = clampInt(c.accessory, 0, 3);
  if (accessory === 3 && p.coversEars) accessory = 0;
  return { preset, skin: clampInt(c.skin, 1, 6), color: clampInt(c.color, 1, 6), accessory };
}

export function defaultConfig(preset: number): AvatarConfig {
  const p = PRESETS[clampInt(preset, 1, PRESETS.length) - 1];
  return { preset: p.id, ...p.defaults };
}

export function isAccessoryAllowed(preset: number, accessory: number): boolean {
  return !(accessory === 3 && PRESETS[preset - 1]?.coversEars);
}

/** Human description for aria-labels and picker options. */
export function describeAvatar(c: AvatarConfig): string {
  const p = PRESETS[c.preset - 1];
  const acc = c.accessory === 1 ? ", glasses" : c.accessory === 2 ? ", headphones" : c.accessory === 3 ? ", earrings" : "";
  return `Illustrated person with ${p.description}${acc}`;
}

/* --------------------------------------------------------- initials fallback */

/** Up to two initials: first and last word. Grapheme-aware, so accents and non-Latin scripts work. */
export function initialsFor(nameOrEmail: string | null | undefined, max: 1 | 2 = 2): string {
  if (!nameOrEmail) return "";
  let s = nameOrEmail.trim();
  if (s.includes("@")) s = s.split("@")[0].replace(/[._\-+]+/g, " ");
  const words = s.split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const first = (w: string) => {
    if (typeof Intl.Segmenter === "function") {
      const it = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(w)[Symbol.iterator]().next();
      return it.done ? "" : it.value.segment;
    }
    return Array.from(w)[0] ?? "";
  };
  const letters = words.length > 1 && max === 2 ? first(words[0]) + first(words[words.length - 1]) : first(words[0]);
  return letters.toLocaleUpperCase();
}

/** Deterministic disc color from a stable key (use the user ID, not the name, so it survives renames). */
export function fallbackColorFor(key: string | null | undefined): number {
  let h = 0x811c9dc5;
  for (const ch of key ?? "") { h ^= ch.codePointAt(0)!; h = Math.imul(h, 0x01000193); }
  return ((h >>> 0) % DISC_COLORS.length) + 1;
}

/* ------------------------------------------------------------ color helpers */

function clampInt(n: number, lo: number, hi: number) {
  n = Math.round(Number.isFinite(n) ? n : lo);
  return Math.min(hi, Math.max(lo, n));
}
function hex(h: string): [number, number, number] {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
export function mix(a: string, b: string, t: number): string {
  const x = hex(a), y = hex(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
const lighten = (c: string, t: number) => mix(c, "#ffffff", t);
const darken = (c: string, t: number) => mix(c, "#1a1220", t);

/* ---------------------------------------------------------------- renderer */

interface AvatarLayers {
  viewBox: string;
  disc: string;
  body: string;
  face: string;
  /** Empty except at the lg tier, where the profile wave uses it. */
  hand: string;
}

/** Clay gradient: highlight top-left, base, shade bottom-right. */
function clay(id: string, base: string, shade?: string) {
  return `<radialGradient id="${id}" cx=".34" cy=".28" r=".85"><stop offset="0" stop-color="${lighten(base, 0.28)}"/><stop offset=".5" stop-color="${base}"/><stop offset="1" stop-color="${shade ?? darken(base, 0.22)}"/></radialGradient>`;
}
function vgrad(id: string, top: string, bottom: string) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;
}

const FACE_OVAL = "M36.4 49.5A13.6 15.6 0 1 0 63.6 49.5A13.6 15.6 0 1 0 36.4 49.5Z";
const BEARD = "M33.8 50C34 62 41 70 50 70C59 70 66 62 66.2 50C64.5 57 60.5 61 56 60.3C53 59.8 47 59.8 44 60.3C39.5 61 35.5 57 33.8 50Z";

/** The disc on its own: used behind characters and behind initials fallbacks. */
export function renderDisc(color: number, size: number, uid: string): string {
  const disc = DISC_COLORS[clampInt(color, 1, DISC_COLORS.length) - 1];
  const t = tierFor(size);
  const g = (n: string) => `${uid}-${n}`;
  const url = (n: string) => `url(#${g(n)})`;
  return (
    `<defs><radialGradient id="${g("d")}" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="${lighten(disc.tint, 0.55)}"/><stop offset=".55" stop-color="${disc.tint}"/><stop offset="1" stop-color="${disc.mid}"/></radialGradient>` +
    `<linearGradient id="${g("sh")}" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="${g("rim")}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
    `<circle cx="50" cy="50" r="50" fill="${url("d")}"/>` +
    `<ellipse cx="34" cy="24" rx="27" ry="15" transform="rotate(-28 34 24)" fill="${url("sh")}" opacity="${t === "xs" ? 0.5 : 0.7}"/>` +
    (t === "xs" ? "" : `<circle cx="50" cy="50" r="48.6" fill="none" stroke="${url("rim")}" stroke-width="1.6"/>`)
  );
}

/** Neutral glyph for "no avatar, no name" (e.g. an unassigned slot). Uses currentColor. */
export const PLACEHOLDER_GLYPH =
  `<g fill="currentColor" opacity=".55"><circle cx="50" cy="40" r="13"/><path d="M24 80C26 66 37 59 50 59C63 59 74 66 76 80C68 84 32 84 24 80Z"/></g>`;

/**
 * Render the four layers for a config at a size. `uid` must be unique per
 * avatar instance in the document (gradient IDs are scoped by it).
 */
export function renderLayers(input: AvatarConfig, size: number, uid: string): AvatarLayers {
  const c = normalizeConfig(input);
  const t = tierFor(size);
  const p = PRESETS[c.preset - 1];
  const skin = SKIN_TONES[c.skin - 1];
  const fine = t === "md" || t === "lg";
  const big = t === "lg";
  const g = (n: string) => `${uid}-${n}`;
  const url = (n: string) => `url(#${g(n)})`;

  const discSvg = renderDisc(c.color, size, uid);

  /* ---- body layer */
  const defs: string[] = [
    clay(g("sk"), skin.base, skin.shade),
    vgrad(g("nk"), skin.shade, mix(skin.shade, skin.base, 0.4)),
    vgrad(g("cl"), lighten(p.clothingColor, 0.18), darken(p.clothingColor, 0.18)),
    clay(g("hr"), p.hairColor),
  ];
  const parts: string[] = [];
  const hairFill = url("hr");

  // soft contact shadow of the character on the disc (clay depth without filters)
  defs.push(`<radialGradient id="${g("cs")}"><stop offset="0" stop-color="#1a1220" stop-opacity=".16"/><stop offset="1" stop-color="#1a1220" stop-opacity="0"/></radialGradient>`);
  parts.push(`<ellipse cx="53" cy="80" rx="44" ry="26" fill="${url("cs")}"/>`);

  // back hair (behind body and head)
  switch (p.hair) {
    case "waves": parts.push(`<path fill="${hairFill}" d="M31.5 48C30 31 39.5 25 50 25C60.5 25 70 31 68.5 48C69 58 70 66 72.5 74C68 80 60 79 57.5 74H42.5C40 79 32 80 27.5 74C30 66 31 58 31.5 48Z"/>`); break;
    case "afro": parts.push(`<circle cx="50" cy="40" r="23" fill="${hairFill}"/>`); break;
    case "bun": parts.push(`<circle cx="50" cy="23" r="7.5" fill="${hairFill}"/>`); break;
    case "bob": parts.push(`<path fill="${hairFill}" d="M31.2 50C30 32 39 25.5 50 25.5C61 25.5 70 32 68.8 50L69.3 64C65.5 66.5 61 65.5 59.5 63H40.5C39 65.5 34.5 66.5 30.7 64Z"/>`); break;
    case "locs": parts.push(`<path fill="${hairFill}" d="M31.5 47C30.5 31 39.5 25 50 25C60.5 25 69.5 31 68.5 47L70.5 78H61.5L60 62H40L38.5 78H29.5Z"/>`);
      if (fine) parts.push(`<g stroke="${darken(p.hairColor, 0.35)}" stroke-width=".9" stroke-linecap="round" opacity=".7"><path d="M32.5 52V76M35.5 54V76M64.5 54V76M67.5 52V76"/></g>`); break;
    case "cap": parts.push(`<path fill="${hairFill}" d="M32.6 50C32 38 38 31 50 31C62 31 68 38 67.4 50Z"/>`); break;
  }

  // body + clothing
  parts.push(`<path fill="${url("cl")}" d="M12 106C12 85 28 74 50 74C72 74 88 85 88 106Z"/>`);
  if (fine) parts.push(`<path fill="#fff" opacity=".18" d="M22 88C26 80 34 76.5 42 75.5C34 79 28 84 25 92Z"/>`);
  parts.push(`<path fill="${url("nk")}" d="M43.5 56H56.5L57 75C54 78.5 46 78.5 43 75Z"/>`);
  const cDark = darken(p.clothingColor, 0.3);
  switch (p.clothing) {
    case "crew": parts.push(`<path d="M40.5 74C43 81 57 81 59.5 74" fill="none" stroke="${cDark}" stroke-width="2.6" stroke-linecap="round"/>`); break;
    case "collar": parts.push(`<path fill="#F4F2EC" d="M43 73L50 80.5L44.5 85L39 76.5ZM57 73L50 80.5L55.5 85L61 76.5Z"/>`); break;
    case "hoodie":
      parts.push(`<path fill="${lighten(p.clothingColor, 0.14)}" d="M35.5 79C37.5 70 45 68.5 50 73C55 68.5 62.5 70 64.5 79C58 76 42 76 35.5 79Z"/>`);
      if (fine) parts.push(`<path d="M46.5 78.5L45.5 90M53.5 78.5L54.5 90" stroke="#F4F2EC" stroke-width="1.3" stroke-linecap="round"/>`);
      break;
    case "turtleneck":
      parts.push(`<path fill="${lighten(p.clothingColor, 0.08)}" d="M42.3 65.5C45 63.8 55 63.8 57.7 65.5L58.5 76C55 79.5 45 79.5 41.5 76Z"/>`);
      if (fine) parts.push(`<path d="M43 69.5C46 71 54 71 57 69.5M42.8 73C46 74.6 54 74.6 57.2 73" fill="none" stroke="${cDark}" stroke-width=".8" opacity=".55"/>`);
      break;
  }

  // ears, head
  if (!p.coversEars) parts.push(`<ellipse cx="34.3" cy="49" rx="3.2" ry="4.4" fill="${skin.shade}"/><ellipse cx="65.7" cy="49" rx="3.2" ry="4.4" fill="${skin.shade}"/>`);
  parts.push(`<ellipse cx="50" cy="47" rx="16" ry="18.5" fill="${url("sk")}"/>`);
  if (fine && p.hair === "bald") parts.push(`<ellipse cx="44" cy="34.5" rx="5" ry="2.6" transform="rotate(-22 44 34.5)" fill="#fff" opacity=".32"/>`);
  if (p.beard) {
    parts.push(`<path fill="${url("bd")}" d="${BEARD}"/>`);
    defs.push(clay(g("bd"), p.beard));
  }
  if (c.accessory === 3 && t !== "xs" && t !== "sm") {
    parts.push(`<g fill="none" stroke="#D3A12A" stroke-width="1.1"><circle cx="33.6" cy="55.6" r="1.9"/><circle cx="66.4" cy="55.6" r="1.9"/></g>`);
  }

  // front hair / coverings
  const hd = darken(p.hairColor, 0.3);
  switch (p.hair) {
    case "crop": parts.push(`<path fill="${hairFill}" d="M33.6 49C32 33 40 27 50 27C60 27 68 33 66.4 49C65 43 62 39.5 57 38C52 40.5 44 40 39 38.5C36.5 41 34.5 45 33.6 49Z"/>`); break;
    case "waves": parts.push(`<path fill="${hairFill}" d="M33.4 50C31.5 33 40 26.5 50.5 26.5C61 26.5 69 33 66.6 50C65.5 42 62 36 55 34.5C50 38.5 41.5 42 33.4 50Z"/>`); break;
    case "hijab": {
      parts.push(`<path fill="${hairFill}" fill-rule="evenodd" d="M29.5 50C29.5 31 38.5 24 50 24C61.5 24 70.5 31 70.5 50C70.5 60 71.5 67 77 74.5C72 80.5 28 80.5 23 74.5C28.5 67 29.5 60 29.5 50Z${FACE_OVAL}"/>`);
      parts.push(`<path d="M37.8 40.5Q50 31 62.2 40.5" fill="none" stroke="${p.accent}" stroke-width="2" stroke-linecap="round"/>`);
      if (fine) parts.push(`<path d="M37 66C39 71 42 75 46 78M63 66C61 71 58 75 54 78" fill="none" stroke="${hd}" stroke-width=".9" opacity=".45" stroke-linecap="round"/>`);
      break;
    }
    case "turban":
      parts.push(`<path fill="${hairFill}" d="M32 46C29.5 31 38 21 50 21C62 21 70.5 31 68 46C63 40.5 57 38.5 50 41.5C43 38.5 37 40.5 32 46Z"/>`);
      if (fine) parts.push(`<path d="M35.5 40C41 30.5 55 26 64.5 32M38.5 32.5C44 27 53.5 24.8 61 27" fill="none" stroke="#fff" stroke-width="1" opacity=".38" stroke-linecap="round"/>`);
      break;
    case "afro": parts.push(`<path fill="${hairFill}" d="M34 47C33.5 35 41 31 50 31C59 31 66.5 35 66 47C63 40.5 57.5 37.5 50 37.5C42.5 37.5 37 40.5 34 47Z"/>`);
      if (big) parts.push(`<g fill="#fff" opacity=".13"><circle cx="38" cy="26" r="2.2"/><circle cx="46" cy="21" r="1.8"/><circle cx="57" cy="22" r="2.2"/><circle cx="64" cy="29" r="1.8"/><circle cx="31.5" cy="36" r="1.6"/></g>`);
      break;
    case "bun": parts.push(`<path fill="${hairFill}" d="M33.6 49C32.5 33 40.5 27 50 27C59.5 27 67.5 33 66.4 49C64 41 58 37 50 37C42 37 36 41 33.6 49Z"/>`);
      if (fine) parts.push(`<path d="M45 28.4Q50 31 55 28.4" fill="none" stroke="${hd}" stroke-width="1.2" stroke-linecap="round"/>`);
      break;
    case "headwrap":
      parts.push(`<path fill="${hairFill}" d="M31 48C28.5 33 36 18.5 50 17.5C64 18.5 71.5 33 69 48C63.5 41.5 57 39.5 50 39.5C43 39.5 36.5 41.5 31 48Z"/>`);
      if (fine) parts.push(`<path d="M33.5 42C40 33 58 30 67 40" fill="none" stroke="${hd}" stroke-width="1" opacity=".5"/>`);
      if (fine) parts.push(`<g fill="${p.accent}"><circle cx="39" cy="31" r="1.3"/><circle cx="46" cy="26.5" r="1.3"/><circle cx="57" cy="29" r="1.3"/><circle cx="63" cy="35" r="1.3"/><circle cx="51" cy="34" r="1.3"/></g>`);
      parts.push(`<ellipse cx="44.5" cy="21.5" rx="6" ry="4.2" transform="rotate(-32 44.5 21.5)" fill="${hairFill}"/><ellipse cx="55.5" cy="21.5" rx="6" ry="4.2" transform="rotate(32 55.5 21.5)" fill="${hairFill}"/><circle cx="50" cy="24.5" r="3.6" fill="${lighten(p.hairColor, 0.12)}"/>`);
      break;
    case "cap": {
      defs.push(clay(g("cp"), p.accent!));
      parts.push(`<path fill="${url("cp")}" d="M33 41C32.5 29.5 40.5 24.5 50 24.5C59.5 24.5 67.5 29.5 67 41Z"/>`);
      if (fine) parts.push(`<path d="M50 25V40" stroke="${darken(p.accent!, 0.3)}" stroke-width=".8" opacity=".6"/><circle cx="50" cy="25" r="1.6" fill="${darken(p.accent!, 0.2)}"/>`);
      parts.push(`<path fill="${darken(p.accent!, 0.18)}" d="M32.5 41C40 38.5 60 38.5 67.5 41C66.5 44.5 59 45.6 50 45.6C41 45.6 33.5 44.5 32.5 41Z"/>`);
      break;
    }
    case "bob": parts.push(`<path fill="${hairFill}" d="M33.4 47C32.5 33 40.5 26.5 50 26.5C59.5 26.5 67.5 33 66.6 47L66 44C61 42.8 56 42.4 50 42.4C44 42.4 39 42.8 34 44Z"/>`); break;
    case "locs": parts.push(`<path fill="${hairFill}" d="M33.6 48C32.5 33 40.5 27 50 27C59.5 27 67.5 33 66.4 48C64.5 41 59 37.5 50 37.5C41 37.5 35.5 41 33.6 48Z"/>`); break;
    case "sidepart": parts.push(`<path fill="${hairFill}" d="M33.6 49C32 32.5 41 26.5 51.5 26.5C61.5 26.5 68.4 33 66.4 48C64.5 39 58.5 34 46 34.5C41.5 37.5 36.8 42 33.6 49Z"/>`);
      if (fine) parts.push(`<path d="M46 34.5C47 31 49 28.5 51.5 27" fill="none" stroke="${darken(p.hairColor, 0.25)}" stroke-width=".9" stroke-linecap="round"/>`);
      break;
  }

  // headphones sit over hair
  if (c.accessory === 2 && t !== "xs") {
    parts.push(`<path d="M31 50C30 30 39 22 50 22C61 22 70 30 69 50" fill="none" stroke="#3D3F4A" stroke-width="3" stroke-linecap="round"/>`);
    parts.push(`<rect x="27.5" y="43.5" width="7.5" height="12.5" rx="3.7" fill="#3D3F4A"/><rect x="65" y="43.5" width="7.5" height="12.5" rx="3.7" fill="#3D3F4A"/>`);
    if (fine) parts.push(`<rect x="29" y="45.5" width="2" height="8.5" rx="1" fill="#6F82CC"/><rect x="69" y="45.5" width="2" height="8.5" rx="1" fill="#6F82CC"/>`);
  }

  const bodySvg = `<defs>${defs.join("")}</defs>${parts.join("")}`;

  /* ---- face layer (moves slightly on hover for a head-turn) */
  const f: string[] = [];
  const eyeScale = t === "xs" ? 1.35 : t === "sm" ? 1.15 : 1;
  const ink = "#21182A";
  if (fine && p.brows) f.push(`<path d="M41 44.2Q44 42.7 47 44M53 44Q56 42.7 59 44.2" fill="none" stroke="${darken(p.hairColor === "#C4C0B8" ? "#8E8A82" : p.hairColor, 0.1)}" stroke-width="1.3" stroke-linecap="round"/>`);
  if (t !== "xs") f.push(`<g fill="#F08A8A" opacity="${c.skin >= 5 ? 0.28 : 0.33}"><circle cx="40.5" cy="54.2" r="2.8"/><circle cx="59.5" cy="54.2" r="2.8"/></g>`);
  f.push(
    (c.skin >= 4 ? `<g fill="${lighten(skin.base, 0.42)}" opacity=".55"><ellipse cx="44" cy="49" rx="${2.6 * eyeScale}" ry="${3.1 * eyeScale}"/><ellipse cx="56" cy="49" rx="${2.6 * eyeScale}" ry="${3.1 * eyeScale}"/></g>` : "") +
    `<g class="av-eyes"><ellipse cx="44" cy="49" rx="${1.9 * eyeScale}" ry="${2.4 * eyeScale}" fill="${ink}"/><ellipse cx="56" cy="49" rx="${1.9 * eyeScale}" ry="${2.4 * eyeScale}" fill="${ink}"/>` +
    (fine ? `<circle cx="44.7" cy="48" r=".7" fill="#fff"/><circle cx="56.7" cy="48" r=".7" fill="#fff"/>` : "") + `</g>`
  );
  if (fine) f.push(`<path d="M49.2 52.6Q50 53.7 50.8 52.6" fill="none" stroke="${skin.shade}" stroke-width="1" stroke-linecap="round"/>`);
  const mw = t === "xs" ? 2.4 : t === "sm" ? 1.9 : 1.55;
  // open smile: the light fill keeps the mouth readable on every skin tone and on beards
  f.push(`<path d="M45.6 55.4Q50 60.6 54.4 55.4Z" fill="#FFF7F2" stroke="#4A2A33" stroke-width="${mw}" stroke-linejoin="round"/>`);
  if (c.accessory === 1 && t !== "xs") {
    const sw = t === "sm" ? 1.9 : 1.3;
    f.push(`<g fill="#fff" fill-opacity=".16" stroke="#2A2433" stroke-width="${sw}"><rect x="39.4" y="45.4" width="9.2" height="7.3" rx="3.3"/><rect x="51.4" y="45.4" width="9.2" height="7.3" rx="3.3"/></g><path d="M48.6 48.4Q50 47.2 51.4 48.4M39.4 48L35 47M60.6 48L65 47" fill="none" stroke="#2A2433" stroke-width="${sw}" stroke-linecap="round"/>`);
  }
  const faceSvg = f.join("");

  /* ---- hand layer: lg only, hidden until the profile wave */
  const handSvg = big
    ? `<g transform="translate(74 68) scale(1.3) translate(-73.5 -74)">` +
      `<path fill="${url("cl")}" d="M69 108L65.5 85C66.5 80.5 76 79.5 79 82.5L85 106Z"/>` +
      `<g fill="${url("sk")}"><ellipse cx="70" cy="66.8" rx="2" ry="3.7"/><ellipse cx="73.6" cy="65.8" rx="2" ry="3.9"/><ellipse cx="77.1" cy="67" rx="2" ry="3.6"/>` +
      `<ellipse cx="67.4" cy="75" rx="2.3" ry="3.8" transform="rotate(-38 67.4 75)"/><ellipse cx="73.5" cy="74" rx="6.4" ry="7.1"/></g></g>`
    : "";

  return { viewBox: VIEWBOX[t], disc: discSvg, body: bodySvg, face: faceSvg, hand: handSvg };
}
