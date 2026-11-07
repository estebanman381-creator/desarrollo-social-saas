import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Desarrollo Social - Loreto",
  description: "Sistema de Gestión - Municipalidad de Loreto",
  manifest: "/manifest.json",
  icons: {
    icon: "/loreto.png",
    apple: "/loreto.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        <RegisterSW />
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar Lateral Fija */}
          <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
            <div>
              <div className="p-6 border-b border-slate-800">
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📋</span> Desarrollo Social
                </h1>
                <p className="text-xs text-slate-400 mt-1">Municipalidad de Loreto</p>
              </div>

              <div className="p-4">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-3">
                  MENÚ DE NAVEGACIÓN
                </p>
                <nav className="space-y-1">
                  <Link
                    href="/"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <span>✍️</span> Cargar Ayuda Directa
                  </Link>
                  <Link
                    href="/historial"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <span>🔍</span> Consultar Historial (DNI)
                  </Link>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <span>📊</span> Dashboard & Estadísticas
                  </Link>
                </nav>
              </div>
            </div>

            {/* Footer Lateral */}
            <div className="p-4 m-4 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-200">Municipalidad de Loreto</p>
              <p className="text-slate-400">Secretaría de Desarrollo Social</p>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1">
                <p className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Base de datos: Conectada
                </p>
                <p className="text-slate-400">🔒 Acceso: Seguro (Encriptado)</p>
              </div>
            </div>
          </aside>

          {/* Área Principal */}
          <main className="flex-1 overflow-y-auto p-8 bg-slate-950">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}