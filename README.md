# Sistema de Gestión de Usuarios

Sistema de información web para gestionar un listado de usuarios, con autenticación de administrador, validación de direcciones, subida de imágenes a Amazon S3 y base de datos PostgreSQL.

---

Variables de Entorno (.env)

El backend usa variables de entorno para configurar conexión, JWT, AWS, etc.

# Cómo usar el `.env`

1. En la carpeta `backend-usuarios` hay un archivo llamado `.env.example` que es una plantilla.  
   Copia ese archivo para crear tu `.env` real:

   ```bash
   cp backend-usuarios/.env.example backend-usuarios/.env


# Guía de Instalación

# Requisitos Previos

- Node.js:
  Descarga la versión LTS en https://nodejs.org  
  Verifica la instalación con:
  node --version

- PostgreSQL:
  - Windows: https://www.postgresql.org/download/windows/
  - Mac: https://postgresapp.com/
  - Linux (Ubuntu/Debian):
    sudo apt update
    sudo apt install postgresql postgresql-contrib

---

# Configurar la Base de Datos

1. Abre la consola psql:
   - Windows: busca "SQL Shell (psql)"
   - Mac/Linux: abre terminal y ejecuta:
     psql postgres

2. Crea la base de datos y conéctate:
   CREATE DATABASE usuariosdb;
   \c usuariosdb

3. Ejecuta el script para crear tablas y datos iniciales:

   -- Tablas y datos iniciales (escolaridades, administradores, habilidades, usuarios, usuario_habilidades)
   -- + función y trigger para actualizar fecha_actualizacion
   -- + admin por defecto con contraseña en hash bcrypt (admin123)

   -- (Aquí pegar el script completo que tienes para crear las tablas)

4. Verifica las tablas creadas:
   \dt

5. Sal del cliente psql:
   \q

---

# Instalar Dependencias

1. Clona el repositorio y entra en la carpeta:
   git clone git@github.com:NataGn/Sistema-de-Gesti-n-de-Usuarios.git
   cd Sistema-de-Gesti-n-de-Usuarios

2. Instala las dependencias del frontend:
   npm install

3. Instala las dependencias del backend:
   cd backend-usuarios
   npm install
   cd ..

4. Crea y configura tu archivo .env basado en .env.example

---

# Ejecutar la Aplicación

Opción automática (Linux/macOS):
chmod +x scripts/start-everything.sh
./scripts/start-everything.sh

Opción manual:
Terminal 1 (Backend):
cd backend-usuarios
node index.js

Terminal 2 (Frontend):
npm start

---

# Acceso

Abre en el navegador:
http://localhost:3000

Registrate como nuevo usuario y regresas a iniciar sesion con el correo y contraseña agregado

---

# Problemas comunes

- Verifica que PostgreSQL esté corriendo y las credenciales .env sean correctas.
- Si el puerto 3000 está ocupado, cambia el puerto o cierra la app que lo usa.
- npm o psql no reconocidos: revisa instalación y variables PATH.

---
