"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { useWorkspace } from "@/lib/workspace-context";
import {
  GOOGLE_DRIVE_CONSENTED_AREAS,
  GOOGLE_DRIVE_CONSENTED_ITEMS,
  getWorkspaceDatastoreBucket,
  ROLE_BUCKET_VIEWS,
  GoogleDriveConsentedArea,
  GoogleDriveConsentedItem,
  WorkspaceImmutableFile,
  RoleGuardedFile,
} from "@/lib/datastore";
import {
  DriveAuthSession,
  getStoredDriveSession,
  fetchLiveDriveFiles,
  mapRealDriveFileToConsentedItem,
} from "@/lib/google-drive";
import { GoogleDriveConsentModal } from "@/components/GoogleDriveConsentModal";
import { formatDigest } from "@/lib/api";
import { DocumentStatusBadge } from "@/components/DocumentStatusBadge";
import { FindingsModal } from "@/components/FindingsModal";
import { DemoDocumentRecord } from "@/lib/types";
import {
  HardDrive,
  Cloud,
  Lock,
  Folder,
  FolderCheck,
  CheckCircle2,
  ShieldCheck,
  FileText,
  FileSpreadsheet,
  Copy,
  RefreshCw,
  Search,
  Layers,
  Eye,
  ArrowRight,
  Database,
  Check,
  List,
  LayoutGrid,
  MoreVertical,
  ChevronRight,
  X,
  SlidersHorizontal,
} from "lucide-react";

export default function DocumentsPage() {
  const { selectedWorkspace } = useWorkspace();

  // View modes: list or grid (mimicking Google Drive UI)
  const [driveViewMode, setDriveViewMode] = useState<"list" | "grid">("list");
  const [bucketViewMode, setBucketViewMode] = useState<"list" | "grid">("list");

  // Selection states
  const [selectedDriveItemId, setSelectedDriveItemId] = useState<string | null>(null);
  const [selectedBucketFileId, setSelectedBucketFileId] = useState<string | null>(null);

  // Active role tab for bottom section
  const [activeRoleTab, setActiveRoleTab] = useState<
    "Developer" | "Designer" | "Partner" | "Marketing"
  >("Developer");

  // Modals
  const [selectedDoc, setSelectedDoc] = useState<DemoDocumentRecord | null>(null);
  const [selectedGuardedDiff, setSelectedGuardedDiff] = useState<RoleGuardedFile | null>(null);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);

  // Live Google Drive OAuth Session & State
  const [driveSession, setDriveSession] = useState<DriveAuthSession | null>(null);
  const [consentedItems, setConsentedItems] = useState<GoogleDriveConsentedItem[]>(
    GOOGLE_DRIVE_CONSENTED_ITEMS
  );
  const [consentedAreas, setConsentedAreas] = useState<GoogleDriveConsentedArea[]>(
    GOOGLE_DRIVE_CONSENTED_AREAS
  );

  // Search & Filter state for Google Drive
  const [driveFolderFilter, setDriveFolderFilter] = useState<string>("all");
  const [driveSearch, setDriveSearch] = useState<string>("");
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Search state for Cloud Store Bucket
  const [bucketFolderFilter, setBucketFolderFilter] = useState<string>("all");
  const [bucketSearch, setBucketSearch] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredDriveSession();
    if (stored) {
      setDriveSession(stored);
    }
  }, []);

  // Read the workspace's Cloud Store Bucket from Firebase Datastore
  const workspaceBucket = useMemo(() => {
    return getWorkspaceDatastoreBucket(selectedWorkspace.id);
  }, [selectedWorkspace.id]);

  // Current Role Bucket View data
  const currentRoleBucket = ROLE_BUCKET_VIEWS[activeRoleTab];

  // Filtered Drive items
  const filteredDriveItems = useMemo(() => {
    return consentedItems.filter((item) => {
      const matchesFolder =
        driveFolderFilter === "all" ||
        item.folderPath.toLowerCase().includes(driveFolderFilter.toLowerCase());
      const matchesQuery =
        !driveSearch.trim() ||
        item.name.toLowerCase().includes(driveSearch.toLowerCase()) ||
        item.folderPath.toLowerCase().includes(driveSearch.toLowerCase());
      return matchesFolder && matchesQuery;
    });
  }, [consentedItems, driveFolderFilter, driveSearch]);

  // Filtered Workspace Bucket items
  const filteredBucketFiles = useMemo(() => {
    return workspaceBucket.files.filter((file) => {
      const matchesFolder =
        bucketFolderFilter === "all" ||
        file.path.toLowerCase().includes(bucketFolderFilter.toLowerCase());
      const matchesQuery =
        !bucketSearch.trim() ||
        file.filename.toLowerCase().includes(bucketSearch.toLowerCase()) ||
        file.path.toLowerCase().includes(bucketSearch.toLowerCase()) ||
        file.sourceSha256.toLowerCase().includes(bucketSearch.toLowerCase());
      return matchesFolder && matchesQuery;
    });
  }, [workspaceBucket, bucketFolderFilter, bucketSearch]);

  const selectedDriveItem = useMemo(() => {
    return consentedItems.find((i) => i.id === selectedDriveItemId) || null;
  }, [consentedItems, selectedDriveItemId]);

  const selectedBucketFile = useMemo(() => {
    return workspaceBucket.files.find((f) => f.id === selectedBucketFileId) || null;
  }, [workspaceBucket, selectedBucketFileId]);

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleSyncDrive = async () => {
    setIsSyncingDrive(true);
    setSyncFeedback(null);

    // If live Google Drive session exists, fetch live files from Google Drive API
    if (driveSession?.accessToken) {
      try {
        const liveFiles = await fetchLiveDriveFiles(driveSession.accessToken);
        const folderMap = new Map<string, string>();
        consentedAreas.forEach((a) => folderMap.set(a.id.replace("gdrive-", ""), a.name));
        const updated = liveFiles.map((f) => mapRealDriveFileToConsentedItem(f, folderMap));
        if (updated.length > 0) {
          setConsentedItems(updated);
        }
        setSyncFeedback(
          `Live Drive sync successful. Ingested ${liveFiles.length} files from ${
            driveSession.userEmail || "Google Drive"
          }.`
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Sync error";
        setSyncFeedback(`Google Drive sync notice: ${msg}`);
      } finally {
        setIsSyncingDrive(false);
        setTimeout(() => setSyncFeedback(null), 5000);
      }
      return;
    }

    // Default simulation fallback
    setTimeout(() => {
      setIsSyncingDrive(false);
      setSyncFeedback(
        "Sync complete. 5 consented items verified with WORM bucket. Click 'Manage Consented Areas' to connect your live Google account."
      );
      setTimeout(() => setSyncFeedback(null), 5000);
    }, 1200);
  };

  // Helper for Google Drive-style file type icons
  const renderDriveFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return (
          <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200/80 text-red-600 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      case "docx":
      case "doc":
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      case "csv":
      case "xlsx":
      case "sheet":
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
    }
  };

  // Canonical roles matching AppShell
  const ROLE_TABS = [
    {
      id: "Developer" as const,
      label: "Developer",
      colorDot: "bg-[#10b981]",
      count: ROLE_BUCKET_VIEWS.Developer.totalGuardedFiles,
    },
    {
      id: "Designer" as const,
      label: "Designer",
      colorDot: "bg-[#f59e0b]",
      count: ROLE_BUCKET_VIEWS.Designer.totalGuardedFiles,
    },
    {
      id: "Partner" as const,
      label: "Partner",
      colorDot: "bg-[#ec4899]",
      count: ROLE_BUCKET_VIEWS.Partner.totalGuardedFiles,
    },
    {
      id: "Marketing" as const,
      label: "Marketing",
      colorDot: "bg-[#3b82f6]",
      count: ROLE_BUCKET_VIEWS.Marketing.totalGuardedFiles,
    },
  ];

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  Files &amp; Storage Buckets
                </h1>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200">
                  Tri-Partition Storage Architecture
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 max-w-3xl leading-relaxed">
                Separates raw consented ingest from the immutable cryptographic archive and synthesized
                role-guarded cloud bucket views. RedactCore enforces byte-intact provenance across every boundary.
              </p>
            </div>

            {/* Workspace & Datastore Context Indicator */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs shadow-2xs">
                <Database className="w-3.5 h-3.5 text-zinc-700" />
                <span className="text-gray-500">Datastore Workspace:</span>
                <span className="font-semibold text-gray-900 font-mono">
                  {selectedWorkspace.name}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSyncDrive}
                disabled={isSyncingDrive}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDrive ? "animate-spin" : ""}`} />
                <span>{isSyncingDrive ? "Syncing..." : "Sync Drive Ingest"}</span>
              </button>
            </div>
          </div>

          {syncFeedback && (
            <div className="p-3 bg-zinc-900 text-white text-xs rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{syncFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncFeedback(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TOP SECTION: Split into Two Columns (Top Left: Google Drive, Top Right: Cloud Store Bucket) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* ========================================================================= */}
            {/* TOP LEFT: Google Drive (Mimicking Google Drive File Listing UI)           */}
            {/* ========================================================================= */}
            <div className="bg-white border border-gray-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[620px]">
              {/* Drive Top Bar with Search & View Controls */}
              <div className="p-4 border-b border-gray-200/80 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center flex-shrink-0">
                      <HardDrive className="w-4 h-4 text-zinc-800" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <span>Google Drive</span>
                        {driveSession ? (
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>OAuth Granted</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                            Consented Areas
                          </span>
                        )}
                      </h2>
                      <div className="text-[10px] text-gray-500 truncate max-w-[220px]">
                        {driveSession?.userEmail || "compliance-officer@argus.enterprise"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Permission Request Trigger */}
                    <button
                      type="button"
                      onClick={() => setIsConsentModalOpen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-zinc-900 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                    >
                      <FolderCheck className="w-3.5 h-3.5 text-zinc-700" />
                      <span>{driveSession ? "Manage Consented Areas" : "Grant Drive Permission"}</span>
                    </button>

                    {/* List / Grid View Switcher (Google Drive style) */}
                    <div className="flex items-center border border-gray-200 bg-white rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setDriveViewMode("list")}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          driveViewMode === "list"
                            ? "bg-zinc-100 text-zinc-900 font-semibold"
                            : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                        }`}
                        title="List layout"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDriveViewMode("grid")}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          driveViewMode === "grid"
                            ? "bg-zinc-100 text-zinc-900 font-semibold"
                            : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                        }`}
                        title="Grid layout"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Google Drive Pill Search Bar */}
                <div className="relative">
                  <div className="w-full flex items-center bg-zinc-100/90 hover:bg-zinc-100 border border-zinc-200/80 rounded-full px-3.5 py-1.5 transition-colors focus-within:ring-2 focus-within:ring-zinc-900 focus-within:bg-white">
                    <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mr-2" />
                    <input
                      type="text"
                      placeholder="Search in Google Drive consented files..."
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      className="w-full text-xs bg-transparent border-0 text-gray-900 placeholder-gray-400 focus:outline-hidden"
                    />
                    {driveSearch && (
                      <button
                        type="button"
                        onClick={() => setDriveSearch("")}
                        className="text-gray-400 hover:text-gray-700 ml-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Google Drive Breadcrumbs Bar */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium">
                  <span className="text-gray-400">My Drive</span>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400">Consented Areas</span>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setDriveFolderFilter("all")}
                    className={`font-semibold cursor-pointer hover:underline ${
                      driveFolderFilter === "all" ? "text-zinc-900" : "text-gray-500"
                    }`}
                  >
                    {driveFolderFilter === "all" ? "All Consented" : driveFolderFilter}
                  </button>
                </div>
              </div>

              {/* Google Drive Folders Row (Horizontal rounded chips) */}
              <div className="px-4 py-2.5 bg-gray-50/40 border-b border-gray-100 flex items-center gap-2 overflow-x-auto text-xs">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Folders:
                </span>
                {consentedAreas.map((folder) => {
                  const isSelected = driveFolderFilter === folder.name.split(" ")[0];
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() =>
                        setDriveFolderFilter(isSelected ? "all" : folder.name.split(" ")[0])
                      }
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs whitespace-nowrap cursor-pointer transition-all ${
                        isSelected
                          ? "bg-zinc-900 text-white border-zinc-900 shadow-2xs"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <Folder className={`w-3.5 h-3.5 ${isSelected ? "text-zinc-300" : "text-zinc-500"}`} />
                      <span className="font-medium">{folder.name}</span>
                      <span
                        className={`text-[10px] font-mono px-1 rounded ${
                          isSelected ? "bg-zinc-800 text-zinc-300" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {folder.fileCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Google Drive File Listing Area */}
              <div className="flex-1 overflow-y-auto">
                {filteredDriveItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                    <div>No files found in selected Google Drive area.</div>
                    <button
                      type="button"
                      onClick={() => setIsConsentModalOpen(true)}
                      className="px-3 py-1.5 text-xs text-zinc-900 font-medium bg-zinc-100 hover:bg-zinc-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <FolderCheck className="w-3.5 h-3.5" />
                      <span>Select Folders to Ingest</span>
                    </button>
                  </div>
                ) : driveViewMode === "list" ? (
                  /* Google Drive LIST VIEW */
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200/80 text-[11px] font-medium text-gray-500 bg-gray-50/30 sticky top-0 z-10 backdrop-blur-xs">
                        <th className="py-2 px-4 font-medium">Name</th>
                        <th className="py-2 px-3 font-medium hidden sm:table-cell">Owner</th>
                        <th className="py-2 px-3 font-medium hidden md:table-cell">Last modified</th>
                        <th className="py-2 px-3 font-medium">File size</th>
                        <th className="py-2 px-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredDriveItems.map((item) => {
                        const isSelected = selectedDriveItemId === item.id;
                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedDriveItemId(item.id)}
                            className={`transition-colors cursor-pointer group ${
                              isSelected
                                ? "bg-zinc-100/90 font-medium text-zinc-900"
                                : "hover:bg-gray-50/80 text-gray-700"
                            }`}
                          >
                            {/* File Name & Icon */}
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {renderDriveFileIcon(item.fileType)}
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-900 truncate">
                                    {item.name}
                                  </div>
                                  <div className="text-[10px] text-gray-400 truncate">
                                    {item.folderPath}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Owner */}
                            <td className="py-2.5 px-3 hidden sm:table-cell">
                              <div className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                                <div className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-800 text-[10px] font-bold flex items-center justify-center">
                                  me
                                </div>
                                <span>compliance</span>
                              </div>
                            </td>

                            {/* Last modified */}
                            <td className="py-2.5 px-3 text-[11px] text-gray-500 hidden md:table-cell whitespace-nowrap">
                              {item.lastModified}
                            </td>

                            {/* File size */}
                            <td className="py-2.5 px-3 text-[11px] text-gray-500 whitespace-nowrap font-mono">
                              {item.size}
                            </td>

                            {/* Actions / Inspect */}
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.demoDocRef && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDoc(item.demoDocRef || null);
                                    }}
                                    className="px-2 py-1 text-[11px] font-medium border border-gray-200 bg-white hover:bg-gray-100 rounded-md text-gray-700 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    Inspect
                                  </button>
                                )}
                                <span className="p-1 text-gray-400 hover:text-gray-700 rounded-md">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  /* Google Drive GRID VIEW (Card View) */
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredDriveItems.map((item) => {
                      const isSelected = selectedDriveItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedDriveItemId(item.id)}
                          className={`border rounded-xl p-3.5 transition-all cursor-pointer flex flex-col justify-between h-40 ${
                            isSelected
                              ? "bg-zinc-50 border-zinc-900 shadow-2xs ring-1 ring-zinc-900"
                              : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs"
                          }`}
                        >
                          {/* Card Top: Icon & Filename & Kebab */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {renderDriveFileIcon(item.fileType)}
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-gray-900 truncate">
                                  {item.name}
                                </div>
                                <div className="text-[10px] text-gray-400 truncate">
                                  {item.folderPath}
                                </div>
                              </div>
                            </div>
                            <MoreVertical className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          </div>

                          {/* Card Middle: Simulated Document Canvas */}
                          <div className="my-2 p-2 bg-gray-50/80 rounded-lg border border-gray-100 flex flex-col justify-center space-y-1">
                            <div className="h-1.5 bg-gray-200 rounded-full w-4/5" />
                            <div className="h-1.5 bg-gray-200 rounded-full w-2/3" />
                            <div className="h-1.5 bg-gray-200 rounded-full w-1/2" />
                          </div>

                          {/* Card Bottom: Metadata & Action */}
                          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                            <span className="font-mono text-[10px]">{item.size}</span>
                            {item.demoDocRef && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDoc(item.demoDocRef || null);
                                }}
                                className="text-zinc-900 hover:underline font-medium text-[11px] cursor-pointer"
                              >
                                Inspect Findings
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Drive Contextual Status Bar */}
              <div className="p-3 bg-gray-50 border-t border-gray-200/80 text-[11px] text-gray-600 flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">
                    {selectedDriveItem
                      ? `Selected: ${selectedDriveItem.name} (${selectedDriveItem.size})`
                      : `${filteredDriveItems.length} consented items available for WORM ingest`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConsentModalOpen(true)}
                  className="font-mono text-[10px] text-zinc-900 font-semibold hover:underline flex-shrink-0 cursor-pointer"
                >
                  drive.readonly.selected
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* TOP RIGHT: Cloud Store Bucket (Mimicking Google Drive File Listing UI)     */}
            {/* ========================================================================= */}
            <div className="bg-white border border-gray-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[620px]">
              {/* Bucket Top Bar with Search & View Controls */}
              <div className="p-4 border-b border-gray-200/80 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <Cloud className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <span>Cloud Store Bucket</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-white font-medium flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Original Immutable</span>
                        </span>
                      </h2>
                      <div className="text-[10px] text-gray-500 font-mono truncate">
                        Datastore: {workspaceBucket.datastoreDocPath}
                      </div>
                    </div>
                  </div>

                  {/* List / Grid View Switcher */}
                  <div className="flex items-center border border-gray-200 bg-white rounded-lg p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setBucketViewMode("list")}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        bucketViewMode === "list"
                          ? "bg-zinc-100 text-zinc-900 font-semibold"
                          : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                      title="List layout"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBucketViewMode("grid")}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        bucketViewMode === "grid"
                          ? "bg-zinc-100 text-zinc-900 font-semibold"
                          : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                      title="Grid layout"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Google Drive-style Pill Search Bar */}
                <div className="relative">
                  <div className="w-full flex items-center bg-zinc-100/90 hover:bg-zinc-100 border border-zinc-200/80 rounded-full px-3.5 py-1.5 transition-colors focus-within:ring-2 focus-within:ring-zinc-900 focus-within:bg-white">
                    <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mr-2" />
                    <input
                      type="text"
                      placeholder="Search bucket objects, path, or SHA-256..."
                      value={bucketSearch}
                      onChange={(e) => setBucketSearch(e.target.value)}
                      className="w-full text-xs bg-transparent border-0 text-gray-900 placeholder-gray-400 focus:outline-hidden font-mono"
                    />
                    {bucketSearch && (
                      <button
                        type="button"
                        onClick={() => setBucketSearch("")}
                        className="text-gray-400 hover:text-gray-700 ml-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cloud Store Bucket Breadcrumbs Bar */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium">
                  <span className="text-gray-400 font-mono">gs://</span>
                  <span className="font-mono text-zinc-900 font-bold truncate max-w-[180px]">
                    {workspaceBucket.bucketName}
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400 font-mono">raw</span>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setBucketFolderFilter("all")}
                    className={`font-semibold cursor-pointer hover:underline font-mono ${
                      bucketFolderFilter === "all" ? "text-zinc-900" : "text-gray-500"
                    }`}
                  >
                    {bucketFolderFilter === "all" ? "2026/10" : bucketFolderFilter}
                  </button>
                </div>
              </div>

              {/* Bucket Storage Metadata & Folders Row */}
              <div className="px-4 py-2 bg-gray-50/40 border-b border-gray-100 flex items-center justify-between text-xs overflow-x-auto gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Folders:
                  </span>
                  <button
                    type="button"
                    onClick={() => setBucketFolderFilter(bucketFolderFilter === "raw" ? "all" : "raw")}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                      bucketFolderFilter === "raw"
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Folder className="w-3 h-3 text-zinc-500" />
                    <span className="font-mono text-[11px]">raw/2026/10</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(workspaceBucket.bucketUri, "bucket_uri")}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-white border border-gray-200 text-zinc-700 hover:bg-gray-50 cursor-pointer"
                  >
                    {copiedKey === "bucket_uri" ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                    <span>Copy Bucket URI</span>
                  </button>
                </div>
              </div>

              {/* Cloud Store Bucket File Listing */}
              <div className="flex-1 overflow-y-auto">
                {filteredBucketFiles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    No immutable objects found in this Cloud Store bucket.
                  </div>
                ) : bucketViewMode === "list" ? (
                  /* Cloud Store Bucket LIST VIEW */
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200/80 text-[11px] font-medium text-gray-500 bg-gray-50/30 sticky top-0 z-10 backdrop-blur-xs">
                        <th className="py-2 px-4 font-medium">Object Name</th>
                        <th className="py-2 px-3 font-medium hidden sm:table-cell">SHA-256 Digest</th>
                        <th className="py-2 px-3 font-medium hidden md:table-cell">Ingested</th>
                        <th className="py-2 px-3 font-medium">Size</th>
                        <th className="py-2 px-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredBucketFiles.map((file) => {
                        const isSelected = selectedBucketFileId === file.id;
                        return (
                          <tr
                            key={file.id}
                            onClick={() => setSelectedBucketFileId(file.id)}
                            className={`transition-colors cursor-pointer group ${
                              isSelected
                                ? "bg-zinc-100/90 font-medium text-zinc-900"
                                : "hover:bg-gray-50/80 text-gray-700"
                            }`}
                          >
                            {/* Object Name & Icon */}
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative">
                                  {renderDriveFileIcon(file.fileType)}
                                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-zinc-900 text-white flex items-center justify-center">
                                    <Lock className="w-2 h-2 text-white" />
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-900 truncate">
                                    {file.filename}
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-mono truncate">
                                    {file.path}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* SHA-256 Digest */}
                            <td className="py-2.5 px-3 hidden sm:table-cell">
                              <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-700">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded font-semibold truncate max-w-[120px]">
                                  {formatDigest(file.sourceSha256, 6, 4)}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(file.sourceSha256, file.id);
                                  }}
                                  className="text-gray-400 hover:text-zinc-900 p-0.5 cursor-pointer"
                                  title="Copy full SHA-256"
                                >
                                  {copiedKey === file.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Ingestion Timestamp */}
                            <td className="py-2.5 px-3 text-[11px] text-gray-500 hidden md:table-cell whitespace-nowrap">
                              {file.uploadedAt}
                            </td>

                            {/* File Size */}
                            <td className="py-2.5 px-3 text-[11px] text-gray-500 whitespace-nowrap font-mono">
                              {file.size}
                            </td>

                            {/* Actions / Inspect */}
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDoc(file.demoDocRef);
                                  }}
                                  className="px-2 py-1 text-[11px] font-medium border border-gray-200 bg-white hover:bg-gray-100 rounded-md text-gray-700 transition-colors cursor-pointer shadow-2xs"
                                >
                                  Inspect Findings
                                </button>
                                <span className="p-1 text-gray-400 hover:text-gray-700 rounded-md">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  /* Cloud Store Bucket GRID VIEW */
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredBucketFiles.map((file) => {
                      const isSelected = selectedBucketFileId === file.id;
                      return (
                        <div
                          key={file.id}
                          onClick={() => setSelectedBucketFileId(file.id)}
                          className={`border rounded-xl p-3.5 transition-all cursor-pointer flex flex-col justify-between h-40 ${
                            isSelected
                              ? "bg-zinc-50 border-zinc-900 shadow-2xs ring-1 ring-zinc-900"
                              : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs"
                          }`}
                        >
                          {/* Card Top: Icon & Key & Lock */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="relative">
                                {renderDriveFileIcon(file.fileType)}
                                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-zinc-900 text-white flex items-center justify-center">
                                  <Lock className="w-2 h-2 text-white" />
                                </span>
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-gray-900 truncate">
                                  {file.filename}
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono truncate">
                                  {file.path}
                                </div>
                              </div>
                            </div>
                            <MoreVertical className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          </div>

                          {/* Card Middle: Digest Pill & Lock Badge */}
                          <div className="my-2 p-2 bg-gray-50/80 rounded-lg border border-gray-100 flex items-center justify-between text-[10px] font-mono text-gray-600">
                            <span className="truncate">SHA: {formatDigest(file.sourceSha256, 8, 4)}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-900 text-white font-sans uppercase">
                              WORM
                            </span>
                          </div>

                          {/* Card Bottom: Metadata & Action */}
                          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                            <span className="font-mono text-[10px]">{file.size}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDoc(file.demoDocRef);
                              }}
                              className="text-zinc-900 hover:underline font-medium text-[11px] cursor-pointer"
                            >
                              Inspect Findings
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bucket Contextual Status Bar */}
              <div className="p-3 bg-gray-50 border-t border-gray-200/80 text-[11px] text-gray-600 flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <Lock className="w-3.5 h-3.5 text-zinc-900 flex-shrink-0" />
                  <span className="truncate">
                    {selectedBucketFile
                      ? `Selected: ${selectedBucketFile.filename} (${selectedBucketFile.size}) · WORM Locked`
                      : `WORM Retention Enforced · KMS AES-256-GCM · ${workspaceBucket.storageClass}`}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-emerald-700 font-medium flex-shrink-0">
                  Datastore Synchronized
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BOTTOM SECTION: Multi-Tab View taken from Roles listing                   */}
          {/* ========================================================================= */}
          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden">
            {/* Section Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 bg-gray-50/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-zinc-800" />
                    <h2 className="text-base font-bold text-gray-900 tracking-tight">
                      Role-Based Cloud Bucket Views
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                    RedactCore synthesizes dedicated role Cloud Store buckets from the original immutable files.
                    Each tab reveals the role-specific guarded storage bucket, applied boundary policy, and cryptographic verification status.
                  </p>
                </div>

                <div className="text-xs font-mono px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Zero-Leakage Attestation: Active</span>
                </div>
              </div>

              {/* Multi-Tab Bar: Taken from Roles Listing (Developer, Designer, Partner, Marketing) */}
              <div className="mt-5 border-b border-gray-200 flex items-center gap-2 overflow-x-auto">
                {ROLE_TABS.map((tab) => {
                  const isActive = activeRoleTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveRoleTab(tab.id)}
                      className={`pb-3 px-3.5 text-xs font-medium flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "border-zinc-900 text-zinc-900 font-semibold"
                          : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${tab.colorDot}`} />
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-zinc-900 text-white font-bold"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Role Cloud Bucket Content */}
            <div className="p-5 sm:p-6 space-y-6">
              {/* Role Bucket Header & Boundary Policy Context */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-500">Role Bucket URI:</span>
                      <code className="text-xs font-mono font-bold text-zinc-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                        {currentRoleBucket.bucketUri}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(currentRoleBucket.bucketUri, "role_bucket_uri")}
                        className="text-gray-400 hover:text-zinc-900 cursor-pointer"
                        title="Copy role bucket URI"
                      >
                        {copiedKey === "role_bucket_uri" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                      <span className="font-medium text-gray-700">Enforcing Policy:</span>
                      <span className="font-semibold text-zinc-900">{currentRoleBucket.policyName}</span>
                      <span className="font-mono text-[11px] text-gray-400">({currentRoleBucket.boundPolicyId})</span>
                      <Link
                        href="/policies"
                        className="text-[11px] text-zinc-900 hover:underline font-medium inline-flex items-center gap-0.5"
                      >
                        <span>View Policy Rules</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Summary Metric Pills */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <div className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
                      <div className="text-[10px] text-gray-400">Entities Transformed</div>
                      <div className="font-bold text-gray-900 font-mono">
                        {currentRoleBucket.entitiesRedactedCount} Redacted
                      </div>
                    </div>

                    <div className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
                      <div className="text-[10px] text-gray-400">Attestation</div>
                      <div className="font-bold text-emerald-700 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>ZERO LEAKAGE</span>
                      </div>
                    </div>

                    <div className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
                      <div className="text-[10px] text-gray-400">Recompiled</div>
                      <div className="font-medium text-gray-700 font-mono">
                        {currentRoleBucket.lastRecompiled}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/80 text-xs text-gray-600 flex items-center justify-between">
                  <span className="italic">{currentRoleBucket.transformSummary}</span>
                  <span className="text-[11px] text-gray-500 font-mono hidden sm:inline-block">
                    {currentRoleBucket.isolationGuarantee}
                  </span>
                </div>
              </div>

              {/* Guarded Files Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Synthesized Role Objects in {currentRoleBucket.bucketUri}
                  </h3>
                  <span className="text-xs text-gray-500">
                    Showing {currentRoleBucket.guardedFiles.length} guarded artifacts
                  </span>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {currentRoleBucket.guardedFiles.map((gf) => (
                    <div
                      key={gf.id}
                      className="p-4 hover:bg-gray-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 truncate">
                            {gf.filename}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                            VERIFIED ZERO LEAKAGE
                          </span>
                        </div>

                        <div className="font-mono text-[11px] text-gray-500 truncate">
                          Object Path: {gf.guardedKey}
                        </div>

                        {/* Provenance: Original Hash vs Guarded Hash */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                          <div className="flex items-center gap-1.5 text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-200/60 truncate">
                            <span className="text-gray-400 font-medium">Raw Source:</span>
                            <span className="text-zinc-800 font-semibold truncate">
                              {formatDigest(gf.originalSha256, 8, 6)}
                            </span>
                            <span>({gf.originalSize})</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-200/60 truncate">
                            <span className="text-emerald-700 font-medium">Role Guarded:</span>
                            <span className="text-zinc-900 font-bold truncate">
                              {formatDigest(gf.guardedSha256, 8, 6)}
                            </span>
                            <span>({gf.guardedSize})</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-zinc-700 pt-0.5">
                          <span className="font-semibold">Applied Protection:</span>{" "}
                          <span>{gf.appliedAction}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => setSelectedGuardedDiff(gf)}
                          className="px-3 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Role Diff View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedDoc(gf.demoDocRef)}
                          className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Inspect Findings
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Google Drive OAuth Consent & Consented Areas Modal */}
        <GoogleDriveConsentModal
          isOpen={isConsentModalOpen}
          onClose={() => setIsConsentModalOpen(false)}
          onConsentUpdated={(items, areas, newSession) => {
            setDriveSession(newSession);
            if (items.length > 0) {
              setConsentedItems(items);
            }
            if (areas.length > 0) {
              setConsentedAreas(areas);
            }
            if (newSession) {
              setSyncFeedback(
                `Google Drive connected: ${newSession.userEmail || "Authorized"}. Ingested ${
                  items.length
                } files from your consented folders.`
              );
              setTimeout(() => setSyncFeedback(null), 5000);
            }
          }}
        />

        {/* Existing RedactCore Entity Findings Modal */}
        <FindingsModal document={selectedDoc} onClose={() => setSelectedDoc(null)} />

        {/* Role Diff Modal */}
        {selectedGuardedDiff && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl shadow-xl overflow-hidden font-sans">
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-start justify-between bg-white">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-zinc-800" />
                    <h3 className="text-sm font-bold text-gray-900">
                      Role Guarded View Diff: {selectedGuardedDiff.filename}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Comparison between Raw Immutable Bucket and Role Cloud Bucket under policy{" "}
                    <code className="text-zinc-800 font-mono font-semibold">
                      {currentRoleBucket.boundPolicyId}
                    </code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGuardedDiff(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                {/* Cryptographic Hash Comparison Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div>
                    <div className="text-[10px] text-gray-400 font-semibold uppercase">
                      Original Immutable Version
                    </div>
                    <div className="font-mono text-zinc-900 font-bold mt-1 text-[11px] break-all">
                      {selectedGuardedDiff.originalSha256}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Bucket: {workspaceBucket.bucketUri}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-emerald-700 font-semibold uppercase">
                      Guarded Role Version ({activeRoleTab})
                    </div>
                    <div className="font-mono text-zinc-900 font-bold mt-1 text-[11px] break-all">
                      {selectedGuardedDiff.guardedSha256}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Bucket: {currentRoleBucket.bucketUri}
                    </div>
                  </div>
                </div>

                {/* Transformations Applied */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-900">Enforced Transform Actions</h4>
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-zinc-900">
                        {selectedGuardedDiff.redactionMetrics}
                      </span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      {selectedGuardedDiff.appliedAction}
                    </p>
                  </div>
                </div>

                {/* Safety Guarantee */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Cryptographic Zero-Leakage Guarantee</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    RedactCore verified this role view against regular expression scans and presidio entity checks.
                    Zero unauthorized tokens or plaintexts were detected in the compiled output.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDoc(selectedGuardedDiff.demoDocRef);
                    setSelectedGuardedDiff(null);
                  }}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-gray-800 transition-colors cursor-pointer"
                >
                  Inspect RedactCore Findings
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedGuardedDiff(null)}
                  className="px-4 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Close Diff View
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
