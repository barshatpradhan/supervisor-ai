import crypto from "node:crypto";
import { isIPv4, isIPv6 } from "node:net";

/**
 * The rate-limit key for a client IP. IPv4 is used as is (including IPv4-mapped IPv6 such as
 * ::ffff:203.0.113.7); IPv6 is reduced to its /64 prefix, because one subscriber usually controls
 * a whole /64 and could otherwise rotate through billions of addresses.
 */
export function clientIpKey(ip: string | undefined) {
  const address = (ip ?? "").trim();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);
  if (mapped && isIPv4(mapped[1])) return mapped[1];
  if (isIPv4(address)) return address;
  if (isIPv6(address)) return `${expandIPv6(address).slice(0, 4).join(":")}::/64`;
  return "unknown";
}

/** Eight 4-digit lowercase hextets for a valid IPv6 address (zone ids and embedded IPv4 handled). */
function expandIPv6(address: string) {
  let value = address.toLowerCase().split("%")[0];
  const embedded = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(value);
  if (embedded) {
    const [a, b, c, d] = embedded[1].split(".").map(Number);
    value = value.slice(0, -embedded[1].length) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = value.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail !== undefined && tail !== "" ? tail.split(":") : [];
  const missing = value.includes("::") ? 8 - headParts.length - tailParts.length : 0;
  return [...headParts, ...Array<string>(missing).fill("0"), ...tailParts].map((part) => part.padStart(4, "0"));
}

/** Trimmed and lowercased; "" when the input is not a usable string. */
export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** Store key for an email, so raw addresses never sit in limiter memory. */
export function emailKey(normalizedEmail: string) {
  return crypto.createHash("sha256").update(normalizedEmail).digest("hex").slice(0, 32);
}

/** For logs: first letter of the local part and of the domain, plus the top-level domain. */
export function maskEmail(normalizedEmail: string) {
  const [local, domain] = normalizedEmail.split("@");
  if (!local || !domain) return "***";
  const dot = domain.lastIndexOf(".");
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${local[0]}***@${domain[0]}***${tld}`;
}

/** For logs: IPv4 with the last octet hidden; IPv6 keys are already a /64 prefix. */
export function maskIpKey(ipKey: string) {
  return isIPv4(ipKey) ? ipKey.replace(/\.\d+$/, ".x") : ipKey;
}
