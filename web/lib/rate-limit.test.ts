import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clientKey, createRateLimiter } from "./rate-limit.ts";

describe("limiter prób", () => {
  it("przepuszcza do limitu i blokuje po nim", () => {
    const limiter = createRateLimiter({ maxAttempts: 3, windowMs: 60_000 });
    assert.equal(limiter.hit("a", 0).allowed, true);
    assert.equal(limiter.hit("a", 1).allowed, true);
    assert.equal(limiter.hit("a", 2).allowed, true);
    const blocked = limiter.hit("a", 3);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSeconds, 60);
  });

  it("liczy klientów osobno", () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowMs: 60_000 });
    assert.equal(limiter.hit("a", 0).allowed, true);
    assert.equal(limiter.hit("b", 0).allowed, true);
    assert.equal(limiter.hit("a", 1).allowed, false);
  });

  it("odblokowuje po upływie okna", () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowMs: 1000 });
    limiter.hit("a", 0);
    assert.equal(limiter.hit("a", 500).allowed, false);
    assert.equal(limiter.hit("a", 1000).allowed, true);
  });

  it("reset czyści licznik", () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowMs: 60_000 });
    limiter.hit("a", 0);
    limiter.reset("a");
    assert.equal(limiter.hit("a", 1).allowed, true);
  });
});

describe("clientKey", () => {
  it("bierze pierwszy adres z x-forwarded-for", () => {
    const request = new Request("https://x.test", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    assert.equal(clientKey(request), "1.2.3.4");
  });

  it("zwraca wartość zastępczą bez nagłówków", () => {
    assert.equal(clientKey(new Request("https://x.test")), "nieznany");
  });
});
