"use client";

interface LogoProps {
  size?: number;
  className?: string;
}

export function AdmitEdgeLogo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Circle ring */}
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="url(#ring-grad)"
        strokeWidth="2.5"
        fill="none"
      />

      {/* Mountain */}
      <path
        d="M16 44 L28 22 L34 32 L38 26 L48 44 Z"
        fill="url(#mountain-grad)"
      />
      {/* Mountain snow cap */}
      <path
        d="M28 22 L31 28 L25 28 Z"
        fill="white"
        opacity="0.9"
      />

      {/* Upward arrow sweeping around */}
      <path
        d="M42 38 L42 18 L36 24"
        stroke="url(#arrow-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M42 18 L48 24"
        stroke="url(#arrow-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Book/page accent */}
      <path
        d="M20 42 C20 39, 24 38, 26 39 M20 42 C20 39, 16 38, 14 39"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
        fill="none"
      />

      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="mountain-grad" x1="16" y1="22" x2="48" y2="44">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="arrow-grad" x1="42" y1="38" x2="42" y2="18">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>
    </svg>
  );
}
