
-- 1. Tabla escolaridades
CREATE TABLE escolaridades (
    id SERIAL PRIMARY KEY,
    nivel VARCHAR(50) UNIQUE NOT NULL
);

-- 2. Tabla habilidades
CREATE TABLE habilidades (
    id SERIAL PRIMARY KEY,
    habilidad VARCHAR(100) UNIQUE NOT NULL
);

--  Tabla usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    curp VARCHAR(18) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    direccion TEXT NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    correo VARCHAR(255),
    contrasena VARCHAR(255),
    escolaridad_id INTEGER REFERENCES escolaridades(id),
    fotografia TEXT  
);

-- 4. Tabla usuario_habilidades (relación N:M)
CREATE TABLE usuario_habilidades (
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    habilidad_id INTEGER REFERENCES habilidades(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, habilidad_id)
);
