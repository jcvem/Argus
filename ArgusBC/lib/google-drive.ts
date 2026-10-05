/**
 * Google Drive OAuth 2.0 Integration & REST API Client
 * Requests explicit user consent for Google Drive read scopes and ingests consented folder files.
 */

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";
import { GoogleDriveConsentedArea, GoogleDriveConsentedItem } from "./datastore";

export const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
export const DRIVE_METADATA_SCOPE = "https://www.googleapis.com/auth/drive.metadata.readonly";

export interface RealDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
  webViewLink?: string;
  iconLink?: string;
  owners?: Array<{ displayName?: string; emailAddress?: string }>;
}

export interface RealDriveFolder {
  id: string;
  name: string;
  modifiedTime?: string;
  parents?: string[];
}

export interface DriveAuthSession {
  accessToken: string;
  userEmail?: string;
  userName?: string;
  grantedScopes: string[];
  expiresAt: number;
}

const STORAGE_KEY_TOKEN = "argus_gdrive_auth_session";
const STORAGE_KEY_CONSENTED_FOLDERS = "argus_gdrive_consented_folder_ids";
const STORAGE_KEY_CUSTOM_ITEMS = "argus_gdrive_custom_consented_items";

/**
 * Saves active Google Drive OAuth session to sessionStorage
 */
export function saveDriveSession(session: DriveAuthSession): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY_TOKEN, JSON.stringify(session));
  } catch (err) {
    console.warn("Failed to persist Drive session:", err);
  }
}

/**
 * Retrieves cached Google Drive OAuth session if still valid
 */
export function getStoredDriveSession(): DriveAuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_TOKEN);
    if (!raw) return null;
    const parsed: DriveAuthSession = JSON.parse(raw);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(STORAGE_KEY_TOKEN);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clears stored Google Drive OAuth session
 */
export function clearDriveSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
  } catch {
    // Ignore
  }
}

/**
 * Requests Google Drive permission using Firebase Auth GoogleAuthProvider
 * with incremental scope https://www.googleapis.com/auth/drive.readonly
 */
export async function requestGoogleDriveOAuthConsent(): Promise<DriveAuthSession> {
  const auth = getFirebaseAuth();
  if (!isFirebaseConfigured() || !auth) {
    throw new Error(
      "Firebase is not configured in .env.local. Please configure NEXT_PUBLIC_FIREBASE_* credentials to request Google Drive permissions."
    );
  }

  const provider = new GoogleAuthProvider();
  provider.addScope(DRIVE_READONLY_SCOPE);
  provider.setCustomParameters({
    prompt: "consent",
    access_type: "offline",
    include_granted_scopes: "true",
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error(
        "No Google OAuth access token was returned. Ensure Google Sign-In is enabled in Firebase Console with Google Drive API enabled."
      );
    }

    const session: DriveAuthSession = {
      accessToken,
      userEmail: result.user.email || undefined,
      userName: result.user.displayName || undefined,
      grantedScopes: [DRIVE_READONLY_SCOPE],
      // Access tokens typically expire in 3600 seconds
      expiresAt: Date.now() + 3500 * 1000,
    };

    saveDriveSession(session);
    return session;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Google Drive consent request failed";
    console.error("[Argus Google Drive OAuth]", errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Calls Google Drive REST API v3 to list all folders in user's Drive
 */
export async function fetchLiveDriveFolders(accessToken: string): Promise<RealDriveFolder[]> {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const fields = encodeURIComponent("files(id, name, modifiedTime, parents)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=50&orderBy=name`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return (data.files || []) as RealDriveFolder[];
}

/**
 * Calls Google Drive REST API v3 to list files in user's Drive,
 * optionally filtered by parent folder IDs.
 */
export async function fetchLiveDriveFiles(
  accessToken: string,
  folderIds?: string[]
): Promise<RealDriveFile[]> {
  let queryStr = "mimeType != 'application/vnd.google-apps.folder' and trashed = false";

  if (folderIds && folderIds.length > 0) {
    const parentsCondition = folderIds.map((id) => `'${id}' in parents`).join(" or ");
    queryStr += ` and (${parentsCondition})`;
  }

  const query = encodeURIComponent(queryStr);
  const fields = encodeURIComponent(
    "files(id, name, mimeType, size, modifiedTime, parents, webViewLink, iconLink, owners)"
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=100&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return (data.files || []) as RealDriveFile[];
}

/**
 * Formats byte size into human readable string
 */
export function formatByteSize(bytesStr?: string | number): string {
  if (!bytesStr) return "Google Doc";
  const bytes = typeof bytesStr === "string" ? parseInt(bytesStr, 10) : bytesStr;
  if (isNaN(bytes) || bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Converts a Google Drive file to an Argus GoogleDriveConsentedItem
 */
export function mapRealDriveFileToConsentedItem(
  file: RealDriveFile,
  folderMap: Map<string, string>
): GoogleDriveConsentedItem {
  let ext: "pdf" | "docx" | "csv" | "xlsx" = "pdf";
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".docx") || lowerName.endsWith(".doc") || file.mimeType.includes("word")) {
    ext = "docx";
  } else if (
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".xlsx") ||
    file.mimeType.includes("spreadsheet")
  ) {
    ext = "csv";
  } else if (lowerName.endsWith(".pdf") || file.mimeType.includes("pdf")) {
    ext = "pdf";
  }

  const parentId = file.parents && file.parents[0];
  const folderName = (parentId && folderMap.get(parentId)) || "Root / Consented Drive";

  // Deterministic mock SHA-256 for live drive file display until uploaded to RedactCore
  const simpleHash = Array.from(file.id + file.name)
    .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0)
    .toString(16)
    .padStart(8, "0");
  const simulatedSha = `${simpleHash}8f12a001bb904128f4410aa6712398bb1eec4098aa908b1a233614be7`;

  return {
    id: `gdrive-live-${file.id}`,
    name: file.name,
    folderPath: `/${folderName}`,
    fileType: ext,
    size: formatByteSize(file.size),
    lastModified: file.modifiedTime
      ? new Date(file.modifiedTime).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Recent",
    consentScope: "Explicit Enclave Consent Granted",
    enclaveSyncStatus: "synced",
    driveFileId: file.id,
    sourceSha256: simulatedSha,
    targetCloudPath: `raw/consented/${file.name}`,
  };
}

/**
 * Storage helpers for consented folder selections
 */
export function getSavedConsentedFolderIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONSENTED_FOLDERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveConsentedFolderIds(folderIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_CONSENTED_FOLDERS, JSON.stringify(folderIds));
  } catch {
    // Ignore
  }
}
