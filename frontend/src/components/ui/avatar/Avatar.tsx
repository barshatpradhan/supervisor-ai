import { memo, useCallback, useId, useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  DISC_COLORS,
  PLACEHOLDER_GLYPH,
  describeAvatar,
  fallbackColorFor,
  initialsFor,
  parseAvatarId,
  renderDisc,
  renderLayers,
  tierFor,
} from "./avatar-core";

export type AvatarMotion = "none" | "hover" | "profile";
type AvatarStatus = "online" | "away" | "busy" | "offline";

export interface AvatarProps {
  /** Stored avatar ID, e.g. "p03-s4-c2-a1". Missing or invalid → initials fallback. */
  variant?: string | null;
  /**
   * Pixel size. The design sizes are 24 | 32 | 40 | 64 | 128, but any size works: the detail
   * tier comes from tierFor(size), so detail is simplified automatically at small sizes.
   */
  size?: number;
  /**
   * true (default) = static, animates on hover/focus (use in lists).
   * "profile" = idle float + blink, waves once on mount (profile page only).
   * false = fully static.
   */
  animated?: boolean | AvatarMotion;
  /** Display name: used for the label and for initials. */
  name?: string | null;
  /** Stable key for the fallback color (user ID). Defaults to name. */
  fallbackKey?: string | null;
  /** Override the accessible label. */
  label?: string;
  /** Set when the person's name is already visible next to the avatar. */
  decorative?: boolean;
  status?: AvatarStatus;
  /** White separator ring, for overlapping stacks. */
  ring?: boolean;
  className?: string;
}

/** Initials font size: the design values at the design sizes, about a third of the disc elsewhere. */
const INITIALS_PX: Record<number, number> = { 24: 10, 32: 12, 40: 14, 64: 22, 128: 44 };
const initialsPx = (size: number) => INITIALS_PX[size] ?? Math.max(9, Math.round(size * 0.36));
const STATUS_TEXT: Record<AvatarStatus, string> = {
  online: "online",
  away: "away",
  busy: "busy",
  offline: "offline",
};

let reducedMotionQuery: MediaQueryList | null = null;
const prefersReducedMotion = () => {
  if (typeof window === "undefined") return true;
  reducedMotionQuery ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  return reducedMotionQuery.matches;
};

function toMotion(animated: AvatarProps["animated"]): AvatarMotion {
  if (animated === undefined || animated === true) return "hover";
  if (animated === false) return "none";
  return animated;
}

export const Avatar = memo(function Avatar({
  variant,
  size = 40,
  animated = true,
  name,
  fallbackKey,
  label,
  decorative = false,
  status,
  ring = false,
  className = "",
}: AvatarProps) {
  // Gradient IDs must be unique per instance; useId output can contain characters url() dislikes.
  const uid = "av" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ref = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const config = useMemo(() => parseAvatarId(variant), [variant]);
  const tier = tierFor(size);
  const motion = toMotion(animated);

  const layers = useMemo(() => (config ? renderLayers(config, size, uid) : null), [config, size, uid]);
  const fallbackColor = useMemo(
    () => (config ? 0 : fallbackColorFor(fallbackKey ?? name ?? "")),
    [config, fallbackKey, name],
  );
  const fallbackDisc = useMemo(
    () => (config ? "" : renderDisc(fallbackColor, size, uid)),
    [config, fallbackColor, size, uid],
  );
  const initials = config ? "" : initialsFor(name, size <= 24 ? 1 : 2);

  const baseLabel =
    label ?? (name ? `${name}` : config ? describeAvatar(config) : "Unknown user");
  const fullLabel = status ? `${baseLabel}, ${STATUS_TEXT[status]}` : baseLabel;

  // Hover head-turn: write CSS vars directly, one rAF per frame, no re-renders.
  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLSpanElement>) => {
      if (motion === "none" || e.pointerType === "touch" || prefersReducedMotion()) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.style.setProperty("--av-x", x.toFixed(3));
        el.style.setProperty("--av-y", y.toFixed(3));
      });
    },
    [motion],
  );
  const onPointerLeave = useCallback(() => {
    cancelAnimationFrame(frame.current);
    ref.current?.style.removeProperty("--av-x");
    ref.current?.style.removeProperty("--av-y");
  }, []);

  const interactive = motion !== "none";

  return (
    <span
      ref={ref}
      className={`av ${className}`}
      style={{ width: size, height: size }}
      data-tier={tier}
      data-motion={motion}
      data-wave={motion === "profile" && layers ? "" : undefined}
      data-ring={ring ? "" : undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : fullLabel}
      aria-hidden={decorative || undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerLeave={interactive ? onPointerLeave : undefined}
    >
      <span className="av-clip">
        {layers ? (
          <>
            <svg className="av-layer" viewBox="0 0 100 100" aria-hidden="true" dangerouslySetInnerHTML={{ __html: layers.disc }} />
            <span className="av-tilt">
              <span className="av-float">
                <svg className="av-layer" viewBox={layers.viewBox} aria-hidden="true" dangerouslySetInnerHTML={{ __html: layers.body }} />
                <svg className="av-layer av-face" viewBox={layers.viewBox} aria-hidden="true" dangerouslySetInnerHTML={{ __html: layers.face }} />
              </span>
            </span>
            {layers.hand && (
              <svg className="av-layer av-hand" viewBox={layers.viewBox} aria-hidden="true" dangerouslySetInnerHTML={{ __html: layers.hand }} />
            )}
          </>
        ) : (
          <>
            <svg className="av-layer" viewBox="0 0 100 100" aria-hidden="true" dangerouslySetInnerHTML={{ __html: fallbackDisc }} />
            {initials ? (
              <span className="av-initials" style={{ color: DISC_COLORS[fallbackColor - 1].ink, fontSize: initialsPx(size) }} aria-hidden="true">
                {initials}
              </span>
            ) : (
              <svg className="av-layer" viewBox="0 0 100 100" aria-hidden="true" style={{ color: DISC_COLORS[fallbackColor - 1].ink }} dangerouslySetInnerHTML={{ __html: PLACEHOLDER_GLYPH }} />
            )}
          </>
        )}
      </span>
      {status && <span className="av-status" data-status={status} aria-hidden="true" />}
    </span>
  );
});
