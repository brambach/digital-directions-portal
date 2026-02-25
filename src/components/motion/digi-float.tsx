"use client";
import { motion } from "framer-motion";
import { DigiMascot } from "@/components/digi-mascot";
import type { ComponentProps } from "react";

type DigiFloatProps = ComponentProps<typeof DigiMascot>;

export function DigiFloat(props: DigiFloatProps) {
  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
    >
      <DigiMascot {...props} />
    </motion.div>
  );
}
