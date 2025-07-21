"use client"

import { useState } from "react"

const RegisterForm = ({ onRegister, onShowLogin }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    contrasena: "",
  })
  const [mensaje, setMensaje] = useState("")

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nombre || !formData.correo || !formData.contrasena) {
      setMensaje("Todos los campos son requeridos")
      return
    }

    try {
      const res = await fetch("http://localhost:3001/admin/registro", {
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
        setMensaje("Registro exitoso! Por favor inicia sesión.")
        if (onRegister) onRegister()
      } else {
        setMensaje(data.error || "Error en el registro")
      }
    } catch (err) {
      setMensaje("Error de conexión con el servidor")
    }
  }

  return (
    <div className="auth-container">
      <h2>Crear cuenta</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="nombre"
          placeholder="Nombre completo"
          value={formData.nombre}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="correo"
          placeholder="Correo electrónico"
          value={formData.correo}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="contrasena"
          placeholder="Contraseña"
          value={formData.contrasena}
          onChange={handleChange}
          required
        />
        <button type="submit">Registrarse</button>
      </form>

      <p className="auth-change">
        ¿Ya tienes cuenta? <span onClick={onShowLogin}>Inicia sesión aquí</span>
      </p>

      {mensaje && <p className={`auth-message ${mensaje.includes("éxito") ? "success" : "error"}`}>{mensaje}</p>}
    </div>
  )
}

export default RegisterForm
