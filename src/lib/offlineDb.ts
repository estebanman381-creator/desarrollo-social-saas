import Dexie, { Table } from 'dexie'
import { supabase } from '@/lib/supabase'

export interface EntregaOffline {
  id?: number
  persona: {
    dni: string
    nombre: string
    apellido: string
    direccion: string
  }
  entrega: {
    fecha: string
    tipo_ayuda: string
    descripcion: string
    operador: string
  }
  synced: number // 0 = pendiente, 1 = sincronizado
}

class BaseDeDatosLocal extends Dexie {
  entregasPendientes!: Table<EntregaOffline>

  constructor() {
    super('DesarrolloSocialOffline')
    this.version(1).stores({
      entregasPendientes: '++id, synced'
    })
  }
}

export const dbLocal = new BaseDeDatosLocal()

// Función para guardar localmente si no hay conexión
export async function guardarEntregaOffline(persona: any, entrega: any) {
  return await dbLocal.entregasPendientes.add({
    persona,
    entrega,
    synced: 0
  })
}

// Función para sincronizar datos pendientes con Supabase al recuperar internet
export async function sincronizarDatosPendientes() {
  if (!navigator.onLine) return

  const pendientes = await dbLocal.entregasPendientes.where('synced').equals(0).toArray()

  if (pendientes.length === 0) return

  for (const item of pendientes) {
    try {
      // 1. Guardar o actualizar la persona en Supabase
      const { error: errPersona } = await supabase
        .from('personas')
        .upsert({
          dni: item.persona.dni,
          nombre: item.persona.nombre,
          apellido: item.persona.apellido,
          direccion: item.persona.direccion
        }, { onConflict: 'dni' })

      if (errPersona) throw errPersona

      // 2. Guardar la entrega asociada en Supabase
      const { error: errEntrega } = await supabase
        .from('entregas')
        .insert({
          dni_persona: item.persona.dni,
          fecha: item.entrega.fecha,
          tipo_ayuda: item.entrega.tipo_ayuda,
          descripcion: item.entrega.descripcion,
          operador: item.entrega.operador
        })

      if (errEntrega) throw errEntrega

      // 3. Borrar de la base de datos local al confirmar subida
      if (item.id) {
        await dbLocal.entregasPendientes.delete(item.id)
      }
    } catch (err) {
      console.error('Error al sincronizar registro offline:', err)
    }
  }
}

// Listener para detectar automáticamente cuándo vuelve el internet
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    sincronizarDatosPendientes()
  })
}