import React, { useEffect, useState } from 'react';

const UsuariosList = () => {
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3001/usuarios')
      .then(res => res.json())
      .then(data => setUsuarios(data))
      .catch(err => console.error('Error al obtener usuarios:', err));
  }, []);

  return (
    <div className="container">
      <h2 className="title">Lista de Usuarios</h2>
      {usuarios.length === 0 ? (
        <p>No hay usuarios registrados.</p>
      ) : (
        <ul className="usuarios-list">
          {usuarios.map((u) => (
            <li key={u.id} className="usuario-card">
              <img src={u.fotografia} alt={u.nombre} className="usuario-foto" />
              <h3>{u.nombre} {u.apellidos}</h3>
              <p><strong>CURP:</strong> {u.curp}</p>
              <p><strong>Dirección:</strong> {u.direccion}</p>
              <p><strong>Escolaridad:</strong> {u.escolaridad}</p>
              <p><strong>Habilidades:</strong> {u.habilidades.join(', ')}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UsuariosList;
