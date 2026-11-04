import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { sitePath } from "@/lib/site-path";
import "./globals.css";
import "@/styles/visual-system.css";
import "@/styles/premium-configurator.css";

const inter = localFont({ src: "../../public/fonts/InterVariable.woff2", variable: "--font-inter", display: "swap", weight: "100 900" });

export const metadata: Metadata = {
  title: { default: "ECAR Frotas | Empresas Parceiras", template: "%s | ECAR Frotas" },
  description: "Explore veículos Chevrolet e Volkswagen, configure sua frota e consulte uma proposta com o Emerson ECAR.",
  robots: { index: false, follow: false },
  applicationName: "ECAR Frotas",
  icons: { icon: sitePath("/icons/icon.svg") },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#071d42" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" data-scroll-behavior="smooth"><body className={inter.variable}><a className="skip-link" href="#conteudo">Pular para o conteúdo</a>{children}</body></html>;
}
