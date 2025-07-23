const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const AWS = require("aws-sdk")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const pool = require("./db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(bodyParser.json())

// Crear directorio de uploads si no existe
const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Servir archivos estáticos desde la carpeta uploads
app.use("/uploads", express.static(uploadsDir))

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

// Middleware para logging detallado
app.use((req, res, next) => {
  console.log(`\n ${new Date().toISOString()} - ${req.method} ${req.path}`)
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(" Body:", JSON.stringify(req.body, null, 2))
  }
  next()
})

// Test de conexión a la base de datos
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as tiempo, 'Conexión exitosa' as mensaje")
    console.log("Test de BD exitoso")
    res.json(result.rows[0])
  } catch (error) {
    console.error(" Error de conexión a la BD:", error)
    res.status(500).json({ error: "Error de conexión a la base de datos", detalles: error.message })
  }
})

// Subir imagen con almacenamiento local persistente
app.post("/subir-foto", upload.single("foto"), async (req, res) => {
  console.log("📸 Solicitud de subida de foto recibida")

  if (!req.file) {
    return res.status(400).json({ error: "No se subió ningún archivo" })
  }


  // Generar URL local accesible
  const baseUrl = `http://localhost:${PORT}`
  const fotoUrl = `${baseUrl}/uploads/${req.file.filename}`

  console.log("🔗 URL generada:", fotoUrl)

  res.status(200).json({
    url: fotoUrl,
    nombreArchivo: req.file.filename,
    mensaje: "Foto subida exitosamente",
  })
})

// Obtener usuarios con URLs de fotos corregidas
app.get("/usuarios", async (req, res) => {
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
        // Si la URL ya es completa, mantenerla
        if (usuario.fotografia.startsWith("http")) {
          return usuario
        }
        // Si es solo el nombre del archivo, generar URL completa
        const baseUrl = `http://localhost:${PORT}`
        usuario.fotografia = `${baseUrl}/uploads/${usuario.fotografia}`
      }
      return usuario
    })

    res.json(usuariosConFotos)
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    res.status(500).json({ error: "Error al obtener usuarios" })
  }
})

// Guardar usuario con manejo mejorado de fotos
app.post("/usuarios", async (req, res) => {
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
      nombreArchivo = fotoUrl.split("/").pop() // Obtener solo el nombre del archivo
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

// Actualizar usuario
app.put("/usuarios/:id", async (req, res) => {
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

// Eliminar usuario
app.delete("/usuarios/:id", async (req, res) => {
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
        console.log("🗑️ Foto eliminada:", usuario.fotografia)
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

// Login
app.post("/login", async (req, res) => {
  const { correo, contrasena } = req.body

  if (!correo || !contrasena) {
    return res.status(400).json({ error: "Correo y contraseña son requeridos" })
  }

  try {
    const result = await pool.query(
      `SELECT id, correo, contrasena, nombre, 'admin' as tipo FROM administradores WHERE correo = $1`,
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

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, tipo: usuario.tipo },
      process.env.JWT_SECRET || "secreto_temporal",
      { expiresIn: "2h" },
    )

    res.status(200).json({
      mensaje: "Inicio de sesión exitoso",
      token,
      usuario: {
        id: usuario.id,
        correo: usuario.correo,
        nombre: usuario.nombre,
        tipo: usuario.tipo,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Registrar nuevo administrador
app.post("/admin/registro", async (req, res) => {
  const { nombre, correo, contrasena } = req.body

  if (!correo || !contrasena) {
    return res.status(400).json({ error: "Correo y contraseña requeridos" })
  }

  const hashed = await bcrypt.hash(contrasena, 10)
  try {
    await pool.query(`INSERT INTO administradores (nombre, correo, contrasena) VALUES ($1, $2, $3)`, [
      nombre || "Admin",
      correo,
      hashed,
    ])
    res.json({ mensaje: "Administrador registrado exitosamente" })
  } catch (err) {
    console.error(err)
    if (err.code === "23505") {
      res.status(400).json({ error: "El correo ya está registrado" })
    } else {
      res.status(500).json({ error: "Error al registrar administrador" })
    }
  }
})

app.listen(PORT, () => {
  console.log(` Servidor escuchando en http://localhost:${PORT}`)
  console.log(` Test de BD: http://localhost:${PORT}/test-db`)
  console.log(` Carpeta de uploads: ${uploadsDir}`)
})
