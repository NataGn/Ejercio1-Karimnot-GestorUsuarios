"use client"

import { useState, useEffect } from "react"

const GestionPermisos = ({ usuario, onClose, onPermisosActualizados }) => {
  const [permisos, setPermisos] = useState([])
  const [permisosUsuario, setPermisosUsuario] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState("")

  // Cargar todos los permisos disponibles
  const cargarPermisos = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:3001/admin/permisos", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPermisos(data)
      }
    } catch (error) {
      console.error("Error cargando permisos:", error)
    }
  }

  // Cargar permisos del usuario específico
  const cargarPermisosUsuario = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:3001/admin/usuarios/${usuario.id}/permisos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPermisosUsuario(data)
      }
    } catch (error) {
      console.error("Error cargando permisos del usuario:", error)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const cargarDatos = async () => {
      await cargarPermisos()
      await cargarPermisosUsuario()
    }
    cargarDatos()
  }, [usuario.id])

  const handlePermisoChange = (permisoId, asignado) => {
    setPermisosUsuario((prev) => prev.map((p) => (p.id === permisoId ? { ...p, asignado } : p)))
  }

  const guardarPermisos = async () => {
    try {
      setGuardando(true)
      const token = localStorage.getItem("token")

      // Obtener solo los IDs de los permisos asignados
      const permisosAsignados = permisosUsuario.filter((p) => p.asignado).map((p) => p.id)

      const response = await fetch(`http://localhost:3001/admin/usuarios/${usuario.id}/permisos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permisos: permisosAsignados }),
      })

      if (response.ok) {
        setMensaje("Permisos actualizados exitosamente")
        if (onPermisosActualizados) {
          onPermisosActualizados()
        }
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        const data = await response.json()
        setMensaje(`Error: ${data.error}`)
      }
    } catch (error) {
      setMensaje("Error de conexión")
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="modal-overlay">
        <div className="modal-content-large">
          <div className="modal-header">
            <h2 className="title">Cargando...</h2>
            <button className="close-button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content-large">
        <div className="modal-header">
          <h2 className="title">Gestionar Permisos - {usuario.nombre}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: "1.5rem", color: "#5f6368", fontSize: "16px" }}>
            Selecciona los permisos que deseas asignar a este usuario:
          </p>

          <div className="permisos-grid-mejorado">
            {permisosUsuario.map((permiso) => (
              <div key={permiso.id} className="permiso-card-mejorado">
                <label className="permiso-checkbox-mejorado">
                  <input
                    type="checkbox"
                    checked={permiso.asignado}
                    onChange={(e) => handlePermisoChange(permiso.id, e.target.checked)}
                  />
                  <div className="permiso-contenido">
                    <span className="permiso-descripcion-grande">{permiso.descripcion}</span>
                  </div>
                </label>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#5f6368" }}>
              <strong>Nota:</strong> Todos los usuarios pueden ver la lista de personas registradas por defecto. Estos
              permisos adicionales les permiten crear, editar o eliminar registros.
            </p>
          </div>

          {mensaje && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                borderRadius: "8px",
                backgroundColor: mensaje.includes("exitosamente") ? "#e6f4ea" : "#fce8e6",
                color: mensaje.includes("exitosamente") ? "#188038" : "#d93025",
              }}
            >
              {mensaje}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="button button-secondary">
              Cancelar
            </button>
            <button type="button" onClick={guardarPermisos} disabled={guardando} className="button">
              {guardando ? "Guardando..." : "Guardar Permisos"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GestionPermisos
