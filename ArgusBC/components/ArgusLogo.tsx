import React from "react";
import { ARGUS_EYE_DATA_URI } from "@/lib/brand-assets";

interface ArgusLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ArgusLogo({ className = "", size = "md" }: ArgusLogoProps) {
  const pixelSizes = {
    sm: 28,
    md: 36,
    lg: 44,
  };

  const px = pixelSizes[size];

  return (
    <div
      className={`relative flex items-center justify-center flex-shrink-0 rounded-lg overflow-hidden select-none ${className}`}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ARGUS_EYE_DATA_URI}
        alt="Argus Eye Logo"
        width={px}
        height={px}
        className="w-full h-full object-contain block pointer-events-none"
        loading="eager"
        decoding="sync"
      />
    </div>
  );
}


