const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const pool = require("./db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { verificarToken, verificarPermiso, soloAdministrador } = require("./middleware/auth")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(bodyParser.json())

// Crear directorio de uploads si no existe
const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log("Carpeta uploads creada:", uploadsDir)
}

// Servir archivos estáticos desde la carpeta uploads
app.use("/uploads", express.static(uploadsDir))
console.log("Sirviendo archivos estáticos desde:", uploadsDir)

// Configuración de multer para almacenamiento local
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, "usuario-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB límite
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true)
    } else {
      cb(new Error("Solo se permiten archivos JPEG y PNG"))
    }
  },
})

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

// Middleware para logging detallado
app.use((req, res, next) => {
  console.log(`\n${new Date().toISOString()} - ${req.method} ${req.path}`)
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Body:", JSON.stringify(req.body, null, 2))
  }
  next()
})

// ==================== RUTAS PÚBLICAS ====================

// Test de conexión a la base de datos
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as tiempo, 'Conexión exitosa' as mensaje")
    console.log("Test de BD exitoso")
    res.json(result.rows[0])
  } catch (error) {
    console.error("Error de conexión a la BD:", error)
    res.status(500).json({ error: "Error de conexión a la base de datos", detalles: error.message })
  }
})

// Verificar si existe algún administrador en el sistema
app.get("/check-admin", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as total 
      FROM administradores a 
      JOIN roles r ON a.rol_id = r.id 
      WHERE r.nombre = 'administrador'
    `)

    const tieneAdmin = Number.parseInt(result.rows[0].total) > 0

    res.json({
      tieneAdministrador: tieneAdmin,
      mensaje: tieneAdmin ? "Sistema inicializado con administrador" : "Sistema necesita primer administrador",
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Login con información de roles y permisos personalizados
app.post("/login", async (req, res) => {
  const { correo, contrasena } = req.body

  if (!correo || !contrasena) {
    return res.status(400).json({ error: "Correo y contraseña son requeridos" })
  }

  try {
    const result = await pool.query(
      `
      SELECT a.id, a.correo, a.contrasena, a.nombre, r.nombre as rol
      FROM administradores a
      LEFT JOIN roles r ON a.rol_id = r.id
      WHERE a.correo = $1
    `,
      [correo],
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" })
    }

    const usuario = result.rows[0]
    const match = await bcrypt.compare(contrasena, usuario.contrasena)

    if (!match) {
      return res.status(401).json({ error: "Credenciales inválidas" })
    }

    // Obtener permisos usando la función JavaScript
    const permisos = await obtenerPermisosUsuario(usuario.id)

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
      process.env.JWT_SECRET || "secreto_temporal",
      { expiresIn: "8h" },
    )

    res.status(200).json({
      mensaje: "Inicio de sesión exitoso",
      token,
      usuario: {
        id: usuario.id,
        correo: usuario.correo,
        nombre: usuario.nombre,
        rol: usuario.rol,
        permisos: permisos,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Registro inicial (solo si no hay administradores)
app.post("/registro-inicial", async (req, res) => {
  const { nombre, correo, contrasena } = req.body

  if (!correo || !contrasena) {
    return res.status(400).json({ error: "Correo y contraseña requeridos" })
  }

  try {
    // Verificar si ya existe algún administrador
    const adminExistente = await pool.query(`
      SELECT COUNT(*) as total 
      FROM administradores a 
      JOIN roles r ON a.rol_id = r.id 
      WHERE r.nombre = 'administrador'
    `)

    if (Number.parseInt(adminExistente.rows[0].total) > 0) {
      return res.status(403).json({
        error: "Ya existe un administrador en el sistema. Usa el login normal.",
      })
    }

    // Obtener ID del rol administrador
    const rolResult = await pool.query("SELECT id FROM roles WHERE nombre = 'administrador'")
    if (rolResult.rows.length === 0) {
      return res.status(500).json({ error: "Sistema no inicializado. Contacta al desarrollador." })
    }

    const hashed = await bcrypt.hash(contrasena, 10)
    const result = await pool.query(
      `INSERT INTO administradores (nombre, correo, contrasena, rol_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, nombre, correo`,
      [nombre || "Administrador", correo, hashed, rolResult.rows[0].id],
    )

    res.json({
      mensaje: "Primer administrador creado exitosamente",
      administrador: result.rows[0],
    })
  } catch (err) {
    console.error(err)
    if (err.code === "23505") {
      res.status(400).json({ error: "El correo ya está registrado" })
    } else {
      res.status(500).json({ error: "Error al crear administrador" })
    }
  }
})

// Registrar nuevo usuario (solo administradores pueden crear otros)
app.post("/admin/registro", verificarToken, soloAdministrador, async (req, res) => {
  const { nombre, correo, contrasena, rol = "usuario_estandar" } = req.body

  if (!correo || !contrasena) {
    return res.status(400).json({ error: "Correo y contraseña requeridos" })
  }

  try {
    // Verificar que el rol existe
    const rolResult = await pool.query("SELECT id FROM roles WHERE nombre = $1", [rol])
    if (rolResult.rows.length === 0) {
      return res.status(400).json({
        error: "Rol no válido. Roles disponibles: administrador, usuario_estandar",
      })
    }

    const hashed = await bcrypt.hash(contrasena, 10)
    const result = await pool.query(
      `INSERT INTO administradores (nombre, correo, contrasena, rol_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, nombre, correo`,
      [nombre || "Usuario", correo, hashed, rolResult.rows[0].id],
    )

    res.json({
      mensaje: `Usuario con rol '${rol}' registrado exitosamente`,
      usuario: result.rows[0],
    })
  } catch (err) {
    console.error(err)
    if (err.code === "23505") {
      res.status(400).json({ error: "El correo ya está registrado" })
    } else {
      res.status(500).json({ error: "Error al registrar usuario" })
    }
  }
})

// Obtener usuarios del sistema con sus permisos (solo administradores)
app.get("/admin/usuarios", verificarToken, soloAdministrador, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.id, a.nombre, a.correo, r.nombre as rol, a.fecha_creacion
      FROM administradores a
      LEFT JOIN roles r ON a.rol_id = r.id
      ORDER BY a.fecha_creacion DESC
    `)

    // Obtener permisos para cada usuario
    const usuariosConPermisos = await Promise.all(
      result.rows.map(async (usuario) => {
        const permisos = await obtenerPermisosUsuario(usuario.id)
        return {
          ...usuario,
          permisos,
        }
      }),
    )

    res.json(usuariosConPermisos)
  } catch (error) {
    console.error("Error al obtener usuarios del sistema:", error)
    res.status(500).json({ error: "Error al obtener usuarios del sistema" })
  }
})

// Obtener solo los 3 permisos básicos
app.get("/admin/permisos", verificarToken, soloAdministrador, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, descripcion 
      FROM permisos 
      WHERE nombre IN ('usuarios.crear', 'usuarios.editar', 'usuarios.eliminar')
      ORDER BY nombre
    `)

    res.json(result.rows)
  } catch (error) {
    console.error("Error al obtener permisos:", error)
    res.status(500).json({ error: "Error al obtener permisos" })
  }
})

// Asignar permisos personalizados a un usuario
app.post("/admin/usuarios/:id/permisos", verificarToken, soloAdministrador, async (req, res) => {
  const { id } = req.params
  const { permisos } = req.body // Array de IDs de permisos

  if (!Array.isArray(permisos)) {
    return res.status(400).json({ error: "Los permisos deben ser un array" })
  }

  try {
    const client = await pool.connect()
    await client.query("BEGIN")

    // Verificar que el usuario existe
    const usuarioExiste = await client.query("SELECT id FROM administradores WHERE id = $1", [id])
    if (usuarioExiste.rows.length === 0) {
      await client.query("ROLLBACK")
      client.release()
      return res.status(404).json({ error: "Usuario no encontrado" })
    }

    // Eliminar permisos personalizados existentes
    await client.query("DELETE FROM usuario_permisos WHERE usuario_id = $1", [id])

    // Asignar nuevos permisos
    for (const permisoId of permisos) {
      await client.query(
        `INSERT INTO usuario_permisos (usuario_id, permiso_id, asignado_por) 
         VALUES ($1, $2, $3)`,
        [id, permisoId, req.usuario.id],
      )
    }

    await client.query("COMMIT")
    client.release()

    res.json({ mensaje: "Permisos asignados exitosamente" })
  } catch (error) {
    console.error("Error al asignar permisos:", error)
    res.status(500).json({ error: "Error al asignar permisos" })
  }
})

// Obtener permisos personalizados de un usuario (solo los 3 básicos)
app.get("/admin/usuarios/:id/permisos", verificarToken, soloAdministrador, async (req, res) => {
  const { id } = req.params

  try {
    const result = await pool.query(
      `
      SELECT p.id, p.nombre, p.descripcion,
             CASE WHEN up.usuario_id IS NOT NULL THEN true ELSE false END as asignado
      FROM permisos p
      LEFT JOIN usuario_permisos up ON p.id = up.permiso_id AND up.usuario_id = $1
      WHERE p.nombre IN ('usuarios.crear', 'usuarios.editar', 'usuarios.eliminar')
      ORDER BY p.nombre
    `,
      [id],
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Error al obtener permisos del usuario:", error)
    res.status(500).json({ error: "Error al obtener permisos del usuario" })
  }
})

// Eliminar usuario del sistema (solo administradores)
app.delete("/admin/usuarios/:id", verificarToken, soloAdministrador, async (req, res) => {
  const { id } = req.params

  try {
    // No permitir que se elimine a sí mismo
    if (Number.parseInt(id) === req.usuario.id) {
      return res.status(400).json({ error: "No puedes eliminarte a ti mismo" })
    }

    // Verificar que no sea el último administrador
    const adminCount = await pool.query(`
      SELECT COUNT(*) as total 
      FROM administradores a 
      JOIN roles r ON a.rol_id = r.id 
      WHERE r.nombre = 'administrador'
    `)

    const usuarioAEliminar = await pool.query(
      `
      SELECT r.nombre as rol 
      FROM administradores a 
      JOIN roles r ON a.rol_id = r.id 
      WHERE a.id = $1
    `,
      [id],
    )

    if (usuarioAEliminar.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" })
    }

    if (usuarioAEliminar.rows[0].rol === "administrador" && Number.parseInt(adminCount.rows[0].total) <= 1) {
      return res.status(400).json({ error: "No puedes eliminar el último administrador del sistema" })
    }

    await pool.query("DELETE FROM administradores WHERE id = $1", [id])

    res.json({ mensaje: "Usuario eliminado exitosamente" })
  } catch (error) {
    console.error("Error al eliminar usuario del sistema:", error)
    res.status(500).json({ error: "Error al eliminar usuario del sistema" })
  }
})

// ==================== RUTAS PROTEGIDAS ====================

// Obtener información del usuario actual
app.get("/me", verificarToken, async (req, res) => {
  try {
    // Obtener información actualizada del usuario
    const result = await pool.query(
      `
      SELECT a.id, a.nombre, a.correo, r.nombre as rol
      FROM administradores a
      LEFT JOIN roles r ON a.rol_id = r.id
      WHERE a.id = $1
    `,
      [req.usuario.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" })
    }

    const usuario = result.rows[0]
    const permisos = await obtenerPermisosUsuario(usuario.id)

    res.json({
      usuario: {
        ...usuario,
        permisos,
      },
    })
  } catch (error) {
    console.error("Error al obtener información del usuario:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Obtener usuarios - TODOS los usuarios autenticados pueden ver la lista
app.get("/usuarios", verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.curp, u.nombre, u.apellidos, u.direccion, u.fecha_nacimiento,
             u.fotografia, e.nivel AS escolaridad, u.lat, u.lng,
             COALESCE(
               ARRAY_AGG(h.habilidad) FILTER (WHERE h.habilidad IS NOT NULL), 
               ARRAY[]::text[]
             ) AS habilidades
      FROM usuarios u
      LEFT JOIN escolaridades e ON u.escolaridad_id = e.id
      LEFT JOIN usuario_habilidades uh ON u.id = uh.usuario_id
      LEFT JOIN habilidades h ON uh.habilidad_id = h.id
      GROUP BY u.id, e.nivel
      ORDER BY u.id DESC;
    `)

    // Procesar URLs de fotos
    const usuariosConFotos = result.rows.map((usuario) => {
      if (usuario.fotografia) {
        if (usuario.fotografia.startsWith("http")) {
          return usuario
        }
        const baseUrl = `http://localhost:${PORT}`
        usuario.fotografia = `${baseUrl}/uploads/${usuario.fotografia}`

        const rutaArchivo = path.join(uploadsDir, usuario.fotografia.split("/").pop())
        if (!fs.existsSync(rutaArchivo)) {
          console.log(`Archivo no encontrado: ${rutaArchivo}`)
          usuario.fotografia = null
        }
      }
      return usuario
    })

    console.log(`Enviando ${usuariosConFotos.length} usuarios`)
    res.json(usuariosConFotos)
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    res.status(500).json({ error: "Error al obtener usuarios" })
  }
})

// Subir foto (requiere estar autenticado)
app.post("/subir-foto", verificarToken, upload.single("foto"), async (req, res) => {
  console.log("Solicitud de subida de foto recibida")
  console.log("Usuario autenticado:", req.usuario.id)

  if (!req.file) {
    console.log("No se recibió archivo")
    return res.status(400).json({ error: "No se subió ningún archivo" })
  }

  console.log("Archivo recibido:", {
    filename: req.file.filename,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
  })

  const baseUrl = `http://localhost:${PORT}`
  const fotoUrl = `${baseUrl}/uploads/${req.file.filename}`

  console.log("URL generada:", fotoUrl)

  res.status(200).json({
    url: fotoUrl,
    nombreArchivo: req.file.filename,
    mensaje: "Foto subida exitosamente",
  })
})

// Crear usuario (requiere permiso de creación)
app.post("/usuarios", verificarToken, verificarPermiso("usuarios.crear"), async (req, res) => {
  let client

  try {
    client = await pool.connect()
    await client.query("BEGIN")

    const { curp, nombre, apellido, direccion, fechaNacimiento, escolaridad, habilidades, fotoUrl, lat, lng } = req.body

    // Validación básica
    if (!curp || curp.trim().length !== 18) {
      throw new Error("CURP debe tener exactamente 18 caracteres")
    }
    if (!nombre || !nombre.trim()) {
      throw new Error("Nombre es requerido")
    }
    if (!apellido || !apellido.trim()) {
      throw new Error("Apellido es requerido")
    }
    if (!direccion || !direccion.trim()) {
      throw new Error("Dirección es requerida")
    }
    if (!fechaNacimiento) {
      throw new Error("Fecha de nacimiento es requerida")
    }
    if (!escolaridad) {
      throw new Error("Escolaridad es requerida")
    }

    console.log("Validación pasada")

    // Buscar escolaridad
    const escResult = await client.query(`SELECT id FROM escolaridades WHERE nivel = $1`, [escolaridad])
    if (escResult.rows.length === 0) {
      const disponibles = await client.query(`SELECT nivel FROM escolaridades ORDER BY nivel`)
      throw new Error(
        `Escolaridad '${escolaridad}' no válida. Disponibles: ${disponibles.rows.map((r) => r.nivel).join(", ")}`,
      )
    }

    const escolaridadId = escResult.rows[0].id

    // Verificar CURP duplicada
    const existeUsuario = await client.query(`SELECT id FROM usuarios WHERE curp = $1`, [curp.trim()])
    if (existeUsuario.rows.length > 0) {
      throw new Error("Ya existe un usuario con esta CURP")
    }

    // Extraer solo el nombre del archivo de la URL para almacenar en BD
    let nombreArchivo = null
    if (fotoUrl) {
      nombreArchivo = fotoUrl.split("/").pop()
      console.log("Guardando nombre de archivo:", nombreArchivo)
    }

    // Insertar usuario
    const result = await client.query(
      `INSERT INTO usuarios 
        (curp, nombre, apellidos, direccion, fecha_nacimiento, escolaridad_id, fotografia, lat, lng) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, nombre, apellidos, curp`,
      [
        curp.trim(),
        nombre.trim(),
        apellido.trim(),
        direccion.trim(),
        fechaNacimiento,
        escolaridadId,
        nombreArchivo,
        lat || null,
        lng || null,
      ],
    )

    const nuevoUsuarioId = result.rows[0].id

    // Insertar habilidades si existen
    if (Array.isArray(habilidades) && habilidades.length > 0) {
      for (const habilidad of habilidades) {
        if (habilidad && habilidad.trim()) {
          await client.query(`INSERT INTO habilidades (habilidad) VALUES ($1) ON CONFLICT (habilidad) DO NOTHING`, [
            habilidad.trim(),
          ])

          const habilidadResult = await client.query(`SELECT id FROM habilidades WHERE habilidad = $1`, [
            habilidad.trim(),
          ])

          if (habilidadResult.rows.length > 0) {
            await client.query(
              `INSERT INTO usuario_habilidades (usuario_id, habilidad_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [nuevoUsuarioId, habilidadResult.rows[0].id],
            )
          }
        }
      }
    }

    await client.query("COMMIT")

    res.status(201).json({
      mensaje: "Usuario registrado exitosamente",
      id: nuevoUsuarioId,
      usuario: result.rows[0],
    })
  } catch (error) {
    if (client) await client.query("ROLLBACK")
    res.status(500).json({ error: error.message || "Error interno del servidor" })
  } finally {
    if (client) client.release()
  }
})

// Actualizar usuario (requiere permiso de edición)
app.put("/usuarios/:id", verificarToken, verificarPermiso("usuarios.editar"), async (req, res) => {
  const { id } = req.params
  const { curp, nombre, apellido, direccion, fechaNacimiento, escolaridad, habilidades, fotoUrl, lat, lng } = req.body

  let client

  try {
    client = await pool.connect()
    await client.query("BEGIN")

    // Validaciones
    if (!curp || curp.trim().length !== 18) {
      throw new Error("CURP debe tener exactamente 18 caracteres")
    }

    const usuarioExiste = await client.query("SELECT id FROM usuarios WHERE id = $1", [id])
    if (usuarioExiste.rows.length === 0) {
      throw new Error("Usuario no encontrado")
    }

    const curpDuplicada = await client.query("SELECT id FROM usuarios WHERE curp = $1 AND id != $2", [curp.trim(), id])
    if (curpDuplicada.rows.length > 0) {
      throw new Error("Ya existe otro usuario con esta CURP")
    }

    const escResult = await client.query("SELECT id FROM escolaridades WHERE nivel = $1", [escolaridad])
    if (escResult.rows.length === 0) {
      throw new Error(`Escolaridad '${escolaridad}' no válida`)
    }

    const escolaridadId = escResult.rows[0].id

    // Extraer nombre del archivo de la URL
    let nombreArchivo = null
    if (fotoUrl) {
      nombreArchivo = fotoUrl.split("/").pop()
    }

    // Actualizar usuario
    await client.query(
      `UPDATE usuarios SET 
        curp = $1, nombre = $2, apellidos = $3, direccion = $4, 
        fecha_nacimiento = $5, escolaridad_id = $6, fotografia = $7, lat = $8, lng = $9
       WHERE id = $10`,
      [
        curp.trim(),
        nombre.trim(),
        apellido.trim(),
        direccion.trim(),
        fechaNacimiento,
        escolaridadId,
        nombreArchivo,
        lat,
        lng,
        id,
      ],
    )

    // Actualizar habilidades
    await client.query("DELETE FROM usuario_habilidades WHERE usuario_id = $1", [id])

    if (Array.isArray(habilidades) && habilidades.length > 0) {
      for (const habilidad of habilidades) {
        if (habilidad && habilidad.trim()) {
          await client.query("INSERT INTO habilidades (habilidad) VALUES ($1) ON CONFLICT (habilidad) DO NOTHING", [
            habilidad.trim(),
          ])

          const habilidadResult = await client.query("SELECT id FROM habilidades WHERE habilidad = $1", [
            habilidad.trim(),
          ])
          if (habilidadResult.rows.length > 0) {
            await client.query("INSERT INTO usuario_habilidades (usuario_id, habilidad_id) VALUES ($1, $2)", [
              id,
              habilidadResult.rows[0].id,
            ])
          }
        }
      }
    }

    await client.query("COMMIT")
    res.json({ mensaje: "Usuario actualizado exitosamente" })
  } catch (error) {
    if (client) await client.query("ROLLBACK")
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// Eliminar usuario (requiere permiso de eliminación)
app.delete("/usuarios/:id", verificarToken, verificarPermiso("usuarios.eliminar"), async (req, res) => {
  const { id } = req.params
  let client

  try {
    client = await pool.connect()
    await client.query("BEGIN")

    // Obtener información del usuario antes de eliminarlo
    const usuarioResult = await client.query("SELECT fotografia FROM usuarios WHERE id = $1", [id])
    if (usuarioResult.rows.length === 0) {
      throw new Error("Usuario no encontrado")
    }

    const usuario = usuarioResult.rows[0]

    // Eliminar relaciones de habilidades
    await client.query("DELETE FROM usuario_habilidades WHERE usuario_id = $1", [id])

    // Eliminar usuario
    await client.query("DELETE FROM usuarios WHERE id = $1", [id])

    // Eliminar archivo de foto si existe
    if (usuario.fotografia) {
      const fotoPath = path.join(uploadsDir, usuario.fotografia)
      if (fs.existsSync(fotoPath)) {
        fs.unlinkSync(fotoPath)
        console.log("Foto eliminada:", usuario.fotografia)
      }
    }

    await client.query("COMMIT")
    res.json({ mensaje: "Usuario eliminado exitosamente" })
  } catch (error) {
    if (client) await client.query("ROLLBACK")
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// Endpoint para debug (solo administradores)
app.get("/debug-fotos", verificarToken, soloAdministrador, async (req, res) => {
  try {
    const archivos = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []
    const usuarios = await pool.query("SELECT id, nombre, apellidos, fotografia FROM usuarios")

    res.json({
      uploadsDir,
      archivosEnDisco: archivos,
      usuariosEnBD: usuarios.rows,
      baseUrl: `http://localhost:${PORT}`,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`)
  console.log(`Test de BD: http://localhost:${PORT}/test-db`)
  console.log(`Debug fotos: http://localhost:${PORT}/debug-fotos`)
  console.log(`Carpeta de uploads: ${uploadsDir}`)
})
