'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const CLAVE_DIRECTIVOS = "dsloreto26"

export default function DashboardPage() {
  const [passInput, setPassInput] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [errorPass, setErrorPass] = useState(false)

  const [entregas, setEntregas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (passInput === CLAVE_DIRECTIVOS) {
      setIsAuthenticated(true)
      setErrorPass(false)
      fetchMetrics()
    } else {
      setErrorPass(true)
    }
  }

  async function fetchMetrics() {
    setLoading(true)
    const { data, error } = await supabase
      .from('entregas')
      .select('*')

    if (!error && data) {
      setEntregas(data)
    }
    setLoading(false)
  }

  // Cálculos de métricas
  const totalAyudas = entregas.length
  const beneficiariosUnicos = new Set(entregas.map((e) => e.dni_persona)).size
  const tiposDistintos = new Set(entregas.map((e) => e.tipo_ayuda)).size

  // Desglose por tipo de ayuda
  const desgloseTipo = entregas.reduce((acc: any, curr) => {
    const tipo = curr.tipo_ayuda || 'Otros'
    acc[tipo] = (acc[tipo] || 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <span>📊</span> Panel de Métricas de Asistencia
      </h1>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Ingrese la contraseña de Directivo:
              </label>
              <input
                type="password"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="Contraseña..."
              />
            </div>
            {errorPass && <p className="text-red-400 text-sm">Contraseña incorrecta.</p>}
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-all"
            >
              Ingresar
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 px-4 py-2.5 rounded-lg text-sm">
              Acceso concedido a Métricas
            </div>

            {loading ? (
              <div className="text-slate-400 text-center py-8">Cargando estadísticas...</div>
            ) : totalAyudas === 0 ? (
              <div className="text-slate-400 text-center py-8">
                Aún no hay registros de entregas para mostrar estadísticas.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Métricas clave */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl">
                    <p className="text-xs text-slate-400 font-semibold uppercase">Total Ayudas</p>
                    <p className="text-3xl font-bold text-blue-400 mt-1">{totalAyudas}</p>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl">
                    <p className="text-xs text-slate-400 font-semibold uppercase">Beneficiarios Únicos</p>
                    <p className="text-3xl font-bold text-emerald-400 mt-1">{beneficiariosUnicos}</p>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl">
                    <p className="text-xs text-slate-400 font-semibold uppercase">Tipos de Ayuda Distintos</p>
                    <p className="text-3xl font-bold text-purple-400 mt-1">{tiposDistintos}</p>
                  </div>
                </div>

                <hr className="border-slate-800" />

                {/* Tabla Desglose por Tipo */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Desglose por Tipo de Ayuda</h3>
                  <div className="border border-slate-800 rounded-lg overflow-hidden max-w-xl">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-800 text-slate-200 font-semibold border-b border-slate-700">
                        <tr>
                          <th className="p-3">Tipo de Ayuda</th>
                          <th className="p-3 text-right">Total Entregado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {Object.entries(desgloseTipo).map(([tipo, cantidad]: [string, any]) => (
                          <tr key={tipo} className="hover:bg-slate-800/50">
                            <td className="p-3 font-medium text-slate-200">{tipo}</td>
                            <td className="p-3 text-right font-mono font-bold text-blue-400">{cantidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}