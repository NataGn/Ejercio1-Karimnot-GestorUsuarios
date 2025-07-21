const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const AWS = require("aws-sdk")
const upload = require("./upload")
const pool = require("./db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(bodyParser.json())

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

// Subir imagen con manejo de errores mejorado
app.post("/subir-foto", upload.single("foto"), async (req, res) => {
  console.log("Solicitud de subida de foto recibida")
  const file = req.file
  if (!file) {
    console.log("No se recibió archivo")
    return res.status(400).json({ error: "No se subió ningún archivo" })
  }

  console.log("Archivo recibido:", file.key)

  // Verificar si las credenciales de AWS están configuradas correctamente
  if (!process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === "test_key") {
    console.log("Credenciales de AWS no configuradas, saltando subida a S3")
    return res.status(200).json({
      url: null,
      mensaje: "Foto recibida pero no se pudo subir a S3 (credenciales no configuradas)",
    })
  }

  const s3 = new AWS.S3({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  })

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: file.key,
    Expires: 3600,
  }

  try {
    const url = await s3.getSignedUrlPromise("getObject", params)
    console.log("URL firmada generada exitosamente")
    res.status(200).json({
      url,
      nombreArchivo: file.key,
    })
  } catch (error) {
    console.error("Error al generar URL firmada:", error)
    // En lugar de fallar, devolver éxito sin URL
    res.status(200).json({
      url: null,
      mensaje: "Foto recibida pero no se pudo procesar para S3",
    })
  }
})

// Obtener usuarios
app.get("/usuarios", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.curp, u.nombre, u.apellidos, u.direccion, u.fecha_nacimiento,
             u.fotografia, e.nivel AS escolaridad,
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
    res.json(result.rows)
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

    console.log("Datos recibidos:")
    console.log("- CURP:", curp)
    console.log("- Nombre:", nombre)
    console.log("- Apellido:", apellido)
    console.log("- Dirección:", direccion)
    console.log("- Fecha:", fechaNacimiento)
    console.log("- Escolaridad:", escolaridad)
    console.log("- Habilidades:", habilidades)
    console.log("- Foto URL:", fotoUrl || "Sin foto")

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
    console.log("Buscando escolaridad:", escolaridad)
    const escResult = await client.query(`SELECT id FROM escolaridades WHERE nivel = $1`, [escolaridad])

    if (escResult.rows.length === 0) {
      console.log("Escolaridad no encontrada")
      const disponibles = await client.query(`SELECT nivel FROM escolaridades ORDER BY nivel`)
      throw new Error(
        `Escolaridad '${escolaridad}' no válida. Disponibles: ${disponibles.rows.map((r) => r.nivel).join(", ")}`,
      )
    }

    const escolaridadId = escResult.rows[0].id
    console.log("Escolaridad encontrada con ID:", escolaridadId)

    // Verificar CURP duplicada
    const existeUsuario = await client.query(`SELECT id FROM usuarios WHERE curp = $1`, [curp.trim()])
    if (existeUsuario.rows.length > 0) {
      throw new Error("Ya existe un usuario con esta CURP")
    }

    // Insertar usuario
    console.log("Insertando usuario...")
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
        fotoUrl || null,
        lat || null,
        lng || null,
      ],
    )

    const nuevoUsuarioId = result.rows[0].id
    console.log("Usuario insertado con ID:", nuevoUsuarioId)

    // Insertar habilidades si existen
    if (Array.isArray(habilidades) && habilidades.length > 0) {
      console.log("Procesando habilidades:", habilidades)

      for (const habilidad of habilidades) {
        if (habilidad && habilidad.trim()) {
          // Insertar habilidad si no existe
          await client.query(`INSERT INTO habilidades (habilidad) VALUES ($1) ON CONFLICT (habilidad) DO NOTHING`, [
            habilidad.trim(),
          ])

          // Obtener ID de la habilidad
          const habilidadResult = await client.query(`SELECT id FROM habilidades WHERE habilidad = $1`, [
            habilidad.trim(),
          ])

          if (habilidadResult.rows.length > 0) {
            const habilidadId = habilidadResult.rows[0].id

            // Relacionar usuario con habilidad
            await client.query(
              `INSERT INTO usuario_habilidades (usuario_id, habilidad_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [nuevoUsuarioId, habilidadId],
            )
            console.log(`Habilidad "${habilidad}" asociada`)
          }
        }
      }
    }

    // Confirmar transacción
    await client.query("COMMIT")
    console.log("ransacción confirmada")

    console.log("USUARIO GUARDADO EXITOSAMENTE")
    console.log("=".repeat(50))

    res.status(201).json({
      mensaje: "Usuario registrado exitosamente",
      id: nuevoUsuarioId,
      usuario: result.rows[0],
    })
  } catch (error) {
    console.log("\nERROR:", error.message)

    if (client) {
      await client.query("ROLLBACK")
      console.log("Rollback ejecutado")
    }

    res.status(500).json({
      error: error.message || "Error interno del servidor",
    })
  } finally {
    if (client) {
      client.release()
      console.log("Conexión liberada")
    }
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
  console.log(`Servidor escuchando en http://localhost:${PORT}`)
  console.log(`Test de BD: http://localhost:${PORT}/test-db`)
})
