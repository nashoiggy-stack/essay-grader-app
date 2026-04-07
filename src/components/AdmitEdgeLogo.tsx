"use client";

import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

export function AdmitEdgeLogo({ size = 32, className = "" }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="AdmitEdge"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      priority
    />
  );
}
