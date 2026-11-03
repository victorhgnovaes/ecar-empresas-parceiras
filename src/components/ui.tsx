"use client";

import { useEffect, useRef, useId, type ReactNode } from "react";
import { X, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

export function ButtonLink({ href, children, secondary = false, className = "" }: { href: string; children: ReactNode; secondary?: boolean; className?: string }) {
  return <Link href={href} className={`button ${secondary ? "button-secondary" : "button-primary"} ${className}`}>{children}<ArrowUpRight size={17} aria-hidden="true" /></Link>;
}

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={false} whileInView={reduced ? undefined : { y: [12, 0] }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.45 }}>{children}</motion.div>;
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; element.showModal(); }
    if (!open && element.open) { element.close(); if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true }); }
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <dialog ref={dialog} className={`modal ${wide ? "modal-wide" : ""}`} aria-labelledby={titleId} onKeyDownCapture={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}>
    <div className="modal-heading"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar janela"><X size={21} /></button></div>
    {children}
  </dialog>;
}
