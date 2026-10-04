# Argus Control Plane UI (ArgusBC)

Deterministic, privacy-preserving control-plane UI for **Argus RedactCore**, built with Next.js App Router, TypeScript, Tailwind CSS, Lucide Icons, and Google Firebase Authentication scaffolding.

---

## 1. Quick Start

### Prerequisites
- Node.js >= 18.17 (tested on Node v24.1.0)
- npm >= 9.0

### Installation
```bash
# In /Users/jc/Code/Argus/ArgusBC
npm install
```

### Running Locally (Demo Shell Mode)
The application runs out-of-the-box without requiring Firebase credentials. When Firebase environment variables are omitted, it operates in an unauthenticated **Demo Shell** mode with honest fixture data and policy inspection.

```bash
# Start Next.js development server (default port 3000, or choose 3040 if 3000 is occupied)
npm run dev
# or
npx next dev -p 3040
```
Open [http://localhost:3040](http://localhost:3040) in your browser.

---

## 2. Verification Commands

The codebase enforces strict type safety, zero ESLint warnings, and a deterministic smoke test suite checking policy fidelity and anti-slop rules:

```bash
# Run deterministic smoke tests (policy contracts, auth detection, anti-slop rules)
npm test

# Run strict TypeScript typecheck
npm run typecheck

# Run ESLint validation
npm run lint

# Production build
npm run build
```

---

## 3. Google Firebase Authentication Setup

### Current Status: `CODE-READY (SCAFFOLDED)`
The client SDK integration is fully wired in `lib/firebase.ts` and `lib/auth-context.tsx` with support for Google Sign-In, Email/Password sign-in, and Demo Shell bypass. However, live cloud authentication requires real Firebase credentials.

### `NEED_GCP_ACTION` — Manual Console Steps Required
To connect live Firebase Authentication, complete these steps in the Google Cloud / Firebase Console:

1. **Create or Open Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/).
   - Click **Add Project** or select an existing Google Cloud project associated with Argus.

2. **Register Web Application**:
   - In Project Settings, navigate to **Your Apps** and click the **Web** icon (`</>`).
   - Register the application name (e.g. `argus-control-plane`).
   - Copy the `firebaseConfig` object values.

3. **Enable Authentication Providers**:
   - In the Firebase sidebar, navigate to **Build > Authentication**.
   - Click **Get Started**.
   - Under the **Sign-in method** tab:
     - Enable **Google**: configure the public-facing project name and support email.
     - Enable **Email/Password**: turn on the Email/Password switch.

4. **Configure Local Environment**:
   - Copy `.env.example` to `.env.local`:
     ```bash
     cp .env.example .env.local
     ```
   - Populate `.env.local` with your real keys:
     ```env
     NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=argus-project.firebaseapp.com
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=argus-project
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=argus-project.appspot.com
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
     NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
     ```
   - Restart the dev server. The top status bar will automatically transition from `Demo Shell // Auth Unconfigured` to `Firebase Configured`.

> **SECURITY NOTE ON ROUTE GATING:**
> Client-side route gating (`<ProtectedRoute>`) improves UX by directing unauthenticated visitors to `/signin`. However, client-side route gating is **not** a production security boundary. Authoritative access control is enforced at the RedactCore API and Cerberus gateway levels.

---

## 4. Key Routes & Capabilities

| Route | Surface | Purpose & Data State |
| :--- | :--- | :--- |
| `/signin` | Authentication Gateway | Google Sign-In, email/password form, explicit configuration status indicator, and single-click demo shell entry. |
| `/dashboard` | Operations Dashboard | Live RedactCore health (`GET /health`), ephemeral storage notices, operational telemetry, and safe recent documents ledger. |
| `/policies` | Policy Studio | Canonical matrix for all 3 shipped RedactCore policies (`sales-quarterly`, `finance-full-access`, `reviewer`), action legend, and non-persisted natural-language draft translator. |
| `/documents` | Document Ingest | Multipart upload boundary for `POST /api/upload`, structural counts, and zero-PII safe findings modal. |
| `/views/new` | View Generator | Parameter selection flow (document, policy, subject) with live transformation plan preview. |
| `/sandbox` | Agent Sandbox | AI/LLM retrieval simulator verifying that agents receive only verified derivatives with zero raw PII leakage. |

---

## 5. Assumptions & Next RedactCore API Integration Steps

1. **FastAPI Backend Connection**:
   - RedactCore exposes its API at `RedactCore/src/redact_core/api.py`.
   - By default, `NEXT_PUBLIC_REDACTCORE_API_URL` points to `http://localhost:8000`.
   - Start the backend via `uv run uvicorn redact_core.api:app --port 8000`.
   - `ArgusBC` automatically checks `/health` and switches from local emulation to live backend status.

2. **Module Architecture Boundaries**:
   - **RedactCore**: Authoritative for document parsing, entity detection, redaction planning, binary transformation, leak verification, and audit manifests.
   - **Aristotle** (Future): Formal policy consistency verification and counterexample detection before policy edits can be saved.
   - **Medusa** (Future): Change-impact simulation across document repositories and access review workflows.
   - **Cerberus** (Future): Runtime MCP and AI gateway interception with authenticated enterprise PBAC identity.
