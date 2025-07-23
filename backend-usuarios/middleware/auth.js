const jwt = require("jsonwebtoken")
const pool = require("../db")

// Función para obtener permisos de usuario
const obtenerPermisosUsuario = async (userId) => {
  try {
    // Obtener permisos del rol
    const permisosRol = await pool.query(
      `
      SELECT ARRAY_AGG(p.nombre) as permisos
      FROM administradores a
      JOIN roles r ON a.rol_id = r.id
      JOIN rol_permisos rp ON r.id = rp.rol_id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE a.id = $1
    `,
      [userId],
    )

    // Obtener permisos personalizados
    const permisosPersonalizados = await pool.query(
      `
      SELECT ARRAY_AGG(p.nombre) as permisos
      FROM usuario_permisos up
      JOIN permisos p ON up.permiso_id = p.id
      WHERE up.usuario_id = $1
    `,
      [userId],
    )

    // Combinar permisos
    const permisosDelRol = permisosRol.rows[0]?.permisos || []
    const permisosPersonales = permisosPersonalizados.rows[0]?.permisos || []

    // Crear un Set para eliminar duplicados y luego convertir a array
    const todosLosPermisos = [...new Set([...permisosDelRol, ...permisosPersonales])]

    return todosLosPermisos.filter((permiso) => permiso !== null)
  } catch (error) {
    console.error("Error obteniendo permisos:", error)
    return []
  }
}

// Middleware para verificar token JWT
const verificarToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secreto_temporal")

    // Obtener información completa del usuario incluyendo rol
    const result = await pool.query(
      `
      SELECT a.id, a.nombre, a.correo, r.nombre as rol
      FROM administradores a
      LEFT JOIN roles r ON a.rol_id = r.id
      WHERE a.id = $1
    `,
      [decoded.id],
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" })
    }

    const usuario = result.rows[0]
    const permisos = await obtenerPermisosUsuario(usuario.id)

    req.usuario = {
      ...usuario,
      permisos,
    }

    next()
  } catch (error) {
    console.error("Error en verificación de token:", error)
    return res.status(401).json({ error: "Token inválido" })
  }
}

// Middleware para verificar permisos específicos
const verificarPermiso = (permisoRequerido) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: "Usuario no autenticado" })
    }

    const { permisos, rol } = req.usuario

    // Los administradores tienen todos los permisos
    if (rol === "administrador") {
      return next()
    }

    // Verificar si el usuario tiene el permiso específico
    if (!permisos || !permisos.includes(permisoRequerido)) {
      return res.status(403).json({
        error: "No tienes permisos para realizar esta acción",
        permisoRequerido,
        permisosActuales: permisos,
      })
    }

    next()
  }
}

// Middleware para verificar si es administrador
const soloAdministrador = (req, res, next) => {
  if (!req.usuario || req.usuario.rol !== "administrador") {
    return res.status(403).json({ error: "Solo administradores pueden acceder" })
  }
  next()
}

module.exports = {
  verificarToken,
  verificarPermiso,
  soloAdministrador,
}
