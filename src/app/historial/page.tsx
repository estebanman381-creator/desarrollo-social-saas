'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const CLAVE_DIRECTIVOS = "dsloreto26"

export default function HistorialPage() {
  const [passInput, setPassInput] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [errorPass, setErrorPass] = useState(false)

  const [dniBuscar, setDniBuscar] = useState('')
  const [persona, setPersona] = useState<any>(null)
  const [entregas, setEntregas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (passInput === CLAVE_DIRECTIVOS) {
      setIsAuthenticated(true)
      setErrorPass(false)
    } else {
      setErrorPass(true)
    }
  }

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!dniBuscar.trim()) return

    setLoading(true)
    setSearched(true)
    setPersona(null)
    setEntregas([])

    try {
      // Buscar Beneficiario
      const { data: dataPersona, error: errPersona } = await supabase
        .from('personas')
        .select('*')
        .eq('dni', dniBuscar.trim())
        .maybeSingle()

      if (errPersona) throw errPersona

      if (dataPersona) {
        setPersona(dataPersona)

        // Buscar Entregas
        const { data: dataEntregas, error: errEntregas } = await supabase
          .from('entregas')
          .select('fecha, tipo_ayuda, descripcion, operador')
          .eq('dni_persona', dniBuscar.trim())
          .order('id', { ascending: false })

        if (errEntregas) throw errEntregas
        setEntregas(dataEntregas || [])
      }
    } catch (err: any) {
      alert("Error al consultar la base de datos: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <span>🔍</span> Consulta de Historial (Exclusivo Directivos)
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
              Acceso concedido para consultas directivas
            </div>

            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                value={dniBuscar}
                onChange={(e) => setDniBuscar(e.target.value)}
                placeholder="Ingresa el DNI a buscar..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-all disabled:opacity-50"
              >
                {loading ? 'Buscando...' : 'Buscar Historial'}
              </button>
            </form>

            {searched && !loading && (
              <div>
                {persona ? (
                  <div className="space-y-4">
                    <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-lg text-slate-200 text-sm">
                      <p>
                        <strong className="text-white">Beneficiario:</strong> {persona.apellido}, {persona.nombre} |{' '}
                        <strong className="text-white">Domicilio:</strong> {persona.direccion || 'S/D'}
                      </p>
                    </div>

                    {entregas.length > 0 ? (
                      <div className="border border-slate-800 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm text-slate-300">
                          <thead className="bg-slate-800 text-slate-200 font-semibold border-b border-slate-700">
                            <tr>
                              <th className="p-3">Fecha y Hora</th>
                              <th className="p-3">Tipo de Ayuda</th>
                              <th className="p-3">Descripción</th>
                              <th className="p-3">Operador Carga</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {entregas.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/50">
                                <td className="p-3 whitespace-nowrap">{item.fecha || 'S/F'}</td>
                                <td className="p-3 font-medium text-slate-100">{item.tipo_ayuda}</td>
                                <td className="p-3">{item.descripcion || 'Sin detalle'}</td>
                                <td className="p-3 text-slate-400">{item.operador}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-950/40 border border-amber-800/60 text-amber-300 rounded-lg text-sm">
                        El beneficiario existe pero no tiene entregas registradas.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-red-950/40 border border-red-800/60 text-red-300 rounded-lg text-sm">
                    No se encontró ningún beneficiario con ese DNI.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}