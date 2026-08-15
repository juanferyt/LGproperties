"use client";
import { useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "#propiedades", label: "Propiedades" },
  { href: "#contacto", label: "Contacto" },
  { href: "/mi-reserva", label: "Mi reserva" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-white">
        <Link href="/" className="font-display text-xl tracking-[.22em]" onClick={() => setOpen(false)}>
          LG PROPERTIES
        </Link>

        <nav className="hidden gap-8 text-sm md:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href}>{link.label}</Link>
          ))}
          <a href="/reservar" className="rounded-full border border-white/50 px-5 py-2">Reservar</a>
        </nav>

        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 md:hidden"
        >
          <span className="relative block h-3.5 w-5">
            <span className={`absolute left-0 top-0 h-0.5 w-full bg-white transition-transform ${open ? "translate-y-[6px] rotate-45" : ""}`} />
            <span className={`absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-white transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`absolute bottom-0 left-0 h-0.5 w-full bg-white transition-transform ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
          </span>
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-white/10 bg-ink px-6 py-4 text-white md:hidden">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm hover:bg-white/5">
              {link.label}
            </Link>
          ))}
          <a href="/reservar" onClick={() => setOpen(false)} className="mt-2 rounded-full border border-white/50 px-5 py-3 text-center text-sm">
            Reservar
          </a>
        </nav>
      )}
    </header>
  );
}
