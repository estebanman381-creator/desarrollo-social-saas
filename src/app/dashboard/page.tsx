'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const CLAVE_DIRECTIVOS = "dsloreto26"

const MESES = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

// Extrae mes y año tolerando formato argentino ("D/M/YYYY, HH:mm:ss") e ISO ("YYYY-MM-DD...")
function extraerMesYAnio(fechaStr?: string): { mes: number; anio: number } | null {
  if (!fechaStr) return null
  const limpia = fechaStr.trim()

  // Caso 1: Formato D/M/YYYY o DD/MM/YYYY
  const matchLatam = limpia.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (matchLatam) {
    return {
      mes: parseInt(matchLatam[2], 10),
      anio: parseInt(matchLatam[3], 10),
    }
  }

  // Caso 2: Formato ISO YYYY-MM-DD
  const matchIso = limpia.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (matchIso) {
    return {
      anio: parseInt(matchIso[1], 10),
      mes: parseInt(matchIso[2], 10),
    }
  }

  // Caso 3: Fallback nativo
  const parsed = new Date(limpia)
  if (!isNaN(parsed.getTime())) {
    return {
      mes: parsed.getMonth() + 1,
      anio: parsed.getFullYear(),
    }
  }

  return null
}

export default function DashboardPage() {
  const [passInput, setPassInput] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [errorPass, setErrorPass] = useState(false)

  const [entregas, setEntregas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Estados de filtro ('TODOS' por defecto para ver el total histórico al entrar)
  const [anioSeleccionado, setAnioSeleccionado] = useState<string>('TODOS')
  const [mesSeleccionado, setMesSeleccionado] = useState<string>('TODOS')

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

  // Obtener lista de años únicos presentes en los registros (ordenados descendente) + año actual
  const aniosDisponibles = Array.from(
    new Set([
      new Date().getFullYear(),
      ...entregas
        .map((e) => extraerMesYAnio(e.fecha)?.anio)
        .filter((a): a is number => a !== undefined),
    ])
  ).sort((a, b) => b - a)

  // Aplicar filtros sobre las entregas
  const entregasFiltradas = entregas.filter((entrega) => {
    if (anioSeleccionado === 'TODOS' && mesSeleccionado === 'TODOS') {
      return true
    }

    const parsed = extraerMesYAnio(entrega.fecha)
    if (!parsed) return false

    const coincideAnio =
      anioSeleccionado === 'TODOS' || parsed.anio === parseInt(anioSeleccionado, 10)
    const coincideMes =
      mesSeleccionado === 'TODOS' || parsed.mes === parseInt(mesSeleccionado, 10)

    return coincideAnio && coincideMes
  })

  // Cálculos de métricas sobre los datos filtrados
  const totalAyudas = entregasFiltradas.length
  const beneficiariosUnicos = new Set(entregasFiltradas.map((e) => e.dni_persona)).size
  const tiposDistintos = new Set(entregasFiltradas.map((e) => e.tipo_ayuda)).size

  // Desglose por tipo de ayuda ordenado de mayor a menor
  const desgloseTipo = entregasFiltradas.reduce((acc: Record<string, number>, curr) => {
    const tipo = curr.tipo_ayuda || 'Otros'
    acc[tipo] = (acc[tipo] || 0) + 1
    return acc
  }, {})

  const desgloseOrdenado = Object.entries(desgloseTipo).sort(([, a], [, b]) => b - a)

  // Etiqueta descriptiva del período actual
  const nombreMes = MESES.find((m) => m.value === mesSeleccionado)?.label
  const etiquetaPeriodo =
    anioSeleccionado === 'TODOS' && mesSeleccionado === 'TODOS'
      ? 'Total Histórico Acumulado'
      : `${mesSeleccionado !== 'TODOS' ? nombreMes : 'Todo el año'} ${
          anioSeleccionado !== 'TODOS' ? anioSeleccionado : '(Todos los años)'
        }`

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
            <div className="bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 px-4 py-2.5 rounded-lg text-sm flex justify-between items-center">
              <span>Acceso concedido a Métricas</span>
              <button
                type="button"
                onClick={fetchMetrics}
                className="text-xs bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-700 px-3 py-1 rounded-md text-emerald-200 transition-all"
              >
                🔄 Actualizar datos
              </button>
            </div>

            {loading ? (
              <div className="text-slate-400 text-center py-8">Cargando estadísticas...</div>
            ) : entregas.length === 0 ? (
              <div className="text-slate-400 text-center py-8">
                Aún no hay registros de entregas para mostrar estadísticas.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Barra de Filtros por Período */}
                <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 max-w-lg">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                        Año de Gestión
                      </label>
                      <select
                        value={anioSeleccionado}
                        onChange={(e) => setAnioSeleccionado(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="TODOS">Todos los años (Total)</option>
                        {aniosDisponibles.map((anio) => (
                          <option key={anio} value={String(anio)}>
                            {anio}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                        Mes
                      </label>
                      <select
                        value={mesSeleccionado}
                        onChange={(e) => setMesSeleccionado(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="TODOS">Todos los meses</option>
                        {MESES.map((mes) => (
                          <option key={mes.value} value={mes.value}>
                            {mes.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <span className="text-xs font-medium text-blue-300 bg-blue-950/60 border border-blue-800/60 px-3 py-1.5 rounded-lg">
                      Viendo: <strong>{etiquetaPeriodo}</strong>
                    </span>

                    {(anioSeleccionado !== 'TODOS' || mesSeleccionado !== 'TODOS') && (
                      <button
                        type="button"
                        onClick={() => {
                          setAnioSeleccionado('TODOS')
                          setMesSeleccionado('TODOS')
                        }}
                        className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-all"
                      >
                        Ver Total
                      </button>
                    )}
                  </div>
                </div>

                {totalAyudas === 0 ? (
                  <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
                    No se registraron entregas para el período seleccionado (<strong>{etiquetaPeriodo}</strong>).
                  </div>
                ) : (
                  <>
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
                      <h3 className="text-lg font-semibold text-white mb-3">
                        Desglose por Tipo de Ayuda
                      </h3>
                      <div className="border border-slate-800 rounded-lg overflow-hidden max-w-xl">
                        <table className="w-full text-left text-sm text-slate-300">
                          <thead className="bg-slate-800 text-slate-200 font-semibold border-b border-slate-700">
                            <tr>
                              <th className="p-3">Tipo de Ayuda</th>
                              <th className="p-3 text-right">Total Entregado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {desgloseOrdenado.map(([tipo, cantidad]) => (
                              <tr key={tipo} className="hover:bg-slate-800/50">
                                <td className="p-3 font-medium text-slate-200">{tipo}</td>
                                <td className="p-3 text-right font-mono font-bold text-blue-400">{cantidad}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}