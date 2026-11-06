'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'

const CLAVE_DIRECTIVOS = "dsloreto26"

export default function HistorialPage() {
  const [passInput, setPassInput] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [errorPass, setErrorPass] = useState(false)

  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<any[]>([])
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
    if (!busqueda.trim()) return

    setLoading(true)
    setSearched(true)
    setResultados([])

    try {
      const termino = `%${busqueda.trim()}%`

      // Buscar personas que coincidan con DNI, Nombre o Apellido
      const { data: dataPersonas, error: errPersona } = await supabase
        .from('personas')
        .select('*')
        .or(`dni.ilike.${termino},nombre.ilike.${termino},apellido.ilike.${termino}`)

      if (errPersona) throw errPersona

      if (dataPersonas && dataPersonas.length > 0) {
        // Cargar las entregas asociadas a cada persona encontrada
        const personasConEntregas = await Promise.all(
          dataPersonas.map(async (persona) => {
            const { data: dataEntregas, error: errEntregas } = await supabase
              .from('entregas')
              .select('fecha, tipo_ayuda, descripcion, operador')
              .eq('dni_persona', persona.dni)
              .order('id', { ascending: false })

            if (errEntregas) throw errEntregas

            return {
              ...persona,
              entregas: dataEntregas || []
            }
          })
        )

        setResultados(personasConEntregas)
      }
    } catch (err: any) {
      alert("Error al consultar la base de datos: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Función para exportar los datos visibles a un archivo Excel (.xlsx)
  const exportarExcel = () => {
    const filasExcel: any[] = []

    resultados.forEach((persona) => {
      if (persona.entregas && persona.entregas.length > 0) {
        persona.entregas.forEach((entrega: any) => {
          filasExcel.push({
            'DNI': persona.dni,
            'Apellido': persona.apellido,
            'Nombre': persona.nombre,
            'Domicilio': persona.direccion || 'S/D',
            'Fecha y Hora': entrega.fecha || 'S/F',
            'Tipo de Ayuda': entrega.tipo_ayuda,
            'Descripción': entrega.descripcion || 'Sin detalle',
            'Operador': entrega.operador || 'Sistema'
          })
        })
      } else {
        filasExcel.push({
          'DNI': persona.dni,
          'Apellido': persona.apellido,
          'Nombre': persona.nombre,
          'Domicilio': persona.direccion || 'S/D',
          'Fecha y Hora': 'Sin entregas',
          'Tipo de Ayuda': '-',
          'Descripción': '-',
          'Operador': '-'
        })
      }
    })

    const hoja = XLSX.utils.json_to_sheet(filasExcel)
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Historial_Entregas')
    XLSX.writeFile(libro, `Historial_Desarrollo_Social_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // Función para regenerar el comprobante PDF de una entrega pasada
  const descargarPDF = (entrega: any, persona: any) => {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text("MUNICIPALIDAD DE LORETO", 105, 20, { align: "center" })
    doc.setFontSize(12)
    doc.text("Secretaría de Desarrollo Social", 105, 28, { align: "center" })
    doc.text("COMPROBANTE DE ENTREGA", 105, 36, { align: "center" })
    doc.line(20, 42, 190, 42)

    doc.setFontSize(10)
    doc.text(`Fecha / Hora: ${entrega.fecha || 'S/F'}`, 20, 52)
    doc.text(`Beneficiario: ${persona.apellido}, ${persona.nombre}`, 20, 60)
    doc.text(`DNI: ${persona.dni}`, 20, 68)
    doc.text(`Domicilio: ${persona.direccion || 'S/D'}`, 20, 76)

    doc.line(20, 82, 190, 82)
    doc.text(`Tipo de Ayuda: ${entrega.tipo_ayuda}`, 20, 92)
    doc.text(`Descripción / Detalle: ${entrega.descripcion || 'Sin detalle'}`, 20, 100)
    doc.text(`Operador Registrante: ${entrega.operador || 'Sistema'}`, 20, 108)

    doc.line(20, 140, 80, 140)
    doc.text("Firma del Beneficiario", 30, 146)

    doc.line(130, 140, 190, 140)
    doc.text("Firma Responsable", 145, 146)

    doc.save(`Recibo_${persona.dni}_${entrega.tipo_ayuda.replace(/\s+/g, '_')}.pdf`)
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
            <div className="flex justify-between items-center bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 px-4 py-2.5 rounded-lg text-sm">
              <span>Acceso concedido para consultas directivas</span>
              {resultados.length > 0 && (
                <button
                  onClick={exportarExcel}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1 rounded text-xs transition-all flex items-center gap-1"
                >
                  📊 Exportar a Excel
                </button>
              )}
            </div>

            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por DNI, Nombre o Apellido..."
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
              <div className="space-y-6">
                {resultados.length > 0 ? (
                  resultados.map((persona) => (
                    <div key={persona.id || persona.dni} className="space-y-4">
                      <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-lg text-slate-200 text-sm">
                        <p>
                          <strong className="text-white">Beneficiario:</strong> {persona.apellido}, {persona.nombre} |{' '}
                          <strong className="text-white">DNI:</strong> {persona.dni} |{' '}
                          <strong className="text-white">Domicilio:</strong> {persona.direccion || 'S/D'}
                        </p>
                      </div>

                      {persona.entregas.length > 0 ? (
                        <div className="border border-slate-800 rounded-lg overflow-hidden">
                          <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-800 text-slate-200 font-semibold border-b border-slate-700">
                              <tr>
                                <th className="p-3">Fecha y Hora</th>
                                <th className="p-3">Tipo de Ayuda</th>
                                <th className="p-3">Descripción</th>
                                <th className="p-3">Operador Carga</th>
                                <th className="p-3 text-center">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {persona.entregas.map((item: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-800/50">
                                  <td className="p-3 whitespace-nowrap">{item.fecha || 'S/F'}</td>
                                  <td className="p-3 font-medium text-slate-100">{item.tipo_ayuda}</td>
                                  <td className="p-3">{item.descripcion || 'Sin detalle'}</td>
                                  <td className="p-3 text-slate-400">{item.operador}</td>
                                  <td className="p-3 text-center">
                                    <button
                                      onClick={() => descargarPDF(item, persona)}
                                      className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-2.5 py-1 rounded transition-all"
                                      title="Descargar Comprobante PDF"
                                    >
                                      📄 PDF
                                    </button>
                                  </td>
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
                  ))
                ) : (
                  <div className="p-4 bg-red-950/40 border border-red-800/60 text-red-300 rounded-lg text-sm">
                    No se encontró ningún beneficiario que coincida con la búsqueda.
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