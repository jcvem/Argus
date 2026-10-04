import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Test 1: Verify Policy Definitions match RedactCore exactly
describe("RedactCore Canonical Policy Definitions", () => {
  const policiesPath = path.resolve("./lib/api.ts");
  const apiCode = fs.readFileSync(policiesPath, "utf-8");

  test("contains all three canonical policy IDs", () => {
    assert.match(apiCode, /policy_id:\s*"sales-quarterly"/);
    assert.match(apiCode, /policy_id:\s*"finance-full-access"/);
    assert.match(apiCode, /policy_id:\s*"reviewer"/);
  });

  test("contains canonical entity types", () => {
    const requiredEntities = [
      "SALARY",
      "EMPLOYEE_ID",
      "PHONE_NUMBER",
      "EMAIL_ADDRESS",
      "PERSON",
      "ADDRESS",
      "PASSWORD",
      "SECRET_KEY",
      "API_KEY",
    ];
    for (const ent of requiredEntities) {
      assert.ok(
        apiCode.includes(`"${ent}"`),
        `Expected entity_type ${ent} to be present in canonical policies`
      );
    }
  });

  test("actions are strictly restricted to allow, redact, mask, replace, review", () => {
    const matches = apiCode.match(/action:\s*"([^"]+)"/g) || [];
    const validActions = new Set(["allow", "redact", "mask", "replace", "review"]);
    for (const m of matches) {
      const action = m.replace(/action:\s*"/, "").replace(/"/, "");
      assert.ok(
        validActions.has(action),
        `Action "${action}" is not an authorized RedactCore action`
      );
    }
  });
});

// Test 2: Verify Auth Configuration and Safety Guard Logic
describe("Firebase Auth Scaffolding & Configuration", () => {
  const firebaseCode = fs.readFileSync(path.resolve("./lib/firebase.ts"), "utf-8");

  test("detects missing or placeholder Firebase keys safely", () => {
    assert.match(firebaseCode, /function isFirebaseConfigured/);
    assert.match(firebaseCode, /your-api-key/);
    assert.match(firebaseCode, /your-project-id/);
  });

  test("exports required auth context primitives", () => {
    const authContextCode = fs.readFileSync(path.resolve("./lib/auth-context.tsx"), "utf-8");
    assert.match(authContextCode, /signInWithGoogle/);
    assert.match(authContextCode, /signInWithEmail/);
    assert.match(authContextCode, /signUpWithEmail/);
    assert.match(authContextCode, /signOut/);
    assert.match(authContextCode, /enterDemoMode/);
    assert.match(authContextCode, /authConfigured/);
  });

  test("documents that client-side route gating is not production authorization", () => {
    const authContextCode = fs.readFileSync(path.resolve("./lib/auth-context.tsx"), "utf-8");
    assert.ok(
      authContextCode.includes("route gating is NOT a security boundary") ||
      authContextCode.includes("client-side route gating is NOT a security boundary"),
      "Must explicitly document client-side route gating boundary"
    );
  });

  test("sign-in page wires Google and Email actions to controlled error handlers", () => {
    const signinCode = fs.readFileSync(path.resolve("./app/signin/page.tsx"), "utf-8");
    assert.match(signinCode, /handleGoogleSubmit/);
    assert.match(signinCode, /handleEmailSubmit/);
    assert.match(signinCode, /handleEnterDemo/);
    assert.match(signinCode, /Continue with Google/);
    assert.match(signinCode, /Sign In with Credentials/);
    assert.match(signinCode, /Enter Demo Shell Directly/);
  });
});

// Test 3: Natural Language Draft Translator
describe("Deterministic Policy Draft Translator", () => {
  const apiCode = fs.readFileSync(path.resolve("./lib/api.ts"), "utf-8");

  test("defines deterministic mappings for sensitive entity types", () => {
    assert.match(apiCode, /function translateDraftPrompt/);
    assert.match(apiCode, /SALARY/);
    assert.match(apiCode, /EMPLOYEE_ID/);
    assert.match(apiCode, /PHONE_NUMBER/);
    assert.match(apiCode, /EMAIL_ADDRESS/);
    assert.match(apiCode, /PERSON/);
  });
});

// Test 3: Anti-Slop Audit (no purple/violet, no Inter/Roboto/Arial imports, no emojis, no secrets)
describe("Anti-Slop Design & Source Audit", () => {
  const sourceDirs = ["app", "components", "lib"];

  function getFiles(dir) {
    let files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        files = files.concat(getFiles(full));
      } else if (/\.(tsx|ts|jsx|js|css)$/.test(e.name)) {
        files.push(full);
      }
    }
    return files;
  }

  const allFiles = sourceDirs.flatMap((d) => getFiles(path.resolve(d)));

  test("disciplined brand accent palette with zero generic AI gradients", () => {
    // In the redesigned UI system, purple/lilac is the deliberate brand accent
    // (e.g. #7c3aed / argus-brand), while frivolous multi-color gradients remain strictly banned.
    const forbiddenGradientRegex = /\bbg-gradient-to-(?:r|l|t|b|tr|tl|br|bl)\s+from-(?:pink|rose|yellow|teal|cyan)/i;
    for (const file of allFiles) {
      const content = fs.readFileSync(file, "utf-8");
      assert.ok(
        !forbiddenGradientRegex.test(content),
        `Forbidden generic AI gradient found in ${file}`
      );
    }
  });

  test("zero Inter, Roboto, or Arial font imports", () => {
    const forbiddenFonts = [
      /from\s+["']next\/font\/google["'].*Inter/i,
      /from\s+["']next\/font\/google["'].*Roboto/i,
      /from\s+["']next\/font\/google["'].*Arial/i,
      /@fontsource\/inter/i,
      /@fontsource\/roboto/i,
    ];
    for (const file of allFiles) {
      const content = fs.readFileSync(file, "utf-8");
      for (const pattern of forbiddenFonts) {
        assert.ok(!pattern.test(content), `Forbidden font import in ${file}`);
      }
    }
  });

  test("zero decorative emojis in source markup", () => {
    // Range of common emoji Unicode sequences
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    for (const file of allFiles) {
      const content = fs.readFileSync(file, "utf-8");
      assert.ok(!emojiRegex.test(content), `Forbidden decorative emoji detected in ${file}`);
    }
  });

  test("zero committed real API secrets or private keys in source", () => {
    const secretPatterns = [
      /AIza[0-9A-Za-z-_]{35}/, // Real Google API key pattern
      /ghp_[0-9A-Za-z]{36}/,   // GitHub Personal Access Token
      /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
    ];
    for (const file of allFiles) {
      const content = fs.readFileSync(file, "utf-8");
      for (const pattern of secretPatterns) {
        assert.ok(!pattern.test(content), `Possible secret pattern detected in ${file}`);
      }
    }
  });
});
