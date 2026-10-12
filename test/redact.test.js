import assert from "node:assert/strict";
import { test } from "node:test";
import { containsSensitive, redact } from "../src/redact.js";

// Fake values only; built with concatenation so secret scanners don't flag them.
const SAMPLES = {
  githubToken: "ghp_" + "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8",
  githubPat: "github_pat_" + "11ABCDEFG0abcdefghijkl_mnopqrstuvwxyz0123456789",
  openaiKey: "sk-" + "proj-abcdefghijklmnop1234",
  googleKey: "AIza" + "SyA1234567890abcdefghijklmnopqrstu",
  awsKey: "AKIA" + "ABCDEFGHIJKLMNOP",
  jwt: "eyJhbGciOiJIUzI1NiJ9." + "eyJzdWIiOiIxMjM0NTY3ODkwIn0." + "abc123def456",
  telegramToken: "123456789:" + "AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw",
  email: "aditya@example.com",
  url: "https://internal.company.dev/dashboard",
  ip: "10.0.12.34:8080",
  phone: "+91 98765 43210",
  hex: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b",
};

for (const [name, value] of Object.entries(SAMPLES)) {
  test(`redacts ${name}`, () => {
    const out = redact(`note: ${value} done`);
    assert.ok(!out.includes(value), out);
    assert.ok(out.includes("[redacted]"));
    assert.ok(containsSensitive(value));
  });
}

test("leaves normal dev notes alone", () => {
  const note = "Fixed a race condition in the Node.js worker, upgraded React to v19 and wrote 12 tests.";
  assert.equal(redact(note), note);
  assert.equal(containsSensitive(note), false);
});

test("containsSensitive is reusable (global regex state does not leak)", () => {
  assert.ok(containsSensitive(SAMPLES.email));
  assert.ok(containsSensitive(SAMPLES.email));
});
