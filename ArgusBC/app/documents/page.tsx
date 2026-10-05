"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { useWorkspace } from "@/lib/workspace-context";
import {
  GOOGLE_DRIVE_CONSENTED_AREAS,
  GOOGLE_DRIVE_CONSENTED_ITEMS,
  getWorkspaceDatastoreBucket,
  ROLE_BUCKET_VIEWS,
  GoogleDriveConsentedItem,
  WorkspaceImmutableFile,
  RoleGuardedFile,
} from "@/lib/datastore";
import { formatDigest } from "@/lib/api";
import { DocumentStatusBadge } from "@/components/DocumentStatusBadge";
import { FindingsModal } from "@/components/FindingsModal";
import { DemoDocumentRecord } from "@/lib/types";
import {
  HardDrive,
  Cloud,
  Lock,
  FolderCheck,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Copy,
  RefreshCw,
  Search,
  Layers,
  Eye,
  ArrowRight,
  Database,
  Check,
  ShieldAlert,
  SlidersHorizontal,
  X,
  Sparkles,
} from "lucide-react";

export default function DocumentsPage() {
  const { selectedWorkspace } = useWorkspace();

  // Active role tab for bottom section
  const [activeRoleTab, setActiveRoleTab] = useState<
    "Developer" | "Designer" | "Partner" | "Marketing"
  >("Developer");

  // Selection states for inspection modals
  const [selectedDoc, setSelectedDoc] = useState<DemoDocumentRecord | null>(null);
  const [selectedGuardedDiff, setSelectedGuardedDiff] = useState<RoleGuardedFile | null>(null);

  // Search & Filter state for Google Drive
  const [driveFolderFilter, setDriveFolderFilter] = useState<string>("all");
  const [driveSearch, setDriveSearch] = useState<string>("");
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Search state for Cloud Store Bucket
  const [bucketSearch, setBucketSearch] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Read the workspace's Cloud Store Bucket from Datastore
  const workspaceBucket = useMemo(() => {
    return getWorkspaceDatastoreBucket(selectedWorkspace.id);
  }, [selectedWorkspace.id]);

  // Current Role Bucket View data
  const currentRoleBucket = ROLE_BUCKET_VIEWS[activeRoleTab];

  // Filtered Drive items
  const filteredDriveItems = useMemo(() => {
    return GOOGLE_DRIVE_CONSENTED_ITEMS.filter((item) => {
      const matchesFolder =
        driveFolderFilter === "all" ||
        item.folderPath.toLowerCase().includes(driveFolderFilter.toLowerCase());
      const matchesQuery =
        !driveSearch.trim() ||
        item.name.toLowerCase().includes(driveSearch.toLowerCase()) ||
        item.folderPath.toLowerCase().includes(driveSearch.toLowerCase());
      return matchesFolder && matchesQuery;
    });
  }, [driveFolderFilter, driveSearch]);

  // Filtered Workspace Bucket items
  const filteredBucketFiles = useMemo(() => {
    return workspaceBucket.files.filter((file) => {
      if (!bucketSearch.trim()) return true;
      const q = bucketSearch.toLowerCase();
      return (
        file.filename.toLowerCase().includes(q) ||
        file.path.toLowerCase().includes(q) ||
        file.sourceSha256.toLowerCase().includes(q)
      );
    });
  }, [workspaceBucket, bucketSearch]);

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleSyncDrive = () => {
    setIsSyncingDrive(true);
    setSyncFeedback(null);
    setTimeout(() => {
      setIsSyncingDrive(false);
      setSyncFeedback("Sync complete. 5 consented items verified with WORM bucket.");
      setTimeout(() => setSyncFeedback(null), 4000);
    }, 1200);
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
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TOP SECTION: Split into Two Columns (Top Left: Google Drive, Top Right: Cloud Store Bucket) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* TOP LEFT: Google Drive (User Consented Areas) */}
            <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[560px]">
              {/* Card Header */}
              <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center flex-shrink-0">
                      <HardDrive className="w-5 h-5 text-zinc-800" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <span>Google Drive: Consented Areas</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                          OAuth Active
                        </span>
                      </h2>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        User-authorized corporate directories under scope <code className="text-zinc-700 font-semibold font-mono">drive.readonly.selected</code>
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-md hidden sm:inline-block">
                    4 Folders Consented
                  </span>
                </div>

                {/* Filter and Search Bar */}
                <div className="mt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search consented files..."
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>

                  <select
                    value={driveFolderFilter}
                    onChange={(e) => setDriveFolderFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 cursor-pointer"
                  >
                    <option value="all">All Folders (4)</option>
                    <option value="Operations">Operations &amp; Financials</option>
                    <option value="Engineering">Engineering &amp; Architecture</option>
                    <option value="Executive">Executive &amp; Governance</option>
                    <option value="Marketing">Marketing &amp; Campaigns</option>
                  </select>
                </div>
              </div>

              {/* Consented Folders Summary Chips */}
              <div className="px-4 py-2 bg-gray-50/30 border-b border-gray-100 flex items-center gap-2 overflow-x-auto text-[11px]">
                <span className="text-gray-400 font-medium whitespace-nowrap">Consented Scopes:</span>
                {GOOGLE_DRIVE_CONSENTED_AREAS.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() =>
                      setDriveFolderFilter(
                        driveFolderFilter === area.name.split(" ")[0]
                          ? "all"
                          : area.name.split(" ")[0]
                      )
                    }
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] whitespace-nowrap cursor-pointer transition-colors ${
                      driveFolderFilter.includes(area.name.split(" ")[0])
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <FolderCheck className="w-3 h-3 text-zinc-500" />
                    <span>{area.name}</span>
                    <span className="opacity-60 font-mono">({area.fileCount})</span>
                  </button>
                ))}
              </div>

              {/* Consented Files Table / List */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {filteredDriveItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    No files found matching current drive filter.
                  </div>
                ) : (
                  filteredDriveItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 hover:bg-gray-50/80 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText className="w-4 h-4 text-zinc-700" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-zinc-600">{item.folderPath}</span>
                            <span>&middot;</span>
                            <span>{item.size}</span>
                            <span>&middot;</span>
                            <span>{item.lastModified}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            item.enclaveSyncStatus === "synced"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {item.enclaveSyncStatus === "synced" ? "Synced to Vault" : "Pending Ingest"}
                        </span>

                        {item.demoDocRef && (
                          <button
                            type="button"
                            onClick={() => setSelectedDoc(item.demoDocRef || null)}
                            className="px-2.5 py-1 text-[11px] font-medium border border-gray-200 hover:bg-gray-100 rounded-md text-gray-700 transition-colors cursor-pointer"
                          >
                            Inspect
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Card Footer Boundary Notice */}
              <div className="p-3 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-700" />
                  <span>Enclave boundary enforced: Unconsented folders are cryptographically unindexed.</span>
                </span>
                <span className="font-mono text-[10px] text-gray-400">OAuth v2 Scope</span>
              </div>
            </div>

            {/* TOP RIGHT: Cloud Store Bucket (Original Immutable Version from Firebase Datastore) */}
            <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[560px]">
              {/* Card Header */}
              <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <Cloud className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <span>Cloud Store Bucket: Original Immutable Version</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-white font-medium flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>WORM Locked</span>
                        </span>
                      </h2>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <span>Read from Firebase Datastore:</span>
                        <code className="text-zinc-800 font-mono font-semibold bg-gray-100 px-1.5 py-0.5 rounded">
                          {workspaceBucket.datastoreDocPath}
                        </code>
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-zinc-700 bg-white border border-gray-200 px-2 py-1 rounded-md hidden sm:inline-block">
                    {workspaceBucket.totalFiles} Immutable Objects
                  </span>
                </div>

                {/* Bucket URI & Properties Panel */}
                <div className="mt-3.5 p-2.5 bg-white border border-gray-200 rounded-xl space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-gray-400 font-medium">Bucket URI:</span>
                      <span className="font-mono font-semibold text-zinc-900 truncate">
                        {workspaceBucket.bucketUri}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(workspaceBucket.bucketUri, "bucket_uri")}
                      className="p-1 text-gray-500 hover:text-zinc-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer flex-shrink-0"
                      title="Copy bucket URI"
                    >
                      {copiedKey === "bucket_uri" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                    <span className="truncate">KMS: {workspaceBucket.kmsKeyName}</span>
                    <span className="font-mono text-emerald-700 font-medium flex-shrink-0">
                      Datastore Synced ({workspaceBucket.lastSyncedAt})
                    </span>
                  </div>
                </div>

                {/* Bucket Search Bar */}
                <div className="mt-2.5 relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search immutable object keys or SHA-256..."
                    value={bucketSearch}
                    onChange={(e) => setBucketSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              {/* Bucket Objects List */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {filteredBucketFiles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    No objects found in this workspace bucket.
                  </div>
                ) : (
                  filteredBucketFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-3.5 hover:bg-gray-50/80 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Lock className="w-4 h-4 text-zinc-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 truncate">
                              {file.filename}
                            </span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                              {file.fileType}
                            </span>
                          </div>

                          <div className="text-[11px] text-gray-500 font-mono mt-0.5 truncate">
                            Key: {file.path}
                          </div>

                          <div className="flex items-center gap-2 font-mono text-[10px] text-gray-400 mt-1">
                            <span>SHA-256:</span>
                            <span className="text-zinc-700 font-semibold">
                              {formatDigest(file.sourceSha256, 8, 6)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(file.sourceSha256, file.id)}
                              className="text-gray-400 hover:text-zinc-900"
                              title="Copy SHA-256"
                            >
                              {copiedKey === file.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <span>&middot;</span>
                            <span>{file.size}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <DocumentStatusBadge state={file.safetyState} />
                        <button
                          type="button"
                          onClick={() => setSelectedDoc(file.demoDocRef)}
                          className="px-2.5 py-1 text-[11px] font-medium border border-gray-200 hover:bg-gray-100 rounded-md text-gray-700 transition-colors cursor-pointer"
                        >
                          Inspect Findings
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Card Footer Integrity Guarantee */}
              <div className="p-3 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-zinc-800" />
                  <span>Immutable WORM Guarantee: Byte-intact preservation. Raw files never exposed to LLMs.</span>
                </span>
                <span className="font-mono text-[10px] text-zinc-700 font-medium">AES-256-GCM</span>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Multi-Tab View taken from Roles listing -> Cloud Bucket View of each Role */}
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
                        className="text-gray-400 hover:text-zinc-900"
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
                  <X className="w-4 h-4" />
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
