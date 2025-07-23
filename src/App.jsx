import { useState, useEffect } from "react"
import LoginForm from "./LoginForm"
import RegistroInicial from "./RegistroInicial"
import FormularioUsuario from "./FormularioUsuario"
import UsuariosList from "./UsuariosList"
import GestionUsuarios from "./GestionUsuarios"
import "./App.css"

function App() {
  const [vista, setVista] = useState("formulario")
  const [autenticado, setAutenticado] = useState(false)
  const [mostrarLogin, setMostrarLogin] = useState(true)
  const [usuario, setUsuario] = useState(null)
  const [necesitaConfiguracion, setNecesitaConfiguracion] = useState(false)
  const [verificandoSistema, setVerificandoSistema] = useState(true)

  // Verificar si el token es válido
  useEffect(() => {
    const verificarToken = async () => {
      const token = localStorage.getItem("token")
      if (!token) return

      try {
        const response = await fetch("http://localhost:3001/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          localStorage.removeItem("token")
          localStorage.removeItem("usuario")
          setAutenticado(false)
          setUsuario(null)
          alert("Tu sesión ha expirado. Por favor inicia sesión nuevamente.")
        } else {
          const data = await response.json()
          setUsuario(data.usuario)
          setAutenticado(true)
        }
      } catch (error) {
        console.error("Error verificando token:", error)
      }
    }

    verificarToken()
  }, [])

  // Verificar si el sistema necesita configuración inicial
  useEffect(() => {
    const verificarSistema = async () => {
      try {
        const response = await fetch("http://localhost:3001/check-admin")
        const data = await response.json()

        if (!data.tieneAdministrador) {
          setNecesitaConfiguracion(true)
        }
      } catch (error) {
        console.error("Error verificando sistema:", error)
      } finally {
        setVerificandoSistema(false)
      }
    }

    verificarSistema()
  }, [])

  // Verificar autenticación existente
  useEffect(() => {
    const token = localStorage.getItem("token")
    const usuarioData = localStorage.getItem("usuario")
    if (token && usuarioData) {
      setAutenticado(true)
      setUsuario(JSON.parse(usuarioData))
    }
  }, [])

  const cerrarSesion = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("usuario")
    setAutenticado(false)
    setMostrarLogin(true)
    setVista("formulario")
    setUsuario(null)
  }

  const handleLoginSuccess = (userData) => {
    setAutenticado(true)
    setUsuario(userData)
  }

  const handleConfiguracionInicial = () => {
    setNecesitaConfiguracion(false)
    setMostrarLogin(true)
  }

  // Verificar permisos
  const tienePermiso = (permiso) => {
    if (!usuario) return false
    if (usuario.rol === "administrador") return true
    return usuario.permisos && usuario.permisos.includes(permiso)
  }

  const esAdministrador = () => {
    return usuario && usuario.rol === "administrador"
  }

  // Mostrar loading mientras verifica el sistema
  if (verificandoSistema) {
    return (
      <div className="app-auth-container">
        <div className="auth-container">
          <h2>Verificando sistema...</h2>
          <p>Espera un momento mientras verificamos la configuración.</p>
        </div>
      </div>
    )
  }

  // Mostrar configuración inicial si no hay administradores
  if (necesitaConfiguracion) {
    return (
      <div className="app-auth-container">
        <RegistroInicial onRegistroExitoso={handleConfiguracionInicial} />
      </div>
    )
  }

  // Mostrar login si no está autenticado
  if (!autenticado) {
    return (
      <div className="app-auth-container">
        <LoginForm onLogin={handleLoginSuccess} />
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="app-header">
        {/* Mostrar formulario solo si puede crear usuarios */}
        {tienePermiso("usuarios.crear") && (
          <button
            onClick={() => setVista("formulario")}
            className={`app-header-button ${vista === "formulario" ? "active" : ""}`}
          >
            Formulario
          </button>
        )}

        {/* Ver usuarios - todos los usuarios autenticados pueden ver */}
        <button onClick={() => setVista("lista")} className={`app-header-button ${vista === "lista" ? "active" : ""}`}>
          Ver Usuarios
        </button>

        {/* Gestión de usuarios (solo administradores) */}
        {esAdministrador() && (
          <button
            onClick={() => setVista("gestion")}
            className={`app-header-button ${vista === "gestion" ? "active" : ""}`}
          >
            Gestión
          </button>
        )}

        {/* Información del usuario */}
        <div className="user-info">
          <span className="user-name">
            {usuario.nombre}
            <span className={`user-role ${usuario.rol}`}>
              ({usuario.rol === "administrador" ? "Administrador" : "Usuario"})
            </span>
          </span>
        </div>

        <button onClick={cerrarSesion} className="app-header-button logout">
          Cerrar sesión
        </button>
      </header>

      <main className="app-main">
        {vista === "formulario" && tienePermiso("usuarios.crear") ? (
          <FormularioUsuario />
        ) : vista === "lista" ? (
          <UsuariosList usuario={usuario} />
        ) : vista === "gestion" && esAdministrador() ? (
          <GestionUsuarios />
        ) : (
          <div className="no-permission">
            <h2>Sin permisos</h2>
            <p>No tienes permisos para acceder a esta sección.</p>
            <p>
              Rol actual: <strong>{usuario.rol}</strong>
            </p>
            <p>
              Permisos: <strong>{usuario.permisos ? usuario.permisos.join(", ") : "Ninguno"}</strong>
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
