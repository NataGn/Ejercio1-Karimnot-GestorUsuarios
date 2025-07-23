"use client"

import { useState } from "react"

const RegistroInicial = ({ onRegistroExitoso }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    contrasena: "",
  })
  const [mensaje, setMensaje] = useState("")
  const [cargando, setCargando] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Limpiar mensaje cuando el usuario empiece a escribir
    if (mensaje) setMensaje("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nombre || !formData.correo || !formData.contrasena) {
      setMensaje("Todos los campos son requeridos")
      return
    }

    if (formData.contrasena.length < 6) {
      setMensaje("La contraseña debe tener al menos 6 caracteres")
      return
    }

    try {
      setCargando(true)
      setMensaje("Creando primer administrador...")

      const res = await fetch("http://localhost:3001/registro-inicial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre,
          correo: formData.correo,
          contrasena: formData.contrasena,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setMensaje("Primer administrador creado exitosamente! Redirigiendo al login...")
        setTimeout(() => {
          if (onRegistroExitoso) onRegistroExitoso()
        }, 2000)
      } else {
        setMensaje(`Error: ${data.error || "Error en el registro"}`)
      }
    } catch (err) {
      console.error("Error en registro inicial:", err)
      setMensaje("Error de conexión con el servidor")
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth-container">
      <h2>Configuración Inicial del Sistema</h2>
      <p style={{ marginBottom: "1rem", color: "#5f6368", fontSize: "14px", textAlign: "center" }}>
        El sistema no tiene administradores registrados.
        <br />
        Crea el primer administrador para comenzar a usar el sistema.
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="nombre"
          placeholder="Nombre completo del administrador"
          value={formData.nombre}
          onChange={handleChange}
          required
          disabled={cargando}
        />
        <input
          type="email"
          name="correo"
          placeholder="Correo electrónico"
          value={formData.correo}
          onChange={handleChange}
          required
          disabled={cargando}
        />
        <input
          type="password"
          name="contrasena"
          placeholder="Contraseña (mínimo 6 caracteres)"
          value={formData.contrasena}
          onChange={handleChange}
          required
          minLength={6}
          disabled={cargando}
        />
        <button type="submit" disabled={cargando}>
          {cargando ? "Creando..." : "Crear Primer Administrador"}
        </button>
      </form>

      {mensaje && <div className={`auth-message ${mensaje.includes("✅") ? "success" : "error"}`}>{mensaje}</div>}

      <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
        <h4 style={{ margin: "0 0 0.5rem 0", color: "#1a73e8" }}>Este administrador podrá:</h4>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "13px", color: "#5f6368" }}>
          <li>Acceder a todas las funciones del sistema</li>
          <li>Crear, editar y eliminar usuarios</li>
          <li>Crear más administradores y usuarios estándar</li>
          <li> Gestionar el sistema completo</li>
        </ul>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "12px", color: "#d93025" }}>
          Guarda estas credenciales en un lugar seguro
        </p>
      </div>
    </div>
  )
}

export default RegistroInicial
