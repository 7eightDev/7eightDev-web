"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

const EASE = [0.2, 0.7, 0.2, 1] as const;

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.08 } },
};

const draw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { pathLength: { duration: 0.85, ease: EASE }, opacity: { duration: 0.25 } },
  },
};

const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: EASE } },
};

function useViewProps() {
  const reduce = useReducedMotion();
  return {
    initial: reduce ? "visible" : "hidden",
    whileInView: "visible" as const,
    viewport: { once: true, margin: "0px 0px -10% 0px" },
    variants: container,
  };
}

export function CleanArchDiagram() {
  const view = useViewProps();
  return (
    <motion.svg width="128" height="128" viewBox="0 0 128 128" fill="none" {...view}>
      <motion.circle cx="64" cy="64" r="58" fill="none" stroke="var(--border)" strokeWidth="1.5" variants={draw} />
      <motion.circle cx="64" cy="64" r="44" fill="none" stroke="var(--dim)" strokeWidth="1.5" variants={draw} />
      <motion.circle cx="64" cy="64" r="30" fill="none" stroke="var(--muted)" strokeWidth="1.5" variants={draw} />
      <motion.circle cx="64" cy="64" r="16" fill="color-mix(in oklab, var(--accent) 18%, transparent)" stroke="var(--accent)" strokeWidth="1.5" variants={draw} />
      <motion.text x="64" y="64" textAnchor="middle" dominantBaseline="central" fill="var(--accent)" className="font-mono font-bold text-[9px]" variants={fade}>Domain</motion.text>
      <motion.path d="M96 32l-10 4 4-10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" variants={draw} />
      <motion.path d="M90 38C80 48 74 52 70 56" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" variants={draw} />
    </motion.svg>
  );
}

export function DDDDiagram() {
  const view = useViewProps();
  return (
    <motion.svg width="128" height="128" viewBox="0 0 128 128" fill="none" {...view}>
      <motion.rect x="14" y="30" width="46" height="40" rx="7" stroke="var(--muted)" strokeWidth="1.5" variants={draw} />
      <motion.rect x="70" y="58" width="46" height="40" rx="7" stroke="var(--accent)" strokeWidth="1.5" fill="color-mix(in oklab, var(--accent) 10%, transparent)" variants={draw} />
      <motion.text x="37" y="50" textAnchor="middle" fill="var(--muted)" className="font-mono text-[8px]" variants={fade}>Billing</motion.text>
      <motion.text x="93" y="78" textAnchor="middle" fill="var(--accent)" className="font-mono text-[8px]" variants={fade}>Quotes</motion.text>
      <motion.path d="M58 56l16 8" stroke="var(--dim)" strokeWidth="1.5" strokeDasharray="3 3" variants={draw} />
    </motion.svg>
  );
}

export function TDDDiagram() {
  const view = useViewProps();
  return (
    <motion.svg width="128" height="128" viewBox="0 0 128 128" fill="none" {...view}>
      <motion.path d="M52 40a26 26 0 1 1 -4 30" stroke="var(--dim)" strokeWidth="1.5" strokeLinecap="round" variants={draw} />
      <motion.path d="M50 70l-4 6 7-1" stroke="var(--dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" variants={draw} />
      <motion.circle cx="40" cy="44" r="9" stroke="var(--accent)" strokeWidth="1.5" variants={draw} />
      <motion.circle cx="88" cy="44" r="9" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5" variants={fade} />
      <motion.circle cx="64" cy="88" r="9" stroke="var(--accent)" strokeWidth="1.5" variants={draw} />
      <motion.text x="64" y="64" textAnchor="middle" dominantBaseline="central" fill="var(--muted)" className="font-mono text-[8px]" variants={fade}>R→G→R</motion.text>
    </motion.svg>
  );
}
