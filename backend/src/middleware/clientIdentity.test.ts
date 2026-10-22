import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { clientIpKey, emailKey, maskEmail, maskIpKey, normalizeEmail } from "./clientIdentity.js";

describe("clientIpKey", () => {
  test("keeps IPv4 and unwraps IPv4-mapped IPv6", () => {
    assert.equal(clientIpKey("203.0.113.7"), "203.0.113.7");
    assert.equal(clientIpKey("::ffff:203.0.113.7"), "203.0.113.7");
    assert.equal(clientIpKey("::FFFF:198.51.100.1"), "198.51.100.1");
  });

  test("reduces IPv6 to its /64 prefix, however it is written", () => {
    const key = "2001:0db8:0001:0002::/64";
    assert.equal(clientIpKey("2001:db8:1:2::1"), key);
    assert.equal(clientIpKey("2001:db8:1:2:ffff:ffff:ffff:ffff"), key);
    assert.equal(clientIpKey("2001:0DB8:0001:0002:0000:0000:0000:0042"), key);
    assert.equal(clientIpKey("2001:db8:1:2::abcd%eth0"), key, "zone id ignored");
    assert.notEqual(clientIpKey("2001:db8:1:3::1"), key, "a different /64");
    assert.equal(clientIpKey("::1"), "0000:0000:0000:0000::/64");
    assert.equal(clientIpKey("64:ff9b::192.0.2.33"), "0064:ff9b:0000:0000::/64", "embedded IPv4");
  });

  test("anything else becomes one 'unknown' key", () => {
    assert.equal(clientIpKey(undefined), "unknown");
    assert.equal(clientIpKey("not-an-ip"), "unknown");
  });
});

describe("email helpers", () => {
  test("normalize by trimming and lowercasing; non-strings become empty", () => {
    assert.equal(normalizeEmail("  Ann.Lee+Work@Example.COM "), "ann.lee+work@example.com");
    assert.equal(normalizeEmail(42), "");
    assert.equal(normalizeEmail(undefined), "");
  });

  test("keys are stable hashes, so raw emails are never stored", () => {
    assert.equal(emailKey("a@example.com"), emailKey("a@example.com"));
    assert.notEqual(emailKey("a@example.com"), emailKey("b@example.com"));
    assert.ok(!emailKey("a@example.com").includes("example"));
  });

  test("masks never contain the full address or IP", () => {
    assert.equal(maskEmail("jordan@example.com"), "j***@e***.com");
    assert.equal(maskEmail("broken"), "***");
    assert.equal(maskIpKey("203.0.113.7"), "203.0.113.x");
    assert.equal(maskIpKey("2001:0db8:0001:0002::/64"), "2001:0db8:0001:0002::/64");
  });
});
