-- Actualizar la tabla usuarios para hacer correo y contraseña opcionales
-- ya que el formulario no los incluye los tuve que quitar porque no me dejaba insertar usuarios sin ellos

ALTER TABLE usuarios 
ALTER COLUMN correo DROP NOT NULL,
ALTER COLUMN contrasena DROP NOT NULL;

-- Verificar la estructura actualizada
\d usuarios;

-- Mostrar confirmación
SELECT 'Tabla usuarios actualizada - correo y contraseña ahora son opcionales' as mensaje;
