"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (name: "inicio" | "biblioteca" | "salon" | "auth") => {
    if (name === "inicio") return pathname === "/home";
    if (name === "biblioteca") {
      return pathname.startsWith("/games") || pathname.startsWith("/juego") || pathname.startsWith("/jugar");
    }
    if (name === "salon") return pathname.startsWith("/salon");
    return pathname.startsWith("/auth");
  };

  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link className="logo" href="/home" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">ARCADE <span className="neon-magenta">VAULT</span></div>
        </Link>
        <div className="links">
          <Link className={isActive("inicio") ? "active" : ""} href="/home">Inicio</Link>
          <Link className={isActive("biblioteca") ? "active" : ""} href="/games">Biblioteca</Link>
          <Link className={isActive("salon") ? "active" : ""} href="/salon">Salón de la Fama</Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        <Link className="btn auth-btn" href="/auth">Iniciar Sesión</Link>
        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">≡</button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close}></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>MENÚ</div>
        <Link className={isActive("inicio") ? "active" : ""} href="/home" onClick={close}>Inicio</Link>
        <Link className={isActive("biblioteca") ? "active" : ""} href="/games" onClick={close}>Biblioteca</Link>
        <Link className={isActive("salon") ? "active" : ""} href="/salon" onClick={close}>Salón de la Fama</Link>
        <Link className={isActive("auth") ? "active" : ""} href="/auth" onClick={close}>Iniciar Sesión</Link>
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>CRÉDITOS · 03</div>
      </aside>
    </>
  );
}
