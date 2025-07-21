import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './Registro';
import FormularioUsuario from './FormularioUsuario';
import UsuariosList from './UsuariosList';
import './App.css';

function App() {
  const [vista, setVista] = useState('formulario');
  const [autenticado, setAutenticado] = useState(false);
  const [mostrarLogin, setMostrarLogin] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');
    if (token && usuario) {
      setAutenticado(true);
    }
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setAutenticado(false);
    setMostrarLogin(true);
    setVista('formulario');
  };

  const handleLoginSuccess = () => {
    setAutenticado(true);
  };

  const handleRegisterSuccess = () => {
    setMostrarLogin(true);
  };

  if (!autenticado) {
    return (
      <div className="app-auth-container">
        {mostrarLogin ? (
          <LoginForm 
            onLogin={handleLoginSuccess} 
            onShowRegister={() => setMostrarLogin(false)}
          />
        ) : (
          <RegisterForm 
            onRegister={handleRegisterSuccess}
            onShowLogin={() => setMostrarLogin(true)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <button 
          onClick={() => setVista('formulario')} 
          className={`app-header-button ${vista === 'formulario' ? 'active' : ''}`}
        >
          Formulario
        </button>
        <button 
          onClick={() => setVista('lista')} 
          className={`app-header-button ${vista === 'lista' ? 'active' : ''}`}
        >
          Ver Usuarios
        </button>
        <button 
          onClick={cerrarSesion} 
          className="app-header-button logout"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="app-main">
        {vista === 'formulario' ? <FormularioUsuario /> : <UsuariosList />}
      </main>
    </div>
  );
}

export default App;