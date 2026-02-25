"use client";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "./stagger-list";

export function AnimatedTableBody({ children }: { children: React.ReactNode }) {
  return (
    <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
      {children}
    </motion.tbody>
  );
}

export { staggerItem };
