'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'

const CLAVE_TRABAJADORES = "dsdatos"

export default function CargarAyudaPage() {
  const [passInput, setPassInput] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [errorPass, setErrorPass] = useState(false)

  // Formulario
  const [operador, setOperador] = useState('')
  const [dni, setDni] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [direccion, setDireccion] = useState('')
  const [tipoAyuda, setTipoAyuda] = useState('Materiales de Construcción')
  const [descripcion, setDescripcion] = useState('')

  // Estados de proceso
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [lastEntry, setLastEntry] = useState<any>(null)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (passInput === CLAVE_TRABAJADORES) {
      setIsAuthenticated(true)
      setErrorPass(false)
    } else {
      setErrorPass(true)
    }
  }

  function generarPDF(datos: any) {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text("MUNICIPALIDAD DE LORETO", 105, 20, { align: "center" })
    
    doc.setFontSize(12)
    doc.text("Secretaría de Desarrollo Social", 105, 28, { align: "center" })
    doc.text("COMPROBANTE DE ENTREGA DE ASISTENCIA", 105, 36, { align: "center" })

    doc.setFontSize(11)
    doc.text(`Fecha y Hora: ${datos.fecha}`, 20, 50)
    doc.text(`Operador Responsable: ${datos.operador}`, 20, 58)
    doc.text(`Beneficiario: ${datos.apellido}, ${datos.nombre}`, 20, 66)
    doc.text(`DNI: ${datos.dni}`, 20, 74)
    doc.text(`Domicilio: ${datos.direccion || 'S/D'}`, 20, 82)

    doc.setFont("helvetica", "bold")
    doc.text(`Tipo de Ayuda: ${datos.tipoAyuda}`, 20, 95)
    
    doc.setFont("helvetica", "normal")
    const splitDesc = doc.splitTextToSize(`Detalle/Descripción: ${datos.descripcion || 'Sin detalle'}`, 170)
    doc.text(splitDesc, 20, 103)

    // Firma
    doc.text("______________________________", 105, 150, { align: "center" })
    doc.text("Firma del Beneficiario", 105, 158, { align: "center" })

    doc.save(`comprobante_${datos.dni}_${Date.now()}.pdf`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dni.trim() || !nombre.trim() || !apellido.trim() || !operador.trim()) {
      alert("Por favor completa los campos obligatorios: Operador, DNI, Nombre y Apellido.")
      return
    }

    setLoading(true)
    setSuccessMsg('')

    try {
      // 1. Guardar/Actualizar Beneficiario en personas
      const { error: errPersona } = await supabase
        .from('personas')
        .upsert({
          dni: dni.trim(),
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          direccion: direccion.trim()
        })

      if (errPersona) throw errPersona

      // 2. Fecha formato local Argentina
      const fechaActual = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })

      // 3. Insertar entrega
      const { error: errEntrega } = await supabase
        .from('entregas')
        .insert([{
          dni_persona: dni.trim(),
          fecha: fechaActual,
          tipo_ayuda: tipoAyuda,
          descripcion: descripcion.trim(),
          operador: operador.trim()
        }])

      if (errEntrega) throw errEntrega

      const registroGuardado = {
        operador,
        dni,
        nombre,
        apellido,
        direccion,
        tipoAyuda,
        descripcion,
        fecha: fechaActual
      }

      setLastEntry(registroGuardado)
      setSuccessMsg(`¡Registro guardado correctamente para el DNI ${dni}!`)

      // Limpiar campos formulario excepto operador
      setDni('')
      setNombre('')
      setApellido('')
      setDireccion('')
      setDescripcion('')

    } catch (err: any) {
      alert("Error al guardar registro: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <span>📋</span> Sistema de Gestión - Desarrollo Social
      </h1>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white mb-4">✍️ Registro de Beneficiario y Entrega</h2>

        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Ingrese la contraseña de Operador/Trabajador:
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
          <div>
            <div className="bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 px-4 py-2.5 rounded-lg text-sm mb-6">
              Acceso concedido para carga de datos
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">
                  Nombre/Legajo del Operador Responsable *
                </label>
                <input
                  type="text"
                  required
                  value={operador}
                  onChange={(e) => setOperador(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <hr className="border-slate-800" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">DNI *</label>
                  <input
                    type="text"
                    required
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Apellido *</label>
                  <input
                    type="text"
                    required
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">Tipo de Ayuda</label>
                <select
                  value={tipoAyuda}
                  onChange={(e) => setTipoAyuda(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Materiales de Construcción">Materiales de Construcción</option>
                  <option value="Módulo Alimentario">Módulo Alimentario</option>
                  <option value="Subsidio Económico">Subsidio Económico</option>
                  <option value="Medicamentos">Medicamentos</option>
                  <option value="Asistencia Directa">Asistencia Directa</option>
                  <option value="Trámites">Trámites</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">Descripción / Detalle</label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: 10 chapas de zinc, receta de farmacia, etc."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg text-sm transition-all disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar Registro'}
              </button>
            </form>

            {successMsg && (
              <div className="mt-6 p-4 bg-emerald-950/80 border border-emerald-800 rounded-lg text-emerald-300 text-sm space-y-3">
                <p>{successMsg}</p>
                {lastEntry && (
                  <button
                    onClick={() => generarPDF(lastEntry)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <span>📄</span> Descargar Comprobante PDF
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}