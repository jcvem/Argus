import React from "react";

interface ArgusLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ArgusLogo({ className = "", size = "md" }: ArgusLogoProps) {
  const sizeClasses = {
    sm: "w-7 h-7 rounded-md",
    md: "w-9 h-9 rounded-lg",
    lg: "w-11 h-11 rounded-xl",
  };

  const iconSizes = {
    sm: 18,
    md: 22,
    lg: 28,
  };

  return (
    <div
      className={`bg-black flex items-center justify-center flex-shrink-0 shadow-sm ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    >
      <svg
        width={iconSizes[size]}
        height={iconSizes[size]}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer orbital boundary */}
        <circle
          cx="12"
          cy="12"
          r="9.5"
          stroke="#374151"
          strokeWidth="1.2"
          strokeDasharray="2 3"
        />

        {/* Outer Eye Contour */}
        <path
          d="M2.5 12C4.5 7.5 8 5 12 5C16 5 19.5 7.5 21.5 12C19.5 16.5 16 19 12 19C8 19 4.5 16.5 2.5 12Z"
          stroke="#4b5563"
          strokeWidth="1.2"
        />

        {/* Iris outer ring with the Argus zinc brand accent */}
        <circle
          cx="12"
          cy="12"
          r="4.8"
          stroke="#71717a"
          strokeWidth="1.5"
        />

        {/* Solid inner iris accent */}
        <circle
          cx="12"
          cy="12"
          r="3.2"
          fill="#27272a"
        />

        {/* Center pupil dot */}
        <circle
          cx="12"
          cy="12"
          r="1.6"
          fill="#ffffff"
        />

        {/* Subtle teal light reflection dot */}
        <circle
          cx="13.2"
          cy="10.8"
          r="0.8"
          fill="#38bdf8"
        />
      </svg>
    </div>
  );
}
