# Sistema de Gestión de Usuarios

Sistema web completo para gestión de usuarios con las siguientes características:
- **Frontend**: React.js con interfaz moderna
- **Backend**: Node.js con Express
- **Base de datos**: PostgreSQL
- **Autenticación**: JWT con roles y permisos
- **Funcionalidades**: CRUD de usuarios, gestión de permisos, subida de fotos

Variables de Entorno (.env)

El backend usa variables de entorno para configurar conexión, JWT, AWS, etc.

# Cómo usar el `.env`

1. En la carpeta `backend-usuarios` hay un archivo llamado `.env.ejemplo` que es una plantilla.  
   Copia ese archivo para crear tu `.env` real:

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


## CONFIGURAR BASE DE DATOS

1. Abre consola psql:
   - Windows: "SQL Shell (psql)"
   - Linux/macOS: `psql postgres`

2. Crear base de datos y conectarte:
   CREATE DATABASE usuariosdb;
   \c usuariosdb

3. Ejecutar el script `bd-completo.sql`:
   \i backend-usuarios/scripts/bd-completo.sql

4. Verificar tablas creadas:
   \dt

5. Salir:
   \q


##  CONFIGURAR BACKEND

1. Entra a la carpeta del backend:
   cd backend-usuarios

2. Instala dependencias:
   npm install

3. Configura `.env` basado en `.env.ejemplo`:

DB_HOST=localhost
DB_USER=usuario_app
DB_PASS=tu_password_seguro
DB_NAME=usuariosdb
DB_PORT=5432
JWT_SECRET=clave_secreta_segura
PORT=3001

AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=***
AWS_SECRET_ACCESS_KEY=***
AWS_BUCKET_NAME=***

4. Inicia backend:
   npm run dev

---

##  CONFIGURAR FRONTEND

1. En carpeta raíz del proyecto:
   npm install

2. Iniciar frontend:
   npm start

---

##  ACCESO Y PRUEBAS

1. Abre navegador:
   http://localhost:3000

2. Regístrate como administrador

3. Inicia sesión con tus datos

4. Prueba:
   - Crear usuarios con CURP, foto y habilidades
   - Editar, eliminar
   - Gestionar permisos


## PROBLEMAS COMUNES

- PostgreSQL no arranca → `sudo systemctl status postgresql`
- `.env` incorrecto → revisar credenciales
- Puertos ocupados → cambia en `.env` o `package.json`
- "bcrypt not found" → `npm install bcrypt`




