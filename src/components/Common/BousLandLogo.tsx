import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export const BousLandLogo: React.FC<LogoProps> = ({
  size = 20,
  className = "",
  glow = true,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        filter: glow
          ? "drop-shadow(0 0 6px rgba(139, 92, 246, 0.45)) drop-shadow(0 0 14px rgba(6, 182, 212, 0.25))"
          : "none",
        transition: "filter 0.3s ease, transform 0.3s ease",
        flexShrink: 0,
      }}
    >
      <defs>
        {/* Outer Titanium Capsule Gradient */}
        <linearGradient
          id="bousOuterGrad"
          x1="4"
          y1="8"
          x2="44"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2E2E3A" />
          <stop offset="50%" stopColor="#1A1A22" />
          <stop offset="100%" stopColor="#0F0F14" />
        </linearGradient>

        {/* Luminous Island Core Gradient */}
        <linearGradient
          id="bousCoreGrad"
          x1="12"
          y1="16"
          x2="36"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="45%" stopColor="#8B5CF6" />
          <stop offset="80%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Specular Rim Light */}
        <linearGradient
          id="bousRimLight"
          x1="8"
          y1="10"
          x2="40"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="35%" stopColor="#A78BFA" stopOpacity="0.3" />
          <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
        </linearGradient>

        {/* Dynamic Island Pill Glow */}
        <radialGradient
          id="bousCenterPulse"
          cx="24"
          cy="24"
          r="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#8B5CF6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 1. Outer Floating Island Base Plate (Rounded Pill) */}
      <rect
        x="6"
        y="12"
        width="36"
        height="24"
        rx="12"
        fill="url(#bousOuterGrad)"
        stroke="url(#bousRimLight)"
        strokeWidth="1.5"
      />

      {/* 2. Inner Glowing Dynamic Core Island */}
      <rect
        x="13"
        y="18"
        width="22"
        height="12"
        rx="6"
        fill="url(#bousCoreGrad)"
      />

      {/* 3. Central Ambient Luminescence */}
      <circle cx="20" cy="24" r="5" fill="url(#bousCenterPulse)" />

      {/* 4. Satellite Status Orbit / Dynamic Signal Dot */}
      <circle
        cx="30"
        cy="24"
        r="2"
        fill="#FFFFFF"
        opacity="0.95"
      />

      {/* 5. Top Specular Reflection Highlight */}
      <path
        d="M16 14C14 14 10 16 9 19C14 16.5 22 15.5 31 16C37 16.5 39 18 39 19C38 16 34 14 32 14H16Z"
        fill="#FFFFFF"
        opacity="0.18"
      />
    </svg>
  );
};
