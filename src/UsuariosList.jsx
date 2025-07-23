"use client"

import { useEffect, useState } from "react"
import EditarUsuario from "./EditarUsuario"

const UsuariosList = () => {
  const [usuarios, setUsuarios] = useState([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroEscolaridad, setFiltroEscolaridad] = useState("")
  const [editandoUsuario, setEditandoUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargarUsuarios = async () => {
    try {
      setCargando(true)
      const response = await fetch("http://localhost:3001/usuarios")
      const data = await response.json()
      setUsuarios(data)
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

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const coincideBusqueda =
      usuario.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      usuario.apellidos.toLowerCase().includes(busqueda.toLowerCase()) ||
      usuario.curp.toLowerCase().includes(busqueda.toLowerCase())

    const coincideEscolaridad = !filtroEscolaridad || usuario.escolaridad === filtroEscolaridad

    return coincideBusqueda && coincideEscolaridad
  })

  const handleEditarUsuario = (usuario) => {
    setEditandoUsuario(usuario)
  }

  const handleCerrarEdicion = () => {
    setEditandoUsuario(null)
  }

  const handleUsuarioActualizado = () => {
    // Recargar la lista de usuarios después de actualizar
    cargarUsuarios()
  }

  const eliminarUsuario = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario ${nombre}?`)) {
      try {
        const response = await fetch(`http://localhost:3001/usuarios/${id}`, {
          method: "DELETE",
        })

        if (response.ok) {
          alert("Usuario eliminado exitosamente")
          cargarUsuarios() // Recargar la lista
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

  if (cargando) {
    return (
      <div className="container">
        <div className="loading">Cargando usuarios...</div>
      </div>
    )
  }

  return (
    <div className="container">
      <h2 className="title">Lista de Usuarios ({usuarios.length})</h2>

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
                  alt={u.nombre}
                  className="usuario-foto"
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
                <button onClick={() => handleEditarUsuario(u)} className="button button-edit">
                   Editar
                </button>
                <button
                  onClick={() => eliminarUsuario(u.id, `${u.nombre} ${u.apellidos}`)}
                  className="button button-delete"
                >
                   Eliminar
                </button>
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
