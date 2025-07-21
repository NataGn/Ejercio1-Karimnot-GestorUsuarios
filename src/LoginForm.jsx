import React, { useState } from "react";

const LoginForm = ({ onLogin, onShowRegister }) => {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, contrasena }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("usuario", JSON.stringify(data.usuario));
        setMensaje("Inicio de sesión exitoso");
        onLogin(); 
      } else {
        setMensaje(data.error || "Credenciales incorrectas");
      }
    } catch (error) {
      setMensaje("Error de conexión con el servidor");
    }
  };

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
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
        />
        <button type="submit">Iniciar sesión</button>
      </form>
      
      <p className="auth-change">
        ¿No tienes cuenta?{" "}
        <span onClick={onShowRegister}>Regístrate aquí</span>
      </p>
      
      {mensaje && <p className={`auth-message ${mensaje.includes("éxito") ? "success" : "error"}`}>
        {mensaje}
      </p>}
    </div>
  );
};

export default LoginForm;