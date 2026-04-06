"use client";

import React, { ReactNode, useRef } from "react";
import { motion, useInView } from "motion/react";

interface ScrollRevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
  readonly direction?: "up" | "down" | "left" | "right";
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = "",
  delay = 0,
  direction = "up",
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const axis = direction === "left" || direction === "right" ? "x" : "y";
  const value = direction === "right" || direction === "down" ? 60 : -60;
  const initial = axis === "x" ? { opacity: 0, x: value } : { opacity: 0, y: Math.abs(value) };
  const animate = isInView
    ? { opacity: 1, x: 0, y: 0, filter: "blur(0px)" }
    : { ...initial, filter: "blur(8px)" };

  return (
    <motion.div
      ref={ref}
      initial={{ ...initial, filter: "blur(8px)" }}
      animate={animate}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
