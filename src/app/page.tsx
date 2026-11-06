'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import { guardarEntregaOffline, sincronizarDatosPendientes } from '@/lib/offlineDb'

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

  // Estados de proceso y conexión
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [lastEntry, setLastEntry] = useState<any>(null)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine)
      sincronizarDatosPendientes()

      const handleOnline = () => {
        setIsOnline(true)
        sincronizarDatosPendientes()
      }
      const handleOffline = () => setIsOnline(false)

      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

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

    const fechaActual = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })

    const personaDatos = {
      dni: dni.trim(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      direccion: direccion.trim()
    }

    const entregaDatos = {
      fecha: fechaActual,
      tipo_ayuda: tipoAyuda,
      descripcion: descripcion.trim(),
      operador: operador.trim()
    }

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

    // Si no hay señal de internet, guardar localmente de inmediato
    if (!navigator.onLine) {
      await guardarEntregaOffline(personaDatos, entregaDatos)
      setLastEntry(registroGuardado)
      setSuccessMsg(`⚠️ Sin internet: Registro guardado localmente para el DNI ${dni}. Se sincronizará automáticamente al volver la red.`)
      limpiarCampos()
      setLoading(false)
      return
    }

    try {
      // 1. Intentar Guardar/Actualizar Beneficiario en Supabase
      const { error: errPersona } = await supabase
        .from('personas')
        .upsert(personaDatos, { onConflict: 'dni' })

      if (errPersona) throw errPersona

      // 2. Insertar entrega en Supabase
      const { error: errEntrega } = await supabase
        .from('entregas')
        .insert([{
          dni_persona: dni.trim(),
          ...entregaDatos
        }])

      if (errEntrega) throw errEntrega

      setLastEntry(registroGuardado)
      setSuccessMsg(`¡Registro guardado correctamente en la base de datos para el DNI ${dni}!`)
      limpiarCampos()

    } catch (err: any) {
      console.warn("Fallo en conexión, guardando offline:", err.message)
      // Si falla por problemas de red o Supabase, respaldar offline
      await guardarEntregaOffline(personaDatos, entregaDatos)
      setLastEntry(registroGuardado)
      setSuccessMsg(`⚠️ Error de red: Registro guardado en el dispositivo para el DNI ${dni}. Se subirá cuando se restablezca la conexión.`)
      limpiarCampos()
    } finally {
      setLoading(false)
    }
  }

  function limpiarCampos() {
    setDni('')
    setNombre('')
    setApellido('')
    setDireccion('')
    setDescripcion('')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>📋</span> Sistema de Gestión - Desarrollo Social
        </h1>
        <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${
          isOnline 
            ? 'bg-emerald-950/80 border-emerald-600 text-emerald-400' 
            : 'bg-amber-950/80 border-amber-600 text-amber-400'
        }`}>
          {isOnline ? '🟢 Online' : '🟠 Modo Offline'}
        </span>
      </div>

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
            <div className="bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 px-4 py-2.5 rounded-lg text-sm mb-6 flex justify-between items-center">
              <span>Acceso concedido para carga de datos</span>
              {!isOnline && (
                <span className="text-xs text-amber-300 font-medium">
                  Los registros se guardarán localmente hasta recuperar señal
                </span>
              )}
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
                {loading ? 'Guardando...' : (isOnline ? 'Guardar Registro' : 'Guardar Registro (Modo Offline)')}
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