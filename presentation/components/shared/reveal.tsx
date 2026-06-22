"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/presentation/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  /** Stagger delay in milliseconds (kept for API compatibility). */
  delay?: number;
  className?: string;
  /** HTML tag to render. Defaults to a div. */
  as?: keyof typeof motion;
}

const EASE = [0.2, 0.7, 0.2, 1] as const;

const variants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function Reveal({ children, delay = 0, className, as = "div" }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const MotionTag = (motion[as] ?? motion.div) as typeof motion.div;

  if (reduceMotion) {
    const StaticTag = (as as React.ElementType) ?? "div";
    return <StaticTag className={className}>{children}</StaticTag>;
  }

  return (
    <MotionTag
      className={cn(className)}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay: delay / 1000 }}
    >
      {children}
    </MotionTag>
  );
}
