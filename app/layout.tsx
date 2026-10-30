import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Oferta Studio — Diagramador de ofertas",
  description: "Transforme sua planilha em criativos de ofertas. Edite, personalize e exporte em lote.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
