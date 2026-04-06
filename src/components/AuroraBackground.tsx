"use client";

import React, { ReactNode } from "react";

interface AuroraBackgroundProps {
  readonly children: ReactNode;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen bg-[#06060f] text-zinc-200 overflow-hidden">
      {/* Aurora layers */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="aurora-layer aurora-1" />
        <div className="aurora-layer aurora-2" />
        <div className="aurora-layer aurora-3" />
        <div className="aurora-noise" />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>

      <style>{`
        .aurora-layer {
          position: absolute;
          width: 150%;
          height: 150%;
          top: -25%;
          left: -25%;
          filter: blur(80px);
          opacity: 0.3;
          will-change: transform;
        }

        .aurora-1 {
          background: radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.4) 0%, transparent 60%);
          animation: aurora-drift-1 18s ease-in-out infinite;
        }

        .aurora-2 {
          background: radial-gradient(ellipse at 70% 60%, rgba(139, 92, 246, 0.3) 0%, transparent 55%);
          animation: aurora-drift-2 22s ease-in-out infinite;
        }

        .aurora-3 {
          background: radial-gradient(ellipse at 50% 80%, rgba(59, 130, 246, 0.25) 0%, transparent 50%);
          animation: aurora-drift-3 25s ease-in-out infinite;
        }

        .aurora-noise {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          opacity: 0.4;
        }

        @keyframes aurora-drift-1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(5%, -8%) rotate(3deg) scale(1.05); }
          66% { transform: translate(-3%, 5%) rotate(-2deg) scale(0.98); }
        }

        @keyframes aurora-drift-2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(-6%, 4%) rotate(-4deg) scale(1.03); }
          66% { transform: translate(4%, -6%) rotate(2deg) scale(1.02); }
        }

        @keyframes aurora-drift-3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(3%, -3%) rotate(5deg); }
        }
      `}</style>
    </div>
  );
};
