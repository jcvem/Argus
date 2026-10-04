import React from "react";
import { DocumentSafetyState } from "@/lib/types";
import { CheckCircle2, AlertTriangle, ShieldAlert, Clock } from "lucide-react";

interface DocumentStatusBadgeProps {
  state: DocumentSafetyState;
  showIcon?: boolean;
}

export function DocumentStatusBadge({ state, showIcon = true }: DocumentStatusBadgeProps) {
  switch (state) {
    case "verified":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          <span>Verified</span>
        </span>
      );

    case "review_required":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
          <span>Review Required</span>
        </span>
      );

    case "blocked_scanned_insufficient_ocr":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-full">
          {showIcon && <ShieldAlert className="w-3.5 h-3.5 text-red-600" />}
          <span>Blocked &middot; OCR Insufficient</span>
        </span>
      );

    case "blocked_verification_failure":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-full">
          {showIcon && <ShieldAlert className="w-3.5 h-3.5 text-red-600" />}
          <span>Blocked &middot; Verification Fail</span>
        </span>
      );

    case "ready":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-full">
          {showIcon && <Clock className="w-3.5 h-3.5 text-gray-500" />}
          <span>Ready For Policy</span>
        </span>
      );
  }
}
