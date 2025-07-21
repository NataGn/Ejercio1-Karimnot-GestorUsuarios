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
