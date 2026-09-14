"use client";

import React, { useState } from "react";
import { Zap } from "lucide-react";
import { ProUpgradeModal } from "./ProUpgradeModal";

export function ProNavButton() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-1.5 text-xs font-mono text-amber-400 hover:text-amber-300 transition px-3 py-1.5 rounded-xl bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/60 cursor-pointer shadow-sm"
      >
        <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        <span className="font-bold">Pro</span>
      </button>

      <ProUpgradeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
