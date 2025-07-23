"use client"

import { useState, useEffect } from "react"
import GestionPermisos from "./GestionPermisos"

const GestionUsuarios = () => {
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    correo: "",
    contrasena: "",
    rol: "usuario_estandar",
  })
  const [mensaje, setMensaje] = useState("")
  const [cargando, setCargando] = useState(false)
  const [usuariosDelSistema, setUsuariosDelSistema] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)
  const [mostrarPermisos, setMostrarPermisos] = useState(false)

  // Cargar usuarios del sistema
  const cargarUsuariosDelSistema = async () => {
    try {
      setCargandoLista(true)
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:3001/admin/usuarios", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsuariosDelSistema(data)
      }
    } catch (error) {
      console.error("Error cargando usuarios del sistema:", error)
    } finally {
      setCargandoLista(false)
    }
  }

  useEffect(() => {
    cargarUsuariosDelSistema()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setNuevoUsuario((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!nuevoUsuario.nombre || !nuevoUsuario.correo || !nuevoUsuario.contrasena) {
      setMensaje("Todos los campos son requeridos")
      return
    }

    if (nuevoUsuario.contrasena.length < 6) {
      setMensaje("La contraseña debe tener al menos 6 caracteres")
      return
    }

    try {
      setCargando(true)
      const token = localStorage.getItem("token")

      const response = await fetch("http://localhost:3001/admin/registro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(nuevoUsuario),
      })

      const data = await response.json()

      if (response.ok) {
        setMensaje(`Usuario creado exitosamente con rol: ${nuevoUsuario.rol}`)
        setNuevoUsuario({
          nombre: "",
          correo: "",
          contrasena: "",
          rol: "usuario_estandar",
        })
        // Recargar la lista
        cargarUsuariosDelSistema()
      } else {
        setMensaje(`Error: ${data.error}`)
      }
    } catch (error) {
      setMensaje("Error de conexión")
    } finally {
      setCargando(false)
    }
  }

  const eliminarUsuarioDelSistema = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de eliminar al usuario ${nombre}?`)) {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`http://localhost:3001/admin/usuarios/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          setMensaje("Usuario eliminado exitosamente")
          cargarUsuariosDelSistema()
        } else {
          const data = await response.json()
          setMensaje(`Error: ${data.error}`)
        }
      } catch (error) {
        setMensaje("Error de conexión")
      }
    }
  }

  const abrirGestionPermisos = (usuario) => {
    setUsuarioSeleccionado(usuario)
    setMostrarPermisos(true)
  }

  const cerrarGestionPermisos = () => {
    setMostrarPermisos(false)
    setUsuarioSeleccionado(null)
    cargarUsuariosDelSistema() // Recargar para mostrar permisos actualizados
  }

  if (mostrarPermisos && usuarioSeleccionado) {
    return (
      <GestionPermisos
        usuario={usuarioSeleccionado}
        onClose={cerrarGestionPermisos}
        onPermisosActualizados={cargarUsuariosDelSistema}
      />
    )
  }

  return (
    <div className="container" style={{ maxWidth: "1000px" }}>
      <h2 className="title">Gestión de Usuarios del Sistema</h2>

      {/* Formulario para crear nuevo usuario */}
      <div style={{ marginBottom: "3rem" }}>
        <h3 style={{ color: "#1a73e8", marginBottom: "1rem" }}>Crear Nuevo Usuario</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Nombre completo:</label>
            <input
              type="text"
              name="nombre"
              value={nuevoUsuario.nombre}
              onChange={handleChange}
              className="input"
              placeholder="Nombre del usuario"
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Correo electrónico:</label>
            <input
              type="email"
              name="correo"
              value={nuevoUsuario.correo}
              onChange={handleChange}
              className="input"
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Contraseña:</label>
            <input
              type="password"
              name="contrasena"
              value={nuevoUsuario.contrasena}
              onChange={handleChange}
              className="input"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Rol del usuario:</label>
            <select name="rol" value={nuevoUsuario.rol} onChange={handleChange} className="input">
              <option value="usuario_estandar">Usuario Estándar (Permisos personalizables)</option>
              <option value="administrador">Administrador (Acceso completo)</option>
            </select>
          </div>

          <button type="submit" disabled={cargando} className="button">
            {cargando ? "Creando..." : "Crear Usuario"}
          </button>
        </form>

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
      </div>

      {/* Lista de usuarios del sistema */}
      <div>
        <h3 style={{ color: "#1a73e8", marginBottom: "1rem" }}>Usuarios del Sistema</h3>

        {cargandoLista ? (
          <div className="loading">Cargando usuarios...</div>
        ) : usuariosDelSistema.length === 0 ? (
          <div className="no-results">
            <p>No hay usuarios registrados en el sistema.</p>
          </div>
        ) : (
          <div className="usuarios-sistema-grid">
            {usuariosDelSistema.map((usuario) => (
              <div key={usuario.id} className="usuario-sistema-card">
                <div className="usuario-sistema-info">
                  <h4 className="usuario-sistema-nombre">{usuario.nombre}</h4>
                  <p className="usuario-sistema-detalle">
                    <strong>Correo:</strong> {usuario.correo}
                  </p>
                  <p className="usuario-sistema-detalle">
                    <strong>Rol:</strong>{" "}
                    <span className={`rol-badge ${usuario.rol}`}>
                      {usuario.rol === "administrador" ? "Administrador" : "Usuario Estándar"}
                    </span>
                  </p>
                  <p className="usuario-sistema-detalle">
                    <strong>Creado:</strong> {new Date(usuario.fecha_creacion).toLocaleDateString()}
                  </p>
                  <p className="usuario-sistema-detalle">
                    <strong>Permisos:</strong>{" "}
                    {usuario.rol === "administrador"
                      ? "Todos los permisos"
                      : usuario.permisos && usuario.permisos.length > 0
                        ? usuario.permisos.join(", ")
                        : "Sin permisos asignados"}
                  </p>
                </div>

                <div className="usuario-sistema-acciones">
                  {usuario.rol !== "administrador" && (
                    <button
                      onClick={() => abrirGestionPermisos(usuario)}
                      className="button button-edit"
                      style={{ fontSize: "12px", padding: "6px 12px", marginRight: "0.5rem" }}
                    >
                      Gestionar Permisos
                    </button>
                  )}
                  <button
                    onClick={() => eliminarUsuarioDelSistema(usuario.id, usuario.nombre)}
                    className="button button-delete"
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Información sobre roles */}
      <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
        <h4 style={{ margin: "0 0 1rem 0", color: "#1a73e8" }}>Información sobre permisos:</h4>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div>
            <strong>Administrador:</strong>
            <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem", fontSize: "14px" }}>
              <li>Acceso completo a todas las funciones</li>
              <li>No requiere permisos personalizados</li>
              <li>Puede gestionar otros usuarios</li>
            </ul>
          </div>
          <div>
            <strong>Usuario Estándar:</strong>
            <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem", fontSize: "14px" }}>
              <li>Permisos personalizables por el administrador</li>
              <li>Puede tener permisos específicos como: crear, leer, editar, eliminar usuarios</li>
              <li>Solo accede a las funciones para las que tiene permisos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GestionUsuarios
