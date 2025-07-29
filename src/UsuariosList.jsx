"use client"

import { useEffect, useState } from "react"
import EditarUsuario from "./EditarUsuario"

const UsuariosList = ({ usuario }) => {
  const [usuarios, setUsuarios] = useState([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroEscolaridad, setFiltroEscolaridad] = useState("")
  const [editandoUsuario, setEditandoUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [ordenamiento, setOrdenamiento] = useState({ campo: null, direccion: "asc" })

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

  // Función para ordenar usuarios
  const ordenarUsuarios = (campo) => {
    const nuevaDireccion = ordenamiento.campo === campo && ordenamiento.direccion === "asc" ? "desc" : "asc"
    setOrdenamiento({ campo, direccion: nuevaDireccion })
  }

  // Aplicar filtros y ordenamiento
  const usuariosProcesados = usuarios
    .filter((u) => {
      const coincideBusqueda =
        u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.apellidos.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.curp.toLowerCase().includes(busqueda.toLowerCase())

      const coincideEscolaridad = !filtroEscolaridad || u.escolaridad === filtroEscolaridad

      return coincideBusqueda && coincideEscolaridad
    })
    .sort((a, b) => {
      if (!ordenamiento.campo) return 0

      let valorA, valorB

      switch (ordenamiento.campo) {
        case "numero":
          valorA = a.id
          valorB = b.id
          break
        case "curp":
          valorA = a.curp
          valorB = b.curp
          break
        case "nombre":
          valorA = `${a.nombre} ${a.apellidos}`
          valorB = `${b.nombre} ${b.apellidos}`
          break
        case "fecha":
          valorA = new Date(a.fecha_nacimiento)
          valorB = new Date(b.fecha_nacimiento)
          break
        case "escolaridad":
          // Orden específico para escolaridad
          const ordenEscolaridad = { Primaria: 1, Secundaria: 2, Preparatoria: 3, Universidad: 4 }
          valorA = ordenEscolaridad[a.escolaridad] || 0
          valorB = ordenEscolaridad[b.escolaridad] || 0
          break
        case "direccion":
          valorA = a.direccion
          valorB = b.direccion
          break
        case "habilidades":
          valorA = a.habilidades && a.habilidades.length > 0 ? a.habilidades.join(", ") : ""
          valorB = b.habilidades && b.habilidades.length > 0 ? b.habilidades.join(", ") : ""
          break
        default:
          return 0
      }

      if (valorA < valorB) return ordenamiento.direccion === "asc" ? -1 : 1
      if (valorA > valorB) return ordenamiento.direccion === "asc" ? 1 : -1
      return 0
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

  const handleImageError = (e) => {
    console.log("Error cargando imagen:", e.target.src)
    e.target.src = "/placeholder.svg?height=80&width=80"
  }

  const handleImageLoad = (e) => {
    console.log("Imagen cargada correctamente:", e.target.src)
  }

  // Función para obtener el icono de ordenamiento
  const getIconoOrdenamiento = (campo) => {
    if (ordenamiento.campo !== campo) return "↕"
    return ordenamiento.direccion === "asc" ? "" : ""
  }

  if (cargando) {
    return (
      <div className="container-full">
        <div className="loading">Cargando usuarios...</div>
      </div>
    )
  }

  return (
    <div className="container-full">
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

      {usuariosProcesados.length === 0 ? (
        <div className="no-results">
          {busqueda || filtroEscolaridad ? (
            <p>No se encontraron usuarios que coincidan con los filtros.</p>
          ) : (
            <p>No hay usuarios registrados.</p>
          )}
        </div>
      ) : (
        <div className="tabla-container">
          <table className="usuarios-tabla">
            <thead>
              <tr>
                <th className="th-ordenable" onClick={() => ordenarUsuarios("numero")} title="Ordenar por número">
                  # {getIconoOrdenamiento("numero")}
                </th>
                <th>Foto</th>
                <th className="th-ordenable" onClick={() => ordenarUsuarios("curp")} title="Ordenar por CURP">
                  CURP {getIconoOrdenamiento("curp")}
                </th>
                <th className="th-ordenable" onClick={() => ordenarUsuarios("nombre")} title="Ordenar por nombre">
                  Nombre Completo {getIconoOrdenamiento("nombre")}
                </th>
                <th
                  className="th-ordenable"
                  onClick={() => ordenarUsuarios("fecha")}
                  title="Ordenar por fecha de nacimiento"
                >
                  Fecha Nacimiento {getIconoOrdenamiento("fecha")}
                </th>
                <th
                  className="th-ordenable"
                  onClick={() => ordenarUsuarios("escolaridad")}
                  title="Ordenar por escolaridad"
                >
                  Escolaridad {getIconoOrdenamiento("escolaridad")}
                </th>
                <th className="th-ordenable" onClick={() => ordenarUsuarios("direccion")} title="Ordenar por dirección">
                  Dirección {getIconoOrdenamiento("direccion")}
                </th>
                <th
                  className="th-ordenable"
                  onClick={() => ordenarUsuarios("habilidades")}
                  title="Ordenar por habilidades"
                >
                  Habilidades {getIconoOrdenamiento("habilidades")}
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosProcesados.map((u, index) => (
                <tr key={u.id}>
                  <td className="numero-cell">{index + 1}</td>
                  <td>
                    <img
                      src={u.fotografia || "/placeholder.svg?height=50&width=50&query=usuario"}
                      alt={`Foto de ${u.nombre}`}
                      className="tabla-foto"
                      onError={handleImageError}
                      onLoad={handleImageLoad}
                    />
                  </td>
                  <td className="curp-cell">{u.curp}</td>
                  <td className="nombre-cell">
                    {u.nombre} {u.apellidos}
                  </td>
                  <td>{new Date(u.fecha_nacimiento).toLocaleDateString("es-ES")}</td>
                  <td>
                    <span className={`escolaridad-badge escolaridad-${u.escolaridad?.toLowerCase()}`}>
                      {u.escolaridad}
                    </span>
                  </td>
                  <td className="direccion-cell" title={u.direccion}>
                    {u.direccion}
                  </td>
                  <td
                    className="habilidades-cell"
                    title={u.habilidades && u.habilidades.length > 0 ? u.habilidades.join(", ") : "Sin habilidades"}
                  >
                    {u.habilidades && u.habilidades.length > 0 ? u.habilidades.join(", ") : "Sin habilidades"}
                  </td>
                  <td>
                    <div className="acciones-tabla">
                      {tienePermiso("usuarios.editar") && (
                        <button onClick={() => handleEditarUsuario(u)} className="button button-edit tabla-btn">
                          Editar
                        </button>
                      )}
                      {tienePermiso("usuarios.eliminar") && (
                        <button
                          onClick={() => eliminarUsuario(u.id, `${u.nombre} ${u.apellidos}`)}
                          className="button button-delete tabla-btn"
                        >
                          Eliminar
                        </button>
                      )}
                      {!tienePermiso("usuarios.editar") && !tienePermiso("usuarios.eliminar") && (
                        <span className="no-actions">Solo lectura</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
