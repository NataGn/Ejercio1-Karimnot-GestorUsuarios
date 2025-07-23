"use client"

import { useState } from "react"

const LoginForm = ({ onLogin, onShowRegister }) => {
  const [correo, setCorreo] = useState("")
  const [contrasena, setContrasena] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)

    try {
      const res = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, contrasena }),
      })

      const data = await res.json()

      if (res.ok) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("usuario", JSON.stringify(data.usuario))
        setMensaje("Inicio de sesión exitoso")

        // Pasar los datos del usuario al callback
        onLogin(data.usuario)
      } else {
        setMensaje(data.error || "Credenciales incorrectas")
      }
    } catch (error) {
      console.error("Error de login:", error)
      setMensaje("Error de conexión con el servidor")
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth-container">
      <h2>Iniciar sesión</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
          disabled={cargando}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
          disabled={cargando}
        />
        <button type="submit" disabled={cargando}>
          {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
        </button>
      </form>

      {mensaje && <p className={`auth-message ${mensaje.includes("éxito") ? "success" : "error"}`}>{mensaje}</p>}

      <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
        <h4 style={{ margin: "0 0 0.5rem 0", color: "#1a73e8" }}>Información:</h4>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "13px", color: "#5f6368" }}>
          <li>Si es la primera vez, el sistema te pedirá crear el primer administrador</li>
          <li>Los administradores pueden crear más usuarios desde el panel de gestión</li>
          <li>Los usuarios estándar solo tienen acceso de lectura</li>
        </ul>
      </div>
    </div>
  )
}

export default LoginForm
