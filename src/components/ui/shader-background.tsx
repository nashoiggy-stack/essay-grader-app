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
        colors={["#000000", "#8b5cf6", "#ffffff", "#1e1b4b", "#4c1d95"]}
        speed={0.3}
      />
      <MeshGradient
        className="absolute inset-0 w-full h-full opacity-50"
        colors={["#000000", "#ffffff", "#8b5cf6", "#000000"]}
        speed={0.2}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
