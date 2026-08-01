import type { Metadata } from "next";
import { Press_Start_2P, JetBrains_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const pixelFont = Press_Start_2P({
  variable: "--font-press-start-2p",
  subsets: ["latin"],
  weight: "400",
});

const monoFont = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Jugá online y competí por puntaje.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${pixelFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="av-bg" />
        <div className="av-noise" />
        <div className="av-root">
          <Nav />
          <main className="av-main">{children}</main>
          <footer
            style={{
              borderTop: "1px solid var(--line)",
              padding: "20px 32px",
              textAlign: "center",
              color: "var(--ink-faint)",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
            }}
          >
            © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
          </footer>
        </div>
      </body>
    </html>
  );
}
