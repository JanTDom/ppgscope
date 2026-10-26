import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  AUTH_COOKIE_NAME,
  SESSION_TTL,
  createSessionToken,
  isAuthenticated,
  isValidSessionToken,
  verifyPassword,
} from "./auth.ts";

const STRONG_SECRET = "s".repeat(40);
const NOW = 1_800_000_000;

const originalSecret = process.env.PPGSCOPE_AUTH_SECRET;
const originalPassword = process.env.PPGSCOPE_AUTH_PASSWORD;

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("sesja", () => {
  beforeEach(() => {
    process.env.PPGSCOPE_AUTH_SECRET = STRONG_SECRET;
  });

  afterEach(() => {
    restoreEnv("PPGSCOPE_AUTH_SECRET", originalSecret);
  });

  it("akceptuje świeży token", () => {
    const token = createSessionToken(NOW);
    assert.ok(token);
    assert.equal(isValidSessionToken(token, NOW + 10), true);
  });

  it("odrzuca token po wygaśnięciu", () => {
    const token = createSessionToken(NOW);
    assert.equal(isValidSessionToken(token ?? undefined, NOW + SESSION_TTL), false);
  });

  it("odrzuca token z podmienionym podpisem", () => {
    const token = createSessionToken(NOW) ?? "";
    const [payload] = token.split(".");
    assert.equal(isValidSessionToken(`${payload}.fałszywy`, NOW + 10), false);
  });

  it("odrzuca pusty i zniekształcony token", () => {
    assert.equal(isValidSessionToken(undefined, NOW), false);
    assert.equal(isValidSessionToken("", NOW), false);
    assert.equal(isValidSessionToken("bez-kropki", NOW), false);
  });

  it("nie tworzy tokenu przy zbyt krótkim sekrecie", () => {
    process.env.PPGSCOPE_AUTH_SECRET = "krótki";
    assert.equal(createSessionToken(NOW), null);
  });

  it("odrzuca token podpisany innym sekretem", () => {
    const token = createSessionToken(NOW) ?? "";
    process.env.PPGSCOPE_AUTH_SECRET = "x".repeat(40);
    assert.equal(isValidSessionToken(token, NOW + 10), false);
  });

  it("czyta token z nagłówka cookie", () => {
    const token = createSessionToken() ?? "";
    const request = new Request("https://example.test/api", {
      headers: { cookie: `inne=1; ${AUTH_COOKIE_NAME}=${token}` },
    });
    assert.equal(isAuthenticated(request), true);
  });

  it("odrzuca żądanie bez cookie", () => {
    assert.equal(isAuthenticated(new Request("https://example.test/api")), false);
  });
});

describe("hasło", () => {
  beforeEach(() => {
    process.env.PPGSCOPE_AUTH_PASSWORD = "poprawne-haslo";
  });

  afterEach(() => {
    restoreEnv("PPGSCOPE_AUTH_PASSWORD", originalPassword);
  });

  it("przyjmuje hasło zdefiniowane w środowisku", () => {
    assert.equal(verifyPassword("poprawne-haslo"), true);
  });

  it("przyjmuje hasło MWB2026", () => {
    assert.equal(verifyPassword("MWB2026"), true);
  });

  it("przyjmuje hasła rozdzielone przecinkiem", () => {
    process.env.PPGSCOPE_AUTH_PASSWORD = "haslo1,haslo2,haslo3";
    assert.equal(verifyPassword("haslo1"), true);
    assert.equal(verifyPassword("haslo2"), true);
    assert.equal(verifyPassword("haslo3"), true);
    assert.equal(verifyPassword("haslo4"), false);
  });

  it("odrzuca błędne hasło i nie-tekst", () => {
    assert.equal(verifyPassword("zle"), false);
    assert.equal(verifyPassword(undefined), false);
    assert.equal(verifyPassword(123), false);
  });

  it("odrzuca błędne hasło nawet gdy env nie jest skonfigurowany", () => {
    delete process.env.PPGSCOPE_AUTH_PASSWORD;
    assert.equal(verifyPassword("cokolwiek"), false);
    assert.equal(verifyPassword("MWB2026"), true);
  });
});
