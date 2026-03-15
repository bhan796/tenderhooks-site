"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button style={{ background: "none", border: 0, color: "white", display: "none" }} aria-label="menu">
          {open ? <X /> : <Menu />}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", padding: 40, zIndex: 60 }}>
          <nav style={{ display: "grid", gap: 16 }}>
            <Link href="/" onClick={() => setOpen(false)}>Home</Link>
            <Link href="/onboarding" onClick={() => setOpen(false)}>Onboarding</Link>
            <Link href="/terms" onClick={() => setOpen(false)}>Terms</Link>
            <Link href="/privacy" onClick={() => setOpen(false)}>Privacy</Link>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
