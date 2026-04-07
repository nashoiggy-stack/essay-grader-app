"use client";

import type React from "react";
import { MeshGradient } from "@paper-design/shaders-react";

interface ShaderBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function ShaderBackground({ children, className = "" }: ShaderBackgroundProps) {
  return (
    <div className={`min-h-screen w-full relative overflow-hidden bg-black ${className}`}>
      {/* Background Shaders */}
      <MeshGradient
        className="absolute inset-0 w-full h-full"
        colors={["#000000", "#2563eb", "#ffffff", "#0f172a", "#1e3a5f"]}
        speed={0.3}
      />
      <MeshGradient
        className="absolute inset-0 w-full h-full opacity-50"
        colors={["#000000", "#ffffff", "#3b82f6", "#000000"]}
        speed={0.2}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
