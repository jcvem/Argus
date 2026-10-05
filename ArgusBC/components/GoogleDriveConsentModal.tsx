"use client";

import React, { useState, useEffect } from "react";
import {
  DriveAuthSession,
  RealDriveFolder,
  requestGoogleDriveOAuthConsent,
  fetchLiveDriveFolders,
  fetchLiveDriveFiles,
  mapRealDriveFileToConsentedItem,
  saveDriveSession,
  getStoredDriveSession,
  clearDriveSession,
  getSavedConsentedFolderIds,
  saveConsentedFolderIds,
} from "@/lib/google-drive";
import { GoogleDriveConsentedArea, GoogleDriveConsentedItem } from "@/lib/datastore";
import {
  HardDrive,
  Folder,
  FolderCheck,
  CheckCircle2,
  ShieldCheck,
  Lock,
  X,
  RefreshCw,
  ExternalLink,
  Key,
  AlertCircle,
  Check,
} from "lucide-react";

interface GoogleDriveConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentUpdated: (
    items: GoogleDriveConsentedItem[],
    areas: GoogleDriveConsentedArea[],
    session: DriveAuthSession | null
  ) => void;
}

export function GoogleDriveConsentModal({
  isOpen,
  onClose,
  onConsentUpdated,
}: GoogleDriveConsentModalProps) {
  const [session, setSession] = useState<DriveAuthSession | null>(null);
  const [folders, setFolders] = useState<RealDriveFolder[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualTokenInput, setManualTokenInput] = useState<string>("");
  const [showManualToken, setShowManualToken] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const existing = getStoredDriveSession();
    if (existing) {
      setSession(existing);
      loadFolders(existing.accessToken);
    }
  }, [isOpen]);

  const loadFolders = async (token: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const folderList = await fetchLiveDriveFolders(token);
      setFolders(folderList);

      const savedIds = getSavedConsentedFolderIds();
      if (savedIds.length > 0) {
        setSelectedFolderIds(new Set(savedIds));
      } else {
        // By default select up to first 3 folders
        setSelectedFolderIds(new Set(folderList.slice(0, 3).map((f) => f.id)));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load Google Drive folders";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectWithGoogle = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const authSession = await requestGoogleDriveOAuthConsent();
      setSession(authSession);
      await loadFolders(authSession.accessToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google Drive consent request failed";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTokenInput.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    const customSession: DriveAuthSession = {
      accessToken: manualTokenInput.trim(),
      userEmail: "authorized-drive-user@argus",
      userName: "Google Drive User",
      grantedScopes: ["https://www.googleapis.com/auth/drive.readonly"],
      expiresAt: Date.now() + 3600 * 1000,
    };

    try {
      await loadFolders(customSession.accessToken);
      saveDriveSession(customSession);
      setSession(customSession);
      setShowManualToken(false);
      setManualTokenInput("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to validate Google Drive access token";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    const updated = new Set(selectedFolderIds);
    if (updated.has(folderId)) {
      updated.delete(folderId);
    } else {
      updated.add(folderId);
    }
    setSelectedFolderIds(updated);
  };

  const handleSelectAll = () => {
    if (selectedFolderIds.size === folders.length) {
      setSelectedFolderIds(new Set());
    } else {
      setSelectedFolderIds(new Set(folders.map((f) => f.id)));
    }
  };

  const handleConfirmConsent = async () => {
    if (!session) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const chosenFolderIds = Array.from(selectedFolderIds);
      saveConsentedFolderIds(chosenFolderIds);

      // Create folder map for name lookups
      const folderMap = new Map<string, string>();
      folders.forEach((f) => folderMap.set(f.id, f.name));

      // Fetch real live files from Google Drive for the consented folders
      const liveFiles = await fetchLiveDriveFiles(
        session.accessToken,
        chosenFolderIds.length > 0 ? chosenFolderIds : undefined
      );

      // Map to Argus Consented Items
      const consentedItems: GoogleDriveConsentedItem[] = liveFiles.map((f) =>
        mapRealDriveFileToConsentedItem(f, folderMap)
      );

      // Map chosen folders to Consented Areas
      const chosenFolders = folders.filter((f) => selectedFolderIds.has(f.id));
      const consentedAreas: GoogleDriveConsentedArea[] = chosenFolders.map((f) => ({
        id: `gdrive-${f.id}`,
        name: f.name,
        path: `/Google Drive/${f.name}`,
        fileCount: consentedItems.filter((i) => i.folderPath.includes(f.name)).length || 1,
        grantScope: "drive.readonly.selected",
        lastSyncTime: "Just now",
      }));

      onConsentUpdated(consentedItems, consentedAreas, session);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to ingest consented files from Drive";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = () => {
    clearDriveSession();
    setSession(null);
    setFolders([]);
    setSelectedFolderIds(new Set());
    onConsentUpdated([], [], null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-elevated overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-start justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 flex-shrink-0">
              <HardDrive className="w-5 h-5 text-zinc-800" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>Google Drive Consented Areas</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
                  OAuth 2.0 Consent
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Explicitly authorize read-only access to specific folders in your Google Drive.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Permission explanation banner */}
          <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1.5 text-zinc-800">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Principle of Least Privilege (Enclave Scope)</span>
            </div>
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Argus uses scope <code className="font-mono text-zinc-900 bg-zinc-200/70 px-1 py-0.5 rounded">https://www.googleapis.com/auth/drive.readonly</code>.
              Only files within your checked consented folders are indexed into RedactCore.
              Files outside checked folders are cryptographically excluded.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-[11px] leading-relaxed break-words flex-1">
                <span>{errorMessage}</span>
                <div className="mt-1 text-red-700">
                  Tip: If Firebase Popup is restricted on localhost, use the &ldquo;Direct Access Token&rdquo; option below.
                </div>
              </div>
            </div>
          )}

          {!session ? (
            /* Unconnected State: Request OAuth */
            <div className="space-y-4 py-4 text-center">
              <div className="max-w-md mx-auto space-y-2">
                <h4 className="text-sm font-bold text-gray-900">
                  Connect Your Google Drive
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Click below to open the standard Google OAuth authorization window and grant read-only consent to your Drive.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleConnectWithGoogle}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  <span>{isLoading ? "Opening Google Consent..." : "Connect with Google"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowManualToken(!showManualToken)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-gray-500" />
                  <span>Provide Access Token</span>
                </button>
              </div>

              {showManualToken && (
                <form
                  onSubmit={handleManualTokenSubmit}
                  className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-left space-y-3 mt-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Manual Google OAuth Token</span>
                    <a
                      href="https://developers.google.com/oauthplayground"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-zinc-900 hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>OAuth Playground</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Paste an active Google OAuth token with scope <code className="font-mono text-zinc-800">drive.readonly</code>:
                  </p>
                  <input
                    type="password"
                    placeholder="ya29.a0..."
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 font-mono focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      disabled={isLoading || !manualTokenInput.trim()}
                      className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Authenticate Token
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Connected State: Choose Consented Folders */
            <div className="space-y-4">
              {/* Account Status Card */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                    {session.userEmail ? session.userEmail[0].toUpperCase() : "G"}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{session.userName || "Google User"}</div>
                    <div className="text-[11px] text-gray-500 font-mono">{session.userEmail}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                    OAuth Active
                  </span>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-[11px] text-red-600 hover:underline cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Folder Selection Header */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h4 className="font-bold text-gray-900">Select Consented Folders</h4>
                  <p className="text-[11px] text-gray-500">
                    Files in selected folders will be ingested into the Google Drive Consented Areas view.
                  </p>
                </div>

                {folders.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] text-zinc-900 hover:underline font-medium cursor-pointer"
                  >
                    {selectedFolderIds.size === folders.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>

              {/* Folder List */}
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-56 overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-zinc-700" />
                    <span>Querying Google Drive folders...</span>
                  </div>
                ) : folders.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    No folders found in this Google Drive account.
                  </div>
                ) : (
                  folders.map((folder) => {
                    const isChecked = selectedFolderIds.has(folder.id);
                    return (
                      <label
                        key={folder.id}
                        className={`p-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                          isChecked ? "bg-zinc-50/70" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleFolder(folder.id)}
                            className="rounded border-gray-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer w-4 h-4"
                          />
                          <div className="flex items-center gap-2">
                            <Folder className={`w-4 h-4 ${isChecked ? "text-zinc-900" : "text-zinc-500"}`} />
                            <span className={`font-medium ${isChecked ? "text-zinc-900" : "text-gray-700"}`}>
                              {folder.name}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-gray-400">
                          Folder ID: {folder.id.slice(0, 8)}...
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1">
                <span>
                  <strong>{selectedFolderIds.size}</strong> folders selected for Argus ingestion
                </span>
                <span className="text-zinc-700 font-mono text-[10px]">
                  drive.readonly.selected
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-gray-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {session && (
            <button
              type="button"
              onClick={handleConfirmConsent}
              disabled={isSaving || selectedFolderIds.size === 0}
              className="px-4 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? "animate-spin" : ""}`} />
              <span>{isSaving ? "Ingesting Live Drive Files..." : "Confirm Consented Areas"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
