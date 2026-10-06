"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { orgService } from "@/lib/org-service";
import { ArgusLogo } from "@/components/ArgusLogo";
import { UserInvitation, OrganizationRole } from "@/lib/organization-types";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lock,
  Users,
  Building,
} from "lucide-react";

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const invitationId = searchParams.get("id");

  const [invitation, setInvitation] = useState<UserInvitation | null>(null);
  const [role, setRole] = useState<OrganizationRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!invitationId) {
      setLoading(false);
      return;
    }

    const found = orgService.getInvitations().find((i) => i.id === invitationId);
    if (found) {
      setInvitation(found);
      const foundRole = orgService.getRole(found.roleId);
      if (foundRole) setRole(foundRole);
    }
    setLoading(false);
  }, [invitationId]);

  const handleAccept = () => {
    if (!invitation) return;

    const res = orgService.acceptInvitation(invitation.id);
    if (res.success) {
      setAccepted(true);
      setErrorMessage(null);
    } else {
      setErrorMessage(res.error || "Failed to accept invitation.");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-gray-500 font-mono">
        Verifying invitation credentials…
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="bg-white border border-gray-200/80 rounded-2xl p-8 max-w-md w-full shadow-xs text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Invitation Not Found</h2>
          <p className="text-xs text-gray-500 mt-1">
            The invitation link is invalid or may have been revoked by the organization administrator.
          </p>
        </div>
        <Link
          href="/signin"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors"
        >
          <span>Go to Sign In</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-8 max-w-md w-full shadow-xs space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-2">
          <ArgusLogo size="lg" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">
          Join Organization HUKUROU
        </h1>
        <p className="text-xs text-gray-500">
          You have been invited to collaborate under RedactCore deterministic privacy boundaries.
        </p>
      </div>

      {accepted ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <div>
            <div className="text-sm font-bold text-emerald-900">Invitation Accepted!</div>
            <p className="text-xs text-emerald-700 mt-0.5">
              Your seat in HUKUROU has been activated with role <strong>{role?.name || "Member"}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Enter HUKUROU Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-gray-600">
              <span className="text-gray-400">Invited Email:</span>
              <span className="font-mono font-medium text-gray-900">{invitation.email}</span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <span className="text-gray-400">Assigned Role:</span>
              <span className="font-semibold text-gray-900">
                {role?.name || "Member"} (Rank: {role?.rank || 50})
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <span className="text-gray-400">Organization:</span>
              <span className="font-medium text-gray-900">HUKUROU (Enterprise)</span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <span className="text-gray-400">Expiration:</span>
              <span className="font-mono text-gray-500">{invitation.expiresAt.split("T")[0]}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-mono text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {invitation.status === "pending" ? (
            <button
              type="button"
              onClick={handleAccept}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Accept &amp; Activate Seat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg text-center text-xs text-gray-600">
              This invitation is already {invitation.status}.
            </div>
          )}
        </div>
      )}

      <div className="text-center pt-2 border-t border-gray-100">
        <Link
          href="/dashboard"
          className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
        >
          Return to Control Plane
        </Link>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center p-4 font-sans">
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs text-gray-500 font-mono">
            Loading invitation…
          </div>
        }
      >
        <InviteContent />
      </Suspense>
    </div>
  );
}
