-- Script completo de instalación del sistema de gestión de usuarios
-- Ejecutar este script en PostgreSQL para configurar toda la base de datos

-- 1. Crear tabla de roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crear tabla de permisos
CREATE TABLE IF NOT EXISTS permisos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Crear tabla de relación roles-permisos
CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id INTEGER REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

-- 4. Crear tabla de administradores
CREATE TABLE IF NOT EXISTS administradores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    correo VARCHAR(255) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    rol_id INTEGER REFERENCES roles(id) DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Crear tabla de escolaridades
CREATE TABLE IF NOT EXISTS escolaridades (
    id SERIAL PRIMARY KEY,
    nivel VARCHAR(50) UNIQUE NOT NULL
);

-- 6. Crear tabla de habilidades
CREATE TABLE IF NOT EXISTS habilidades (
    id SERIAL PRIMARY KEY,
    habilidad VARCHAR(100) UNIQUE NOT NULL
);

-- 7. Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    curp VARCHAR(18) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    direccion TEXT NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    correo VARCHAR(255),
    contrasena VARCHAR(255),
    escolaridad_id INTEGER REFERENCES escolaridades(id),
    fotografia TEXT,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8)
);

-- 8. Crear tabla de relación usuarios-habilidades
CREATE TABLE IF NOT EXISTS usuario_habilidades (
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    habilidad_id INTEGER REFERENCES habilidades(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, habilidad_id)
);

-- 9. Crear tabla de permisos personalizados de usuarios
CREATE TABLE IF NOT EXISTS usuario_permisos (
    usuario_id INTEGER REFERENCES administradores(id) ON DELETE CASCADE,
    permiso_id INTEGER REFERENCES permisos(id) ON DELETE CASCADE,
    asignado_por INTEGER REFERENCES administradores(id),
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, permiso_id)
);

-- Insertar roles básicos
INSERT INTO roles (nombre, descripcion) VALUES 
('administrador', 'Acceso completo al sistema'),
('usuario_estandar', 'Acceso limitado con permisos personalizables')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar permisos básicos
INSERT INTO permisos (nombre, descripcion) VALUES 
('usuarios.crear', 'Crear nuevos usuarios'),
('usuarios.editar', 'Editar usuarios existentes'),
('usuarios.eliminar', 'Eliminar usuarios')
ON CONFLICT (nombre) DO NOTHING;

-- Asignar todos los permisos al rol administrador
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id 
FROM roles r, permisos p 
WHERE r.nombre = 'administrador'
ON CONFLICT DO NOTHING;

-- Insertar escolaridades
INSERT INTO escolaridades (nivel) VALUES 
('Primaria'),
('Secundaria'),
('Preparatoria'),
('Universidad')
ON CONFLICT (nivel) DO NOTHING;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_administradores_correo ON administradores(correo);
CREATE INDEX IF NOT EXISTS idx_usuarios_curp ON usuarios(curp);
CREATE INDEX IF NOT EXISTS idx_usuario_permisos_usuario ON usuario_permisos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_permisos_permiso ON usuario_permisos(permiso_id);
CREATE INDEX IF NOT EXISTS idx_usuario_habilidades_usuario ON usuario_habilidades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_habilidades_habilidad ON usuario_habilidades(habilidad_id);

-- Otorgar permisos a las tablas
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;

SELECT 'Sistema listo para usar. Crear primer administrador desde la aplicación.' as mensaje_final;
