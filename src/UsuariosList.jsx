"use client"

import { useEffect, useState } from "react"
import EditarUsuario from "./EditarUsuario"

const UsuariosList = ({ usuario }) => {
  const [usuarios, setUsuarios] = useState([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroEscolaridad, setFiltroEscolaridad] = useState("")
  const [editandoUsuario, setEditandoUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Verificar permisos
  const tienePermiso = (permiso) => {
    if (!usuario) return false
    if (usuario.rol === "administrador") return true
    return usuario.permisos && usuario.permisos.includes(permiso)
  }

  const cargarUsuarios = async () => {
    try {
      setCargando(true)
      const token = localStorage.getItem("token")
      if (!token) {
        alert("No hay token de autenticación. Por favor inicia sesión nuevamente.")
        return
      }

      const response = await fetch("http://localhost:3001/usuarios", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        alert("Tu sesión ha expirado. Por favor inicia sesión nuevamente.")
        localStorage.removeItem("token")
        localStorage.removeItem("usuario")
        window.location.reload()
        return
      }

      if (response.ok) {
        const data = await response.json()
        console.log("Usuarios cargados:", data)
        setUsuarios(data)
      } else {
        console.error("Error al cargar usuarios:", response.status)
      }
    } catch (err) {
      console.error("Error al obtener usuarios:", err)
      alert("Error al cargar usuarios")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const usuariosFiltrados = usuarios.filter((u) => {
    const coincideBusqueda =
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.apellidos.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.curp.toLowerCase().includes(busqueda.toLowerCase())

    const coincideEscolaridad = !filtroEscolaridad || u.escolaridad === filtroEscolaridad

    return coincideBusqueda && coincideEscolaridad
  })

  const handleEditarUsuario = (u) => {
    if (!tienePermiso("usuarios.editar")) {
      alert("No tienes permisos para editar usuarios")
      return
    }
    setEditandoUsuario(u)
  }

  const handleCerrarEdicion = () => {
    setEditandoUsuario(null)
  }

  const handleUsuarioActualizado = () => {
    cargarUsuarios()
  }

  const eliminarUsuario = async (id, nombre) => {
    if (!tienePermiso("usuarios.eliminar")) {
      alert("No tienes permisos para eliminar usuarios")
      return
    }

    if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario ${nombre}?`)) {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`http://localhost:3001/usuarios/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.status === 403) {
          alert("No tienes permisos para eliminar usuarios")
          return
        }

        if (response.ok) {
          alert("Usuario eliminado exitosamente")
          cargarUsuarios()
        } else {
          const error = await response.json()
          alert(`Error al eliminar usuario: ${error.error}`)
        }
      } catch (err) {
        console.error("Error al eliminar usuario:", err)
        alert("Error de conexión al eliminar usuario")
      }
    }
  }

  // Función para manejar errores de carga de imagen
  const handleImageError = (e) => {
    console.log("Error cargando imagen:", e.target.src)
    e.target.src = "/placeholder.svg?height=80&width=80"
  }

  // Función para verificar si la imagen se carga correctamente
  const handleImageLoad = (e) => {
    console.log("Imagen cargada correctamente:", e.target.src)
  }

  if (cargando) {
    return (
      <div className="container">
        <div className="loading">Cargando usuarios...</div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header-with-role">
        <h2 className="title">Lista de Usuarios ({usuarios.length})</h2>
        <div className="role-indicator">
          <span className={`role-badge ${usuario.rol}`}>
            {usuario.rol === "administrador" ? "Administrador" : "Usuario Estándar"}
          </span>
        </div>
      </div>

      <div className="filtros-container" style={{ marginBottom: "2rem" }}>
        <input
          type="text"
          placeholder="Buscar por nombre, apellidos o CURP..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input"
          style={{ marginBottom: "1rem" }}
        />

        <select value={filtroEscolaridad} onChange={(e) => setFiltroEscolaridad(e.target.value)} className="input">
          <option value="">Todas las escolaridades</option>
          <option value="Primaria">Primaria</option>
          <option value="Secundaria">Secundaria</option>
          <option value="Preparatoria">Preparatoria</option>
          <option value="Universidad">Universidad</option>
        </select>
      </div>

      {usuariosFiltrados.length === 0 ? (
        <div className="no-results">
          {busqueda || filtroEscolaridad ? (
            <p>No se encontraron usuarios que coincidan con los filtros.</p>
          ) : (
            <p>No hay usuarios registrados.</p>
          )}
        </div>
      ) : (
        <div className="usuarios-grid">
          {usuariosFiltrados.map((u) => (
            <div key={u.id} className="usuario-card">
              <div className="usuario-foto-container">
                <img
                  src={u.fotografia || "/placeholder.svg?height=80&width=80&query=usuario"}
                  alt={`Foto de ${u.nombre}`}
                  className="usuario-foto"
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                />
              </div>

              <div className="usuario-info">
                <h3 className="usuario-nombre">
                  {u.nombre} {u.apellidos}
                </h3>
                <p className="usuario-detalle">
                  <strong>CURP:</strong> {u.curp}
                </p>
                <p className="usuario-detalle">
                  <strong>Dirección:</strong> {u.direccion}
                </p>
                <p className="usuario-detalle">
                  <strong>Escolaridad:</strong> {u.escolaridad}
                </p>
                <p className="usuario-detalle">
                  <strong>Habilidades:</strong>{" "}
                  {u.habilidades && u.habilidades.length > 0 ? u.habilidades.join(", ") : "Sin habilidades"}
                </p>
              </div>

              <div className="usuario-acciones">
                {/* Mostrar botones solo si tiene permisos */}
                {tienePermiso("usuarios.editar") && (
                  <button onClick={() => handleEditarUsuario(u)} className="button button-edit">
                    Editar
                  </button>
                )}
                {tienePermiso("usuarios.eliminar") && (
                  <button
                    onClick={() => eliminarUsuario(u.id, `${u.nombre} ${u.apellidos}`)}
                    className="button button-delete"
                  >
                    Eliminar
                  </button>
                )}
                {!tienePermiso("usuarios.editar") && !tienePermiso("usuarios.eliminar") && (
                  <span className="no-actions">Solo lectura</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edición */}
      {editandoUsuario && (
        <EditarUsuario
          usuario={editandoUsuario}
          onClose={handleCerrarEdicion}
          onUsuarioActualizado={handleUsuarioActualizado}
        />
      )}
    </div>
  )
}

export default UsuariosList
