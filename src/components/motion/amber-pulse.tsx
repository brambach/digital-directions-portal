"use client";
import { motion } from "framer-motion";

export function AmberPulse({
  children,
  active,
  className,
}: {
  children: React.ReactNode;
  active: boolean;
  className?: string;
}) {
  return (
    <motion.div
      animate={
        active
          ? {
              boxShadow: [
                "0 0 0 0px rgba(251,191,36,0)",
                "0 0 0 4px rgba(251,191,36,0.15)",
                "0 0 0 0px rgba(251,191,36,0)",
              ],
            }
          : {}
      }
      transition={active ? { duration: 2, repeat: 2, delay: 0.8 } : {}}
      className={className}
    >
      {children}
    </motion.div>
  );
}
